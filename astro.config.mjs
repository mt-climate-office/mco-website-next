// @ts-check
import { defineConfig } from 'astro/config';

// The production host. Canonical URLs point here whatever host a build is
// deployed to (DECISIONS D2). This file is the only place a host is written;
// scripts that need it (the newsletter renderer) import it from here.
export const CANONICAL_ORIGIN = 'https://climate.umt.edu';

// Where this build is deployed. The deploy workflow sets both from
// actions/configure-pages, so neither the staging host nor the project-pages
// base path is written into source (rebuild plan §2.1). A local build with
// neither set is a root build of the production host.
const site = process.env.SITE_ORIGIN || CANONICAL_ORIGIN;
const base = process.env.BASE_PATH || '/';

// Indexable only when a deploy says it is the production host itself. Staging,
// project pages and local builds all get noindex and a Disallow-all
// robots.txt, so the cutover (Phase 5) lifts them by moving the domain rather
// than by someone remembering to edit a flag.
const indexable = Boolean(process.env.SITE_ORIGIN) &&
  new URL(site).origin === CANONICAL_ORIGIN && base === '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Every stylesheet is a file, so the CSP needs no style hashes and no
    // 'unsafe-inline' (src/kit/csp.ts).
    inlineStylesheets: 'never',
  },
  vite: {
    // Astro inlines small bundled scripts as unhashed <script type="module">,
    // which the CSP blocks. Zero keeps every script a file under 'self'.
    build: { assetsInlineLimit: 0 },
    define: {
      'import.meta.env.MCO_CANONICAL_ORIGIN': JSON.stringify(CANONICAL_ORIGIN),
      'import.meta.env.MCO_INDEXABLE': JSON.stringify(indexable),
    },
  },
});
