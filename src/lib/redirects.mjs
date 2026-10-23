// The old site's URLs and where each now goes (src/data/redirects.json).
// Plain JavaScript on purpose: astro.config.mjs (the integration below), the
// stub route (src/pages/redirect-stubs/[id].astro) and
// scripts/check-redirects.mjs all import this one file.
//
// GitHub Pages cannot send a 301, so each status-301 entry becomes a small
// page at the old path: a 0-second meta refresh, a canonical at the target's
// production URL, noindex, and a visible link for anyone whose browser does
// not follow the refresh. Astro renders those pages through Base.astro at
// redirect-stubs/<id>/, so they carry the same head, CSP and chrome as every
// other page; after the build the integration moves each one to the exact
// old path, which Astro's router cannot express (spaces, '&', '.html').
//
// Status-410 entries get no page: GitHub Pages then answers with 404.html and
// a real 404 status, which tells crawlers to drop the URL. A "retired" page
// would answer 200, a soft 404. The 404 page carries the site header, so all
// six section hubs are one click away.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import data from '../data/redirects.json' with { type: 'json' };

/** @typedef {{ from: string, to: string | null, status: 200 | 301 | 410, reason: string, source: string, todo?: string }} Redirect */

/** @type {Redirect[]} */
export const REDIRECTS = data.redirects;

/** Hosts a redirect may leave the site for, besides those in src/lib/tools.ts. */
export const EXTERNAL_HOSTS = data.externalHosts;

/** Where the route renders stubs before they are moved. */
export const STUB_DIR = 'redirect-stubs';

export const isExternal = (to) => /^https?:\/\//.test(to);

/** A stable, filesystem-safe id for an entry. */
export const stubId = (from) => createHash('sha1').update(from).digest('hex').slice(0, 12);

/**
 * The file GitHub Pages serves for an old path, relative to the site root:
 * percent-decoded, `index.html` for a directory path. Pages decodes the
 * request path before it looks for the file, and serves `x.html` for `x`.
 */
export function fileFor(from) {
  const decoded = from.split('/').map((s) => decodeURIComponent(s)).join('/').replace(/^\//, '');
  return decoded === '' || decoded.endsWith('/') ? `${decoded}index.html` : decoded;
}

/** Entries that become a redirect page. */
export const stubs = () => REDIRECTS.filter((r) => r.status === 301);

/** Moves each rendered stub to its old path, then removes the stub tree. */
export function legacyRedirects() {
  return {
    name: 'mco-legacy-redirects',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const moved = [];
        for (const r of stubs()) {
          const src = join(root, STUB_DIR, stubId(r.from), 'index.html');
          const dest = join(root, fileFor(r.from));
          if (!existsSync(src)) throw new Error(`redirects: no stub rendered for ${r.from}`);
          if (existsSync(dest)) throw new Error(`redirects: ${r.from} is a real page on the new site; it cannot also redirect`);
          mkdirSync(dirname(dest), { recursive: true });
          renameSync(src, dest);
          moved.push(r.from);
        }
        const left = existsSync(join(root, STUB_DIR)) ? readdirSync(join(root, STUB_DIR)) : [];
        for (const id of left) {
          if (readdirSync(join(root, STUB_DIR, id)).length) throw new Error(`redirects: stray stub ${STUB_DIR}/${id}`);
        }
        rmSync(join(root, STUB_DIR), { recursive: true, force: true });
        logger.info(`${moved.length} redirect page(s) written at old paths`);
      },
    },
  };
}
