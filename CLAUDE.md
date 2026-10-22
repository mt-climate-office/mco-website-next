# mco-website-next

The Astro rebuild of `climate.umt.edu`. The rules in `../CLAUDE.md` and the
documents it ranks (`HOUSE-STYLE.md`, `docs/phase-0-report.md`,
`docs/DECISIONS.md`, `docs/VOICE.md`, the rebuild plan) apply here.

## House style
This app consumes mco-web-style (pinned + SRI in `src/kit/kit.ts`). Design
tokens, a11y mandates, and interaction conventions: see HOUSE-STYLE.md in
https://github.com/mt-climate-office/mco-web-style — tokens only (no raw
hexes), --accent is fill-only, aria-pressed drives toggle styling, canvas
data needs a live region + sr-only table twin. To change shared styling,
change the kit and bump the pinned version here; never patch a local copy.

## Rules specific to this repo

- **No host or base path in source.** Internal links and assets go through
  `url()` in `src/lib/paths.ts`. The production origin is named once, in
  `astro.config.mjs`. `npm run check:paths` enforces this.
- **Every script is a file.** The meta CSP (`src/kit/csp.ts`) hashes inline
  scripts, and the only one is the kit's anti-flash boot. Keep
  `assetsInlineLimit: 0` and `inlineStylesheets: 'never'`.
- **noindex is automatic.** Only a deploy whose Pages origin is the production
  host is indexable. Do not add a flag that overrides it.
- **Kit bump:** change `KIT_VERSION` and the hashes in `src/kit/kit.ts`,
  re-vendor `src/kit/anti-flash.inline.js` and `public/mco-logo.png` from the
  new tag, then `npm run check:kit`.
- **Pin exactly.** `.npmrc` sets `save-exact`; Actions are pinned to SHAs.

## Checks

```sh
npm run check:paths && npm run check:kit && npm run check
BASE_PATH=/verify-base/ npm run build
BASE_PATH=/verify-base/ npm run check:built && npm run check:html
KIT_DIR=<mco-web-style checkout at the pinned tag> BASE_PATH=/verify-base/ npm run verify
```
