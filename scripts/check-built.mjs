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
//   - every internal href/src sits under the base path
//
// Usage: node scripts/check-built.mjs [dist] — reads BASE_PATH like the build.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
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

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s !== 1) fail(`${h1s} <h1> elements`);

  for (const [, url] of html.matchAll(/\s(?:href|src)="(\/[^/"][^"]*|\/)"/g)) {
    if (!url.startsWith(base)) fail(`internal URL outside the base path ${base}: ${url}`);
  }
}

if (!count) failures.push(`no pages in ${dist}`);
if (failures.length) {
  console.error(`check-built: ${failures.length} problem(s)\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log(`check-built: ${count} page(s) ok (base ${base}, ${indexable ? 'indexable' : 'noindex'})`);
