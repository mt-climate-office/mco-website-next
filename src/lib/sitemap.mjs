// sitemap.xml for the production build (rebuild plan Phase 5, step 18).
// Plain JavaScript, like redirects.mjs: astro.config.mjs imports it.
//
// Written after the build from the built pages themselves, so it lists
// exactly what a crawler may index: every page without noindex, at its own
// canonical URL. Redirect pages, the 404 page and anything else marked
// noindex are left out without a second list to keep in step. Runs after
// legacyRedirects() (integration order), so redirect pages are already at
// their old paths, where they are skipped as noindex.
//
// Staging and every other non-production build get no sitemap at all
// (DECISIONS D2), and robots.txt names this file only when it exists.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Marks the file as this site's, so `check:redirects --live` can tell it from the old Jekyll sitemap. */
export const SITEMAP_MARKER = '<!-- mco-website-next -->';

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* htmlFiles(p);
    else if (name.endsWith('.html')) yield p;
  }
}

/** Canonical URLs of the indexable pages under `root`, sorted. */
export function indexableUrls(root, origin) {
  const urls = new Set();
  for (const file of htmlFiles(root)) {
    const html = readFileSync(file, 'utf8');
    if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
    const canonical = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    if (canonical?.startsWith(origin + '/')) urls.add(canonical);
  }
  return [...urls].sort();
}

/** @param {{ indexable: boolean, origin: string }} opts */
export function sitemap({ indexable, origin }) {
  return {
    name: 'mco-sitemap',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        if (!indexable) return;
        const root = fileURLToPath(dir);
        const urls = indexableUrls(root, origin);
        const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + SITEMAP_MARKER + '\n' +
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
          urls.map((u) => `  <url><loc>${u}</loc></url>\n`).join('') +
          '</urlset>\n';
        writeFileSync(join(root, 'sitemap.xml'), xml);
        logger.info(`sitemap.xml: ${urls.length} page(s)`);
      },
    },
  };
}
