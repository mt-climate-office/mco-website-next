#!/usr/bin/env node
// Gates on the built output, per page: things the kit's head.mjs does not
// cover for a multi-page Astro build.
//
//   - every inline <script> of any type is hashed in the page's CSP (head.mjs
//     only looks at classic scripts and the import map, and Astro can inline
//     a bundled module)
//   - noindex on every page unless the build is the production host; old-URL
//     redirect pages (src/lib/redirects.mjs) are noindex always, and their
//     refresh and canonical name the same target
//   - the canonical URL is on the production host (404.html: none, always noindex)
//   - exactly one <h1>
//   - no word glued to an inline link, time, code or emphasis: Astro drops a
//     line break that is the only space between text and a tag, so
//     "site on\n<time>" ships as "site on<time>". Write {' '} at the line end.
//   - every internal href/src sits under the base path
//   - robots.txt and sitemap.xml agree with the mode: a production build
//     allows crawling, names the sitemap, and the sitemap lists exactly the
//     indexable pages' canonicals; any other build disallows everything and
//     has no sitemap
//
// Usage: node scripts/check-built.mjs [dist] — reads BASE_PATH like the build.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = process.argv[2] || 'dist';
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');
const CANONICAL = 'https://climate.umt.edu/';
const indexable = process.env.EXPECT_INDEXABLE === '1';

function* pages(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* pages(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const failures = [];
let count = 0;
const indexableCanonicals = new Set();
for (const file of pages(dist)) {
  count++;
  const rel = relative(dist, file);
  const html = readFileSync(file, 'utf8');
  const fail = (msg) => failures.push(`${rel}: ${msg}`);

  const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1] ?? '';
  if (!csp.includes("default-src 'none'")) fail("no meta CSP with default-src 'none'");
  for (const [, attrs, body] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=/.test(attrs || '')) continue;
    const h = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
    if (!csp.includes(h)) fail(`inline script not hashed in CSP: ${body.trim().slice(0, 60)}`);
  }

  const notFound = rel === '404.html';
  const refresh = html.match(/<meta http-equiv="refresh" content="0; url=([^"]*)">/)?.[1];
  const noindex = /<meta name="robots" content="noindex, nofollow">/.test(html);
  if (indexable && noindex && !notFound && !refresh) fail('noindex on a production build');
  if ((!indexable || notFound || refresh) && !noindex) fail('missing noindex');

  const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (notFound && canonical) fail(`a not-found page has a canonical: ${canonical}`);
  if (refresh) {
    // Internal target: under the base path, canonical at its production URL
    // (no fragment). External target: refresh and canonical are one URL.
    const external = /^https?:/.test(refresh);
    if (!external && !refresh.startsWith(base)) fail(`redirect outside the base path ${base}: ${refresh}`);
    const target = external ? refresh : new URL(refresh.slice(base.length).split('#')[0], CANONICAL).href;
    if (canonical !== target) fail(`redirect canonical ${canonical} is not its target ${target}`);
  } else if (!notFound && !canonical?.startsWith(CANONICAL)) {
    fail(`canonical not on the production host: ${canonical}`);
  }
  if (!noindex && canonical) indexableCanonicals.add(canonical);

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${h1s} <h1> elements`);

  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/g, '');
  const glued = [
    ...text.matchAll(/[A-Za-z,.;:'’](?=<(?:a|time|code|strong|em|abbr)[\s>])/g),
    ...text.matchAll(/<\/(?:a|time|code|strong|em|abbr)>(?=[A-Za-z])/g),
  ];
  for (const m of glued) fail(`no space around an inline tag: …${text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')}…`);

  for (const [, url] of html.matchAll(/\s(?:href|src)="(\/[^/"][^"]*|\/)"/g)) {
    if (!url.startsWith(base)) fail(`internal URL outside the base path ${base}: ${url}`);
  }
}

if (!count) failures.push(`no pages in ${dist}`);

// robots.txt and sitemap.xml (src/pages/robots.txt.ts, src/lib/sitemap.mjs).
const robots = existsSync(join(dist, 'robots.txt')) ? readFileSync(join(dist, 'robots.txt'), 'utf8') : null;
const sitemapFile = join(dist, 'sitemap.xml');
if (robots === null) failures.push('robots.txt: missing');
if (indexable) {
  const sitemapUrl = new URL('sitemap.xml', CANONICAL).href;
  if (robots !== null && (!/^Allow: \/$/m.test(robots) || /^Disallow: \/$/m.test(robots))) failures.push('robots.txt: a production build must allow crawling');
  if (robots !== null && !robots.split('\n').includes(`Sitemap: ${sitemapUrl}`)) failures.push(`robots.txt: does not name ${sitemapUrl}`);
  if (!existsSync(sitemapFile)) failures.push('sitemap.xml: missing on a production build');
  else {
    const locs = new Set([...readFileSync(sitemapFile, 'utf8').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]));
    for (const u of indexableCanonicals) if (!locs.has(u)) failures.push(`sitemap.xml: indexable page missing: ${u}`);
    for (const u of locs) if (!indexableCanonicals.has(u)) failures.push(`sitemap.xml: lists a URL that is not an indexable page: ${u}`);
  }
} else {
  if (robots !== null && !/^Disallow: \/$/m.test(robots)) failures.push('robots.txt: a non-production build must disallow everything');
  if (existsSync(sitemapFile)) failures.push('sitemap.xml: present on a non-production build (DECISIONS D2)');
}
if (failures.length) {
  console.error(`check-built: ${failures.length} problem(s)\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log(`check-built: ${count} page(s) ok (base ${base}, ${indexable ? `indexable, sitemap ${indexableCanonicals.size} URL(s)` : 'noindex, no sitemap'})`);
