# mco-website-next

Astro rebuild of `climate.umt.edu`. Static, GitHub Pages.

Plan: @docs/mco-website-rebuild-plan.md
Decisions (settled, do not reopen): @docs/DECISIONS.md
Phase 0 facts: @docs/phase-0-report.md
Voice, binding on all copy: @docs/VOICE.md
Chosen design: `docs/design/homepage-reference.html`
CMS codegen reference: `docs/examples/cms-codegen/`

## House style
This app consumes mco-web-style (pinned + SRI in `src/kit/kit.ts`). Design
tokens, a11y mandates, and interaction conventions: see HOUSE-STYLE.md in
https://github.com/mt-climate-office/mco-web-style — tokens only (no raw
hexes), --accent is fill-only, aria-pressed drives toggle styling, canvas
data needs a live region + sr-only table twin. To change shared styling,
change the kit and bump the pinned version here; never patch a local copy.

## Hosting

- **Staging: `next.climate.umt.edu`** — own Pages site, `noindex`
  throughout, **retired at launch, not redirected**. Staging links are
  disposable; never put one in a report, email or deck. The custom domain is
  set in the repo's Pages settings, not by a `CNAME` file: a site deployed
  from Actions ignores one.
- **Launch: `climate.umt.edu`.**
- `base` stays `/`. The project-pages fallback
  (`mt-climate-office.github.io/mco-website-next/`) is not in use now that the
  DNS record exists. If it ever is, it needs `base: '/mco-website-next'`, and
  the deploy already sets that from `actions/configure-pages`.
- **Never write a host or base path into source.** CI greps for literal
  `next.climate.umt.edu` and `/mco-website-next/` outside the config.

## Design system (D1)

**Pinned jsDelivr tag + SRI + `crossorigin`, v0.13.1.** Favicons and
`og-card.png` hot-linked from the pinned tag. Do not vendor, do not add a
`package.json` to the kit, **do not self-host the fonts** — the kit uses
`font-display: block` plus preload deliberately.

Use `snippets/head.html`, `snippets/anti-flash.html`, `snippets/skip-link.html`.

- **Skip link targets `#main`**, not `#main-content`. `<main id="main"
  tabindex="-1">`.
- **Text, borders and icons on dark use `--accent-line`.** `--accent` is
  fill-only. Same hex; the token name is the contract.
- **Brand tokens are chrome only.** Anything with a legend uses `MCO.palette`,
  or USDM ramps with D/W category names. **Spectral is banned.**
- Page titles: `<Short> · MCO` in the tab and `<Short> · Montana Climate
  Office` in cards, rendered at build time by `src/layouts/Base.astro`, so
  crawlers and link previews see them. `MCO.setPageTitle` /
  `MCO.setSocialMeta` are for state that changes on the client, such as a
  selected station.
- Theme contract: three themes, URL param → `localStorage` → OS preference,
  anti-flash before first paint, `MCO.initThemeToggle({ cycle: true })`.
- **Navbar exception** (owner, 22 Oct 2026; kit PR #60): no "A service of…"
  subtitle, and the badge links to this site's home.

## Data

API `https://mesonet2.climate.umt.edu/api/v2`, CORS open, **30 s gateway
timeout**. Generate types from `/api/openapi.json`.

- `datetime` and `date_installed` are **epoch milliseconds**.
- Element keys are display strings with units: `"Air Temperature @ 2 m [°F]"`.
- `/stations/status/` is the **AirTable build registry**, not health.
- Health, reporting % and compliance come from the `mesonet-compliance`
  summary JSON on data2 (D5). Do not compute them here.
- Photo times come from `data2.climate.umt.edu` `photos/schedule/schedule.json`
  and the monthly manifests (D6), not the API.
- Public photo directions are **N/S/E/W**, default North, most recent capture,
  **clamped to dates on or after 2026-10-21** (D7). Snow/Pluvio/Solar stay
  staff-only (D8).
- Station and camera counts come from data, never prose.

**Fetch, don't frame.** No iframes for primary content. Every data island
renders a build-time snapshot as fallback — stale data with a timestamp, never
an error string. **Never let an embedded map capture page scroll.**

## Content (D13, D14)

Phase 4; none of this exists in the repo yet.

Collections in `src/content/`, Zod schema in `src/content.config.ts`.
One field definition in `src/content/_fields.ts` emits both the Zod schema and
the CMS config. **`.pages.yml` is generated — never hand-edited.**
`npm run gen:cms`; CI runs `check:cms`.

`settings.content.merge: true` in `.pages.yml` is a **data-loss guard — do not
remove.** Without it a save deletes every field the config does not list.

CMS is **Pages CMS, hosted** at `app.pagescms.org`. The GitHub App install is
scoped to this repo only.

**Content versus data:** prose a person wrote goes in collections. Anything
the API knows — counts, percentages, schedules — must not be typeable in the
CMS. Use a component, not a number in Markdown.

Read `docs/newsletter.md` before finalising the news schema; it lists the
fields the newsletter workflow needs (`summary`, `draft`, `email`, ...) and
the `/news/<slug>/` URL helper in `src/lib/news.ts` the route must use.

## Accessibility — WCAG 2.1 AA, UM policy

One `<h1>`, no skipped levels. Real landmarks and a footer (none of the map
tools has one; this site should). Every image has `alt`; every icon-only
control has `aria-label`; every input has a real `<label>`. Visible focus at
3:1. Tables get `<caption>` and `scope`. Colour never the sole carrier of
meaning. `prefers-reduced-motion` respected. `axe-core` runs in CI and
regressions fail the build.

## Performance

No unpinned dependencies. No library on a page that does not use it. Homepage
JS under 150 KB gzipped excluding the lazy map island. Lighthouse ≥ 90 mobile.
Fonts come from the pinned kit tag.

## Structure

```
astro.config.mjs        site/base from env; the only place a host is written
src/kit/                kit pin + SRI (kit.ts), meta CSP (csp.ts), vendored
                        anti-flash body (anti-flash.inline.js)
src/layouts/Base.astro  document shell: head per snippets/head.html, skip link,
                        header, <main id="main">, footer, kit core script
src/components/layout/  Header (kit navbar + compact drawer), Footer
src/lib/                paths.ts (url(), canonicalUrl()), nav.ts (sections),
                        mesonet.ts (API client) + mesonet.openapi.d.ts
                        (generated: npm run gen:api, manual, never in CI)
src/scripts/chrome.ts   theme toggle, drawer, MCO.ready()
src/scripts/search.ts   /search/ on Pagefind's JS API (loaded on first query)
src/styles/site.css     site layer over the kit; tokens only
src/pages/              routes, robots.txt endpoint, 404
public/mco-logo.png     navbar badge, vendored from the kit tag
scripts/                CI checks (paths, kit, built, verify, lighthouse),
                        gen-api.mjs
verify.config.mjs       scenarios + probes for the kit's verify harness
.github/workflows/site.yml  verify on every PR/push; deploy on main
```

## Dependencies

Node is pinned in `.nvmrc`. `.npmrc` sets `save-exact`; every package is an
exact version, and every Action is pinned to a commit SHA with its tag in a
comment. Runtime dependencies: `astro`, and `mesonet-compliance` (the D5
ruleset, from its git tag; `package-lock.json` records the commit, and Vite
bundles it into `/mesonet/status/`'s script). Types for the parts the site
calls are in `src/types/mesonet-compliance.d.ts`; re-check them on a bump.
Everything else is a devDependency for
checks: `@astrojs/check`, `typescript`, `@types/node`, `html-validate`,
`playwright`, `@axe-core/playwright`, `lighthouse`, `chrome-launcher`, and
`openapi-typescript` for `gen:api`. Its peer range stops at TypeScript 5, so
`overrides` in `package.json` points it at ours, as the dashboard does.
`pagefind` builds the site-search index into `dist/pagefind/` as the second
half of `npm run build`. It indexes only `<main data-pagefind-body>`, which
`Base.astro` sets unless a page passes `searchable={false}` (404, search).
`mjml`, `marked`, `cheerio` and `yaml` are for the newsletter renderer
(`scripts/newsletter/`, D15).

## Build rules

- Internal links and assets go through `url()` in `src/lib/paths.ts`.
  `check:paths` also fails on the project-pages host, the production apex
  outside `astro.config.mjs`, and root-relative `href`/`src`.
- **Every script is a file.** The meta CSP (`src/kit/csp.ts`) hashes inline
  scripts, and the only one is the kit's anti-flash boot. Keep
  `assetsInlineLimit: 0` and `inlineStylesheets: 'never'`. The CSP is written
  by hand because the kit's `head.mjs` matches only the
  `Content-Security-Policy` spelling, and Astro's built-in CSP emits it
  lowercase.
- **noindex is automatic.** Only a deploy whose Pages origin is the production
  host is indexable. At cutover, set `EXPECT_INDEXABLE: '1'` in the deploy
  job in the same change that moves the domain.
- **Kit bump:** change `KIT_VERSION` and the hashes in `src/kit/kit.ts`,
  re-vendor `src/kit/anti-flash.inline.js` and `public/mco-logo.png` from the
  new tag, then `npm run check:kit`.

## Checks

```sh
npm ci
npm run dev
npm run check:paths && npm run check:kit && npm run check
BASE_PATH=/verify-base/ npm run build
BASE_PATH=/verify-base/ npm run check:built && npm run check:html
KIT_DIR=<mco-web-style checkout at the pinned tag> BASE_PATH=/verify-base/ npm run verify
BASE_PATH=/verify-base/ npm run lighthouse
```
