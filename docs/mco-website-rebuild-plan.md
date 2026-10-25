# climate.umt.edu — rebuild brief

**For:** Claude Code, working in `~/git/mt-climate-office`
**Owner:** R. Kyle Bocinsky, Montana Climate Office
**Written:** 21 October 2026
**Revised:** 22 October 2026, after Phase 0
**Status, 25 October 2026:** Phases 1 to 4 built, and Phase 5's
preparation done: the redirect map passes `--strict`, the cutover runbook
is `docs/cutover-checklist.md`, and its two cutover PRs are open as drafts.
What ships at launch from §4.2 is in `DECISIONS.md` D24. Launch waits on the
owner's pre-launch items (checklist P1, P3, P4, P6, P7, P9).

## Read these first, in this order

1. `mco-web-style/HOUSE-STYLE.md` — the office's engineering convention
   document. **It outranks this brief everywhere they disagree.**
2. `docs/phase-0-report.md` — the facts, read from the code on 22 Oct 2026.
3. `docs/DECISIONS.md` — twelve decisions settled by the owner, same day.
4. `docs/VOICE.md` — binding on all copy.
5. This brief, for structure, sequencing and rationale.

**Part 1 of this brief is superseded.** It was assembled from outside the
repos by inspecting live sites on a single day, and Phase 0 found it wrong in
roughly twenty places. Two figures in it were misread from screenshots
(HydroMet 165 as 185; UMRB 167 as 187), so treat every screenshot-derived
number as unverified. Where Part 1 and the Phase 0 report disagree, the
report wins. It is retained only as a record of what the project believed
before it read the code.

**Part 4 was recommendations.** The parts of it that have since been decided
are marked, and `DECISIONS.md` is authoritative for those.

---

## Part 0 — What this project is

Rebuild the Montana Climate Office's public website as a static Astro site on
GitHub Pages, consuming the existing `mco-web-style` design system so the
marketing site and the Mesonet tools read as one product.

The office already owns six modern, well-built web tools. They are unlinked
from the main site, which is a 2016-era Jekyll/Minimal Mistakes theme. **The
core problem is packaging, not design.** The rebuild's job is to put the tools
in front of people and to make the office's data stewardship legible.

### Success criteria

1. A first-time visitor sees live Montana conditions above the fold.
2. Every one of the six tools is reachable in one click from the homepage.
3. Staff can publish news and edit page copy without touching Git directly.
4. WCAG 2.1 AA throughout — this is University of Montana policy, not optional.
5. No iframes carrying primary content.

---

## Part 1 — Verified facts

### 1.1 The design system already exists

All four Mesonet tools load a shared design system from jsDelivr:

```
https://cdn.jsdelivr.net/gh/mt-climate-office/mco-web-style@<version>/
```

Files referenced by the tools:

| Path | Purpose |
|---|---|
| `theme/mco-theme.css` | All design tokens, three themes |
| `core/mco-core.js` | Shared UI behaviour |
| `map/mco-map.js` | MapLibre wrapper |
| `fonts/outfit-latin.woff2` | UI and display typeface |
| `fonts/space-mono-latin.woff2` | Monospace, used for timestamps and data labels |
| `assets/favicon-16.png`, `favicon-32.png`, `apple-touch-icon.png` | Favicons |
| `assets/icon-192.png`, `icon-512.png` | PWA icons |
| `assets/og-card.png` | Shared social preview card |

**Version drift exists.** As of 21 Oct 2026: `/explorer/`, `/photos/`,
`/dash/next/` and `snow.climate.umt.edu` pin `0.11.3`; `/umrb/` pins `0.12.0`.
That is five consumers already, split across two versions. Pick a policy before
the website becomes the sixth. `d3drought.org` does not use the system at all
(§1.4.1).

Source of truth is presumably a repo under `mt-climate-office`. Find it before
writing any CSS — **do not re-derive these tokens from the values below if the
source repo is available.** The values below are a snapshot for reference and
for the mockups only.

### 1.2 Design tokens (snapshot, read from the live stylesheet)

`mco-theme.css` defines 78 custom properties on `:root`. Three themes:
default (dark), `[data-theme="light"]`, `[data-theme="high-contrast"]`.

**Typography and scale (theme-independent)**

```
--font-ui, --font-display-num : 'Outfit', system-ui, -apple-system, sans-serif
--font-mono                   : 'Space Mono', ui-monospace, monospace

--fs-2xs 0.55rem   --fs-xs 0.65rem   --fs-sm 0.75rem   --fs-md 0.8125rem
--fs-base 0.875rem --fs-lg 1.0625rem --fs-xl 1.375rem  --fs-2xl 2rem

--fw-regular 400  --fw-medium 500  --fw-semibold 600  --fw-bold 700
--lh-body 1.6     --lh-tight 1.2

--space-1 0.25rem  --space-2 0.4rem  --space-3 0.5rem  --space-4 0.75rem
--space-5 1rem     --space-6 1.5rem  --space-7 2rem

--radius-sm 4px  --radius-md 8px  --radius-lg 12px
--transition 0.2s cubic-bezier(0.4,0,0.2,1)
--chrome-h 54px  --sidebar-w 272px
--brand-gradient linear-gradient(90deg,#114f80,#1a6faf,#5aaee8,#1a6faf)
```

Note the type scale is tuned for dense instrument UI — `--fs-base` is 14px.
A long-form content site needs a larger reading size. See §4.4.

**Colour, by theme**

| Token | Dark (default) | Light | High contrast |
|---|---|---|---|
| `--accent` | `#1a6faf` | `#1a6faf` | `#5bb4ff` |
| `--accent-dk` | `#114f80` | `#0d4f7a` | `#2070a8` |
| `--accent-light` / `--accent-line` | `#5aaee8` | `#1563a0` | `#93d0ff` |
| `--bg-deep` | `#161b22` | `#f0f2f5` | `#000000` |
| `--bg-surface` | `#1e2530` | `#ffffff` | `#000000` |
| `--bg-raised` | `#2c3545` | `#e8ecf0` | `#121212` |
| `--input-bg` | `#232a35` | `#f4f5f7` | `#121212` |
| `--border` | `#3a4558` | `#c8cdd5` | `#8a8a8a` |
| `--ctrl-border` | `#6a7996` | `#7e8694` | `#8a8a8a` |
| `--text-primary` | `#e8ecf0` | `#1a1a2e` | `#ffffff` |
| `--text-secondary` | `#c0cad6` | `#3a3f4b` | `#f5f5f5` |
| `--text-muted` | `#8a99b0` | `#5a6070` | `#dcdcdc` |
| `--text-dim` | `#8494ab` | `#5f6675` | `#bcbcbc` |
| `--success` | `#36ba6d` | `#217343` | `#26b562` |
| `--warning` | `#df9412` | `#8a5b0b` | `#dc8d06` |
| `--danger` | `#ed8780` | `#c2271c` | `#f47a71` |
| `--dot-stroke` | `#ffffff` | `#2a2a3a` | `#ffffff` |
| `--glass` | `rgba(30,37,48,0.92)` | `rgba(255,255,255,0.94)` | `rgba(0,0,0,0.96)` |
| `--shadow` | `0 4px 24px rgba(0,0,0,0.4)` | `0 4px 24px rgba(0,0,0,0.1)` | `0 4px 24px rgba(0,0,0,0.7)` |

**Contrast caution.** `--accent` `#1a6faf` on the dark ground `#161b22` is
about **3.25:1** — fine for large text and UI borders, **fails AA for body
text**. On dark, link and inline-accent text must use `--accent-light`
`#5aaee8` (about 7.1:1). On white, `--accent` is about 5.3:1 and passes.

### 1.3 The API

Current API: **`https://mesonet2.climate.umt.edu/api/v2`**

- OpenAPI spec: `/api/openapi.json` (also `/api/v2/openapi.json`)
- Swagger UI: `/api/docs`
- Title: "Montana Mesonet API (v2)" — 22 paths
- **CORS is open.** Verified by cross-origin `fetch` from `climate.umt.edu`:
  both `mesonet2.climate.umt.edu` and `mesonet.climate.umt.edu` returned 200
  with no CORS error. A static site on GitHub Pages can call it directly from
  the browser. No proxy needed.

**Paths**

```
/latest/              /observations/        /observations/charge/{station}/
/derived/             /derived/hourly/      /derived/daily/
/derived/ppt/         /derived/change/
/stations/            /stations/status/
/elements/            /elements/{station}/  /config/{station}/
/photos/              /photos/{station}/    /photos/{station}/{direction}/
/qaqc/                /ghcn/
```

**`/stations/?type=json`** → 253 objects:

```json
{
  "station": "aceabsar", "name": "Absarokee", "sub_network": "HydroMet",
  "latitude": 45.56, "longitude": -109.61, "elevation": 1400.4,
  "county": "Stillwater", "date_installed": 1622592000000,
  "mesowest_id": null, "gwic_id": null, "nwsli_id": "KEEM8", "funded": true
}
```

**`/latest/?type=json&wide=true&elements=air_temp,ppt&units=us`** → 253 objects:

```json
{
  "station": "aceabsar", "datetime": 1792641300000,
  "Air Temperature @ 2 m [°F]": 51.386,
  "Air Temperature @ 8 ft [°F]": null,
  "Precipitation [in]": 0, "provisional": true
}
```

Note: `datetime` and `date_installed` are epoch milliseconds. Element column
names are human-readable strings including units — plan for that in typing.

Useful shared params on the observation endpoints: `stations`, `elements`,
`units`, `tz`, `wide`, `rm_na`, `active`, `public`, `type`, `simple_datetime`,
`start_time` / `end_time` / `dates`.

### 1.4 The existing tools

**On `mesonet.climate.umt.edu`** — all built on `mco-web-style`:

| Tool | URL | What it is |
|---|---|---|
| Explorer | `/explorer/` | Live map of all stations, variable picker, Latest/Hourly/Daily, radar overlay |
| Photos | `/photos/` | Hourly camera imagery tiled geographically across the state |
| Dashboard | `/dash/next/` | Per-station view: plain-language summary, observed + NWS forecast, normals, wind rose, soil moisture, VPD. Installable PWA |
| UMRB build | `/umrb/` | Build-out status by ACE grid cell |
| Status | `/status/` | Reporting status and station health, three modes |
| Maintenance | `/maintenance/` | Maintenance-visit compliance, three modes |

**Elsewhere:**

| Tool | URL | What it is | Design system |
|---|---|---|---|
| Snowpack Explorer | `snow.climate.umt.edu` | Daily SWE percentiles across CONUS from NOAA SNODAS. Gridded (~1 km) and Zonal (HUC 2/4/6/8) views; ZIG and ECDF percentile methods; USDM colour convention | `mco-web-style@0.11.3` |
| D³ Drought Data Dashboard | `d3drought.org` | CONUS-wide drought viewer. Marked **BETA** | **None** — see §1.4.1 |

All six Mesonet tools plus the Snowpack Explorer have canonical links, OG cards,
a single `h1`, `main` and `header` landmarks, and none are `noindex` — they are
already public, just unlinked.

#### 1.4.1 D³ is outside the system

D³ is a different build: OpenLayers (`ol.js`) plus `geotiff.js`, not MapLibre,
and it does not load `mco-web-style`. It has its own red/black D³ identity and
carries the MCO logo in the corner. Measured 21 Oct 2026:

- **No `<h1>`, no `<main>`, no `<header>`, no `<footer>`** — only a `<nav>`
- **No canonical link, no OG image**
- Its "Basemap & theme" control (Light / Dark / Voyager / Satellite / NatGeo)
  is a *basemap* selector, unrelated to the `mco-web-style` theme contract in
  §3.1, so a visitor's theme choice does not carry across

This is a decision point, not a defect to fix in passing. D³ is national
infrastructure with its own partner identity (NGP RIDR, NIDIS, DNRC shown in
the panel). Options: leave it standalone and link out; bring it onto
`mco-web-style` so it reads as MCO's; or keep its identity but adopt the
shared theme contract and fix the landmark and metadata gaps. The accessibility
gaps should be closed regardless of which is chosen — see §5.

**D³ data layers** (from its own layer picker): SPI, SPEI, EDDI, SVPDI;
Precipitation as percentile, percent of normal, departure and accumulation;
Maximum temperature as percentile and departure; VPD as percentile, percent of
normal and departure; SWE SNODAS standardized anomaly; VHI (NOAA STAR). Plus
GHCNd station data, a convergence-of-evidence composite, USDM overlay, tribal
boundaries, and HUC2–HUC10 aggregation.

#### 1.4.2 The HHP viewers are D³ layers, not separate sites

`hhp.climate.umt.edu` does not resolve. The Headwaters Hydrology products are
**layers inside D³**:

- `HHP Soil Moisture — SMI (Soil Moisture Index)` — labelled **IN REVIEW**
- `HHP Streamflow (Modelled Percentiles)` — labelled **IN REVIEW**

Both carry an IN REVIEW marker in the live UI. Decide before launch whether
the website promotes them as finished products, labels them as provisional in
the same words the tool uses, or holds them back until the review closes.
Promoting a product the tool itself marks as in review would undercut the
trust layer in §4.3.

#### 1.4.3 The photo pipeline is mid-change — do not hard-code it

- `/api/v2/photos/` lists **152 stations with cameras**, each with a
  `Photo Directions` array and a `Photo Start Date`. The current site says
  "over 120", which is stale.
- Direction vocabulary **differs between the API and the Explorer UI**. The API
  returns `E (East)`, `N (North)`, `S (South)`, `W (West)`,
  `SNOW (Snow Platform)`. The Explorer offers North, South, East, West,
  North Sky, South Sky. Reconcile these before building anything that labels a
  direction.
- **The Explorer's time picker offers only 9:00 AM and 3:00 PM** (verified in
  the live DOM, 21 Oct 2026). The owner reports captures now run **three times
  a day**, moving to hourly. So the Explorer's picker is behind the pipeline.
  Passing an unlisted hour in the URL silently snaps back to 3:00 PM.
- **There is no endpoint that enumerates available capture times.**
  `/photos/{station}/` and `/photos/{station}/{direction}/` return an image,
  not a list. The website needs one — otherwise it cannot populate a time
  control from data and will end up hard-coding a schedule that is about to
  change again.

Consequence for copy and UI: **never state the capture schedule in prose.**
Write "through the day" and let the control show the actual times, sourced from
data. A homepage that says "9am and 3pm" is wrong the week hourly ships.

#### 1.4.4 Publications already exist, badly

`climate.umt.edu/research/` already carries a hand-maintained publications
list — roughly 16,000 characters, with "Highlighted publications" (IrrMapper,
Drought Timescales) and a "Recent publications" run. Problems:

- Every entry's anchor renders as **"Permalink"** or **"Read Article"** —
  non-descriptive link text repeated a dozen times on one page, a WCAG 2.4.4
  failure and miserable with a screen reader
- The list is hand-maintained in Markdown, so it will rot
- The page hero is a **stock Unsplash photo**, on the research page of an
  office that operates 120+ cameras

**All carry URL state**, so the new site can deep-link into any view:
`/dash/next/?s=lololowr`, `/photos/?date=2026-10-21&time=15`,
`/status/?mode=health`, `/umrb/?cell=<id>`, `/umrb/?station=<id>`.

**Both `/status/` and `/maintenance/` ship a complete `sr-only` `<table>` of
all 253 stations.** Status columns: Station, Network, Status, Last report,
Health, Sensors not reporting, County. Maintenance columns: Station, ID,
Sub-network, Status, Last visit. These are a ready-made public data table —
surface them visibly with sort, filter and CSV export.

### 1.5 Current network figures (21 Oct 2026, 21:35 MT)

- **253 stations** — 165 HydroMet, 88 AgriMet, 10 co-located sites
- Reporting within 2 h: **251 (99%)**; stale ≥2 h: 2; no record: 0
- Health: operational **220 (87%)**; partial sensor outage **31 (12%)**; total outage **2 (1%)**
- Maintenance: visited this year **127**; **overdue 0**; new-this-year exempt 38; AgriMet as-needed 88
- UMRB cells: operational **187**; pending 2027 **37**; available 1

Do not hard-code these, and note the figures above are the superseded Part 1
values — the Phase 0 report has the correct ones. `/stations/status/` is the
**AirTable build registry**, not network health: reporting percentage and the
health split are computed from `/latest` and `/elements`. Per `DECISIONS.md`
D5 the ruleset lives in `mesonet-compliance`, which publishes a summary JSON
to data2 for headline figures.

### 1.6 What is wrong with the current site

Measured on `climate.umt.edu`, 21 Oct 2026:

- **Five `<h1>` elements** on the homepage
- **No `<main>` and no `<header>` landmark** — the skip link has nothing to skip to
- **Three iframes, none with a `title`** (WCAG 4.1.2 failure); all eager-loaded
- One iframe failed on first load: *"mesonet.climate.umt.edu unexpectedly closed
  the connection."* All three URLs return 200 on direct fetch, so it is
  intermittent — but the homepage's primary content depends on it
- FontAwesome loaded from jsDelivr at **`@latest`** — unpinned
- **MathJax 2.7.6** loaded on a page with no math
- Lunr search index built client-side on every page load
- At 420px, the greedy nav hides **7 of 8** top-level links; only "Mesonet" is visible
- Embedded maps **capture page scroll** on mobile — a dead end mid-page
- Homepage drought screenshot is dated **01-23-2024**
- News archive mixes public updates with internal dev notes ("Backing up a
  Dockerized Community Edition Neo4j Database", "How to Set Up UTM and ArcGIS
  on a Mac", "Configuring an EnviroCams PTZ Camera")
- Footer has no contact details, no address, no newsletter signup, no
  accessibility statement, no UM lockup
- A separate `umt.edu/climate` page exists and competes for the same searches
- Typo on the Climate Services page: "distiribute"

---

## Part 2 — Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | **Astro** | Static HTML by default, islands for the live pieces. Note: Sustainable FSA is Jekyll + Tailwind, not Astro — there is no Astro precedent in the org. Astro is still the right choice, but it is a new stack here |
| Hosting | **GitHub Pages** | Already in use; required by the owner |
| Build | **GitHub Actions** | Pages builds Jekyll natively but not Astro |
| CMS | **Pages CMS** | Already proven on NGP-RIDR; edits land as Git commits; no server |
| Content | Astro content collections (Markdown + frontmatter) | Typed, validated at build |
| Maps | **MapLibre GL** | What `mco-map.js` already wraps; not Leaflet |
| Search | **Pagefind** | Static index built at deploy; replaces Lunr |
| Styling | `mco-web-style` tokens | See §3 |
| Analytics | Keep GA4 or replace | Owner's call; see §5 |

### 2.1 Working directory and deployment target

- **Repo: `mt-climate-office/mco-website-next`.** New, not a fork of the
  existing Jekyll repo. Its own GitHub Pages site and its own deploy workflow.
- **Working directory: `~/git/mt-climate-office/mco-website-next`**, cloned
  alongside the other tool repos under `~/git/mt-climate-office`. (An earlier
  instruction named `mco-website`; the directory now matches the repo. Confirm
  if the shorter name is wanted instead.)

**The repo name outlives the staging phase.** `next.climate.umt.edu` is
retired at launch, but `mco-website-next` keeps serving `climate.umt.edu`
afterwards. Two options, decide before launch rather than after: rename the
repo to `mco-website` at cutover — GitHub redirects the old remote, but every
local clone, workflow reference and deploy key needs checking — or accept that
the repo carries a staging-era name permanently. Neither is wrong; drifting
into the second by default is.
- **Staging host: `next.climate.umt.edu`**, its own GitHub Pages site. The
  custom domain is set in the repo's Pages settings, not by a `CNAME` file:
  a site deployed from Actions ignores one. Unlinked and `noindex` throughout development. **Retired at
  launch** — it is not redirected and does not survive cutover.
- **Launch host: `climate.umt.edu`.**

This follows the office's existing convention (`mesonet.climate.umt.edu`,
`snow.climate.umt.edu`) and avoids a base path entirely.

As built: the deploy job reads the origin and base path from
`actions/configure-pages` (`SITE_ORIGIN`, `BASE_PATH`), so the same source
builds for the project-pages URL, the staging host and the launch host. The
production origin is written once, in `astro.config.mjs`, for canonicals.

**Why not `climate.umt.edu/next/`.** A subpath would have meant `base:
'/next'` for the life of the project, so every link, asset and fetch resolved
through `BASE_URL` and every one of them changed at cutover. It would also have
hit two GitHub Pages constraints: a `CNAME` attaches to exactly one repo, so
`mco-website` could not serve a subpath of a domain the Jekyll repo owns; and
Jekyll drops underscore-prefixed paths, so Astro's default `_astro/` asset
directory would have been stripped from the published output. The subdomain
removes all of it. Build the site exactly as it will ship.

**Because the subdomain is retired rather than redirected**, nothing shared
during development keeps working after launch. Two consequences:

- Treat every `next.climate.umt.edu` link as disposable. Do not put one in a
  grant report, a paper, a partner email or a slide deck. If something needs
  to be shown to an outside party at a fixed URL, that is a reason to launch
  the page, not to share a staging link.
- At cutover, check for inbound links to the subdomain before pulling the DNS
  record — search the org's repos, the Mesonet tools' footers, and any
  published material. Anything found needs a real destination first.

**Development is internal.** The GitHub Pages site is public to anyone holding
the URL, so "internal" is a convention, not a control. If it needs to be a
control, the options are an authenticating proxy in front of the origin, or
moving staging off Pages — decide in Phase 0 if that matters, and say so
plainly rather than assuming obscurity is protection.

**Keep staging out of search results, and remember to undo it.** Unlinked is
not unindexed.

- `<meta name="robots" content="noindex, nofollow">` on every page, emitted
  conditionally from the build environment, never hand-written per page
- `robots.txt` on the staging host with `Disallow: /`
- Do not submit a sitemap for the staging host
- No canonical tags pointing at `next.climate.umt.edu`; if canonicals are
  emitted during staging, point them at the eventual `climate.umt.edu` URL
- **Removing all of the above is a Phase 5 checklist item.** A launch that
  ships with `noindex` still set is the single most common way this goes wrong

**One DNS dependency, and it is the long pole.** A record for
`next.climate.umt.edu` likely needs a request to UM IT rather than something
the office can issue itself. Raise it in Phase 0, on day one. Until it exists,
develop against the project-pages URL
`https://mt-climate-office.github.io/mco-website-next/` — note this *does*
need `base: '/mco-website-next'`, so set it from an environment variable
rather than hardcoding.

**No host or base path in source.** Links resolve through Astro's own
`<a href>` handling or `import.meta.env.BASE_URL`; never write a host or base
path into a template, stylesheet, Markdown link or fetch. Add a CI grep that
fails the build on a literal `next.climate.umt.edu` or `/mco-website-next/`
outside the config. Cheap insurance even at `base: '/'`, because the project-pages
fallback does use a base and because the staging host disappears at launch.

### Repo layout

```
src/
  components/
    data/          StationMap, ConditionsNow, PhotoStrip, NetworkStatusBar,
                   StationSearch, DroughtPanel
    layout/        Header, Footer, Nav, SkipLink, ThemeToggle
    content/       NewsCard, ProductCard, AudienceCard, Prose
  layouts/         Base.astro, Page.astro, Article.astro, Tool.astro
  content/
    news/          *.md
    pages/         *.md
    people/        *.md
    projects/      *.md
    partners/      *.md
  lib/
    mesonet.ts     typed API client
    tokens.css     imports or mirrors mco-web-style
  pages/           route files
public/
.github/workflows/deploy.yml
.pages.yml         Pages CMS config
```

---

## Part 3 — Consuming `mco-web-style`

**Settled — see `DECISIONS.md` D1.** Pinned jsDelivr tag + SRI +
`crossorigin`, starting at **v0.13.1**, with favicons and `og-card.png`
hot-linked from the pinned tag. This is what `HOUSE-STYLE.md` prescribes for
every consumer, and the website is an ordinary consumer.

The earlier draft of this section preferred a submodule or npm dependency with
self-hosted fonts. That was written without knowledge of `HOUSE-STYLE.md`, and
it is wrong on two counts: the kit has **no `package.json` by policy**, and it
uses `font-display: block` plus preload **deliberately**, to stop the title
re-setting. That behaviour travels with the published bytes. Do not vendor and
do not self-host the fonts.

Also:

- **Pin an exact version.** Never `@latest`. The current site's FontAwesome
  `@latest` — injected by the unpinned Minimal Mistakes remote theme — is
  exactly the bug not to repeat.
- **Use `snippets/head.html`, `snippets/anti-flash.html` and
  `snippets/skip-link.html`** rather than reimplementing them.
- **Token contract:** text, borders and icons on dark use **`--accent-line`**.
  `--accent` is fill-only. Same hex today; the token name is the contract
  (`HOUSE-STYLE` §2, `AGENTS.md` rule 3).
- **Data colour never comes from brand tokens.** Brand tokens are chrome.
  Anything with a legend uses `MCO.palette` (Crameri / ColorBrewer / Tol), or
  USDM ramps with D/W category names for drought and snow. **Spectral is
  banned** (`HOUSE-STYLE` §6).
- **`MCO.versions` is unreliable** — it reports `'0.1.0'` at v0.13.1. Do not
  use it to detect the loaded kit version.
- **Match the existing theme contract exactly** — see §3.1. Do not invent a
  second theming mechanism.
- **Fonts come from the pinned kit tag** with the kit's `font-display: block`
  and preload. Do not self-host them (D1).
- **Reuse the favicon set and `og-card.png`** so social previews match.
- If a version bump is needed, bump the tools too, or write down the policy.

### 3.0 What `mco-web-style@0.12.0` actually ships

Package directories: `assets`, `core`, `demo`, `exemplar`, `fonts`, `map`,
`palette`, `snippets`, `theme`, `tokens`, `tools`.

**`snippets/` is directly reusable by the website** — `anti-flash.html`,
`head.html` (9.5 KB) and `skip-link.html`. Include these rather than
reimplementing them.

**`core/mco-core.js` (99.88 KB) exports 62 helpers.** The website should use
these rather than write its own. Grouped by what they do:

| Group | Exports |
|---|---|
| URL state | `urlParams`, `getParamLower`, `splitTokens`, `replaceUrlState`, `pushUrlState`, `onUrlState` |
| Mountain-time dates | `TZ`, `todayMT`, `currentHourMT`, `hhmmNowMT`, `lastCompleteHourMT`, `shiftDate`, `formatStampMT`, `formatDateMT`, `formatDateStr` |
| Data | `fetchJSON`, `promiseCache` |
| Theme | `getTheme`, `osTheme`, `setTheme`, `THEME_KEY`, `THEME_CYCLE`, `toggleTheme`, `initThemeToggle`, `cssVar`, `chartTokens` |
| Accessibility | `announce`, `createLiveRegion`, `notice`, **`srTable`**, `reducedMotion` |
| UI | `initSearchBox`, `searchModel`, `initSearchCollapse`, `SEARCH_COLLAPSE_MQ`, `initDrawer`, `initNavRail`, `initSheet`, `initStepper`, `initCollapsible`, `initInfoModal`, `initLegendToggles`, `overlay`, `escStack`, `loading`, `toggleIn` |
| Page meta | `setPageTitle`, `setSocialMeta`, `credit` |
| Misc | `versions`, `lsGet`, `lsSet`, `escapeHTML`, `escapeRe`, `pad2`, `viewport`, `metrics`, `createToast`, `showToast`, `ready`, `whenReady` |

Two of these matter more than they look:

- **`srTable`** is almost certainly what builds the 253-row `sr-only` tables on
  `/status/` and `/maintenance/`. The visible station table in §4.3 should be
  built from the same helper, not hand-rolled.
- **`lastCompleteHourMT`** is the primitive for a "most recent capture" default.

### 3.0.1 Sharing the photo controls

**The photo controls are not in the shared core.** `mco-core.js` contains zero
occurrences of "direction" and only four of "photo", so the Explorer's
date / time / direction group lives in its own `app.js`. Copying that markup
into the website would create a second copy that drifts.

**Promote it into `mco-web-style` instead**, as `MCO.initPhotoControls({...})`
alongside `initThemeToggle`, or as a custom element so it drops into Astro
unchanged. Every primitive it needs is already shared: `fetchJSON` and
`promiseCache` for data, the URL-state group for `?date=`/`?time=`/`?dir=`,
the Mountain-time group for defaults, `announce` for live updates.

There is direct precedent in the codebase. The comment beside `MCO.osTheme`
records that the `?theme=` logic was *"identical copies in three consumers"*
before it was centralised in 0.8.0. The photo controls are at the same point
now, with the Explorer as the first consumer and the website about to be the
second.

**Two prerequisites, in this order:**

1. **Ship the capture-times endpoint first** (§1.4.3). A shared control cannot
   populate a time picker from an API that does not list available times. A
   shared control with a hardcoded schedule just spreads the staleness to a
   second surface.
2. **Settle the direction vocabulary.** Owner's decision: the control offers
   **North, South, East, West only**, defaulting to **North, most recent
   photo**. That means the API's `SNOW (Snow Platform)` images and the
   Explorer's current "North Sky" / "South Sky" options become unreachable
   from both surfaces. Decide where those live — a station detail page, or
   retired.

**Unknown:** how entangled the Explorer's controls are with its map state.
That needs the repo, which Claude Code will have and this brief's author did
not.

### 3.1 The theme contract (verified, read from `mco-core.js@0.12.0`)

`mco-web-style` already implements a complete theming system. **The website
must adopt it, not reimplement it.** Verified behaviour:

- **Three themes**, cycled in this order:
  `MCO.THEME_CYCLE = ['dark', 'light', 'high-contrast']`
  The 3-state toggle landed in 0.10.0 so high contrast is reachable from the
  page, not only from `?theme=` or storage.
- **Resolution precedence at boot: URL param → `localStorage` → OS preference.**
  This is a stated house convention (`HOUSE-STYLE.md §4`): read once at boot,
  validate every value, mirror state back on every mutation.
- **The default is the OS preference.** `MCO.osTheme()` returns
  `matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`.
  The code comment is explicit: *"The theme a visitor with no saved or URL
  choice gets: the OS preference, as the anti-flash snippet resolves it."*
- **An anti-flash snippet** sets `data-theme` on `<html>` before first paint.
  Reproduce it; do not let the site flash the wrong theme on load.
- `MCO.getTheme()` reads `document.documentElement.dataset.theme || 'dark'`.
  So `dark` is only the hard fallback when the attribute is absent, not the
  normal default path.
- **`?theme=` is written only when the current theme differs from the OS
  default**, deliberately keeping the default out of the URL (0.8.0, after
  three consumers had drifted into identical copies). Share links therefore
  carry a theme only when it was an actual choice.
- **`mco:themechange` fires on `document`** (0.9.0) with the new theme in
  `detail`. Map islands listen for it — a MapLibre `setStyle()` wipes sources,
  so re-add custom layers on `style.load` after a theme change. Use
  `MCO.initThemeToggle({ button, iconSun, iconMoon, iconContrast, cycle: true,
  onChange })` rather than wiring a toggle by hand.
- **Storage helpers are throw-safe** — `MCO.lsGet` / `MCO.lsSet` swallow
  exceptions for Safari private mode and disabled storage. Use them, not raw
  `localStorage`.
- `<meta name="theme-color">` is declared twice, media-gated:
  `#1a6faf` for light, `#161b22` for dark. Carry both over.

Practical consequence: a visitor's theme choice already survives the jump
between tools. If the website uses the same contract, it survives the jump
from the website into the tools too — which is most of what makes the two feel
like one product.

Independent check, 21 Oct 2026: on a browser set to dark, with no theme key
present in `localStorage` (keys were all per-tool state —
`mco-explorer-seen-intro`, `mco-status-mode` and similar), `/explorer/`
rendered with `data-theme="dark"`. Consistent with OS-preference default.
Not tested: the light-OS path, which was not reproducible from this machine.

---

## Part 4 — Recommendations (not yet decided)

### 4.1 Visual direction

Three mockups have been drawn. Owner picks one before build starts.

- **A — Instrument panel.** Fully dark, continuous with the tools; homepage is
  essentially a live map. Strongest continuity, boldest. Risk: cold for an
  extension and outreach office; long-form reading is harder.
- **B — Field notebook.** Light editorial ground with dark instrument wells
  wherever live data appears. Prose reads like a university office, data reads
  like the tools. Best for content volume and accessibility.
- **C — Photo-led.** The camera mosaic as the hero. Most distinctive; leans on
  the asset nobody else in the state has. Risk: slowest hero, and coverage is
  thin in western Montana, which the mosaic exposes honestly.

Recommendation: **B**, with C's mosaic as a full-width band lower on the page.

### 4.2 Information architecture

```
/                       Live conditions, tools, network health, news
/conditions/            Hub → Explorer, Dashboard, Photos
/drought/               Drought dashboard, UMRB, LFP Explorer, USDM editor
/climate/               Normals, trends, projections, Climate Explorer
/water/                 Streamflow, snowpack, soil moisture
  /water/snowpack/      → Snowpack Explorer (snow.climate.umt.edu)
  /water/streamflow/    → D³ HHP Streamflow layer
  /water/soil-moisture/ → D³ HHP Soil Moisture layer
/mesonet/               The network: what it measures, how it works
  /mesonet/stations/    Station directory (from /stations/)
  /mesonet/status/      Network status — status + maintenance + build-out
  /mesonet/data/        API docs, QC notes, bulk downloads
  /mesonet/request/     Request or host a station
/for/producers/         Audience entry points
/for/tribal-nations/
/for/agencies/
/for/researchers/
/research/              Research programme overview
  /research/publications/   Publications portal — see §4.7
  /research/publications/<slug>/   One page per publication
/projects/              NGP-RIDR, Sustainable FSA, EcoRestore, Native Resilience
/news/                  Public news and the monthly newsletter only
/about/                 Mission, staff, partners, funders, contact
/accessibility/         WCAG statement — currently missing entirely
```

Eight top-level sections is what breaks the current mobile nav. This collapses
to six: Conditions, Drought, Mesonet, Research, News, About.

### 4.3 The `/mesonet/status/` page

This is the new page that does the most work. It is the trust layer: it answers
*can I rely on this network?*, which is the question NOAA, DNRC, NIDIS, FSA and
Tribal partners are actually asking.

Contents:
- Headline figures from the `mesonet-compliance` summary JSON — stations,
  reporting count and percentage, health split (D10). **No compliance figure
  until D4 is resolved**
- Maintenance compliance, including overdue count
- UMRB build-out progress
- **The full 253-row station table, visible**, sortable and filterable, with CSV
  export — lifted from the `sr-only` tables the tools already build
- Links out to `/status/` and `/maintenance/` for the map views

Also put a live line in the sitewide footer: `253 stations · 99% reporting`.

**Two judgement calls for the owner, not for Claude Code:**
- Publishing "0 overdue" commits the office to a number that can go red.
- "Partial — sensor outage 31 (12%)" is honest but quotable out of context.
  If published, it needs a plain-language line explaining that partial means
  one sensor of several is down and the station is still reporting.

### 4.4 Type scale

`mco-web-style`'s scale is tuned for dense instrument UI (`--fs-base` 14px).
Long-form content needs more. Recommendation: add a content layer *on top of*
the system rather than overriding it —

```css
.prose { font-size: 1.0625rem; line-height: 1.65; max-width: 68ch; }
```

— and keep `--fs-*` untouched inside data components so they match the tools
exactly.

### 4.5 Data components

| Component | Source | Render |
|---|---|---|
| `StationMap` | `/latest/` + `/stations/` | Client island, MapLibre, lazy below fold |
| `ConditionsNow` | `/latest/?stations=<id>` | Client island; server-rendered fallback from build-time snapshot |
| `StationSearch` | `/stations/` | Build-time station list; geocoding client-side |
| `NetworkStatusBar` | `mesonet-compliance` summary JSON on data2 | Build-time snapshot, refreshed client-side. **Not `/stations/status/`**, which is the AirTable build registry, not health |
| `PhotoStrip` | `/photos/` | Build-time URLs, lazy `<img>` |
| `StationDirectory` | `/stations/` | Fully static, built at deploy |

Principles:

- **Fetch, don't frame.** No iframes for primary content.
- **Every island degrades.** Render last-known values from a build-time snapshot
  so a backend hiccup shows stale data with a timestamp, never an error string.
  The current site's failure mode — a raw connection error on the homepage — is
  the thing being fixed.
- **Lazy-load anything below the fold**, maps especially.
- **Never let a map capture page scroll.** Require `ctrl`/`cmd` + wheel, or
  click-to-activate, on any embedded map. Full-page tools keep normal zoom.
- Rebuild nightly via a scheduled Action so build-time snapshots stay fresh.

### 4.6 Content model

Two halves. The schema is the contract; the CMS config is a view onto it.

#### The dividing line: content versus data

**This matters more than the CMS choice.**

**Content** is prose a person wrote and will edit again — news posts, staff
bios, page copy, project descriptions. It lives in collections and the CMS
edits it.

**Data** is anything the API already knows — station counts, camera counts,
reporting percentages, capture schedules, last-visit dates, co-location pairs.
**It must not be typeable in the CMS.**

The moment a staff member can type "253 stations" into Markdown, the site
starts going stale the way the current one did: the live site says "over 120"
cameras when the real figure is 165, and "over 100" stations when it is 253.
In practice this means a `<StationCount />` component rather than a number in
prose. It is `VOICE.md`'s "specifics that change" expressed as architecture,
so nobody has to remember the rule.

If a field would need updating because the network changed rather than because
someone decided something, it does not belong in frontmatter.

#### Half one — Astro content collections

`src/content.config.ts` defines each collection with a Zod schema. Frontmatter
that does not match **fails the build**, which is the one thing Jekyll cannot
do and the reason accessibility will not decay here the way it did there.

```ts
import { defineCollection, z } from 'astro:content';

const news = defineCollection({
  schema: z.object({
    title:    z.string(),
    date:     z.coerce.date(),
    category: z.enum(['newsletter', 'announcement', 'event-report', 'research']),
    summary:  z.string(),
    image:    z.string().optional(),
    imageAlt: z.string().optional(),
    draft:    z.boolean().default(false),
    // email:  whatever send-newsletter.yml expects — read it first
  }).refine(d => !d.image || !!d.imageAlt, {
    message: 'imageAlt is required when image is set',
    path: ['imageAlt'],
  }),
});

export const collections = { news /* , people, pages, projects, publications */ };
```

The `refine` is the accessibility gate: an image without alt text stops the
build. Cheaper than any review process.

Collections: `news`, `people`, `pages`, `projects`, `publications`
(§4.7 — sourced from DOIs, not hand-written prose).

#### Half two — Pages CMS

`.pages.yml` at the repo root. Git-based, no server, and it edits files rather
than knowing about the framework, so the same config shape works against Astro
as it does against Eleventy at NGP-RIDR.

```yaml
# .pages.yml — sketch; mirror the Zod schema exactly
content:
  - name: news
    path: src/content/news
    type: collection
    fields:
      - { name: title,    type: string, required: true }
      - { name: date,     type: date,   required: true }
      - { name: category, type: select, options: [newsletter, announcement, event-report, research] }
      - { name: summary,  type: text,   required: true }
      - { name: image,    type: image }
      - { name: imageAlt, type: string }
      - { name: draft,    type: boolean, default: false }
      - { name: body,     type: rich-text }
```

**`mco-website` already has a `.pages.yml`** configured for posts and team
(Phase 0 §6.2). Much of it ports; read it before writing a new one.

#### Why Pages CMS rather than the alternatives

| Option | Verdict |
|---|---|
| **Pages CMS** | **Chosen** (D14). v2.1.8, MIT, ~55 open issues, supports Jekyll / Hugo / Eleventy / Astro alike, proven at NGP-RIDR, already configured on `mco-website` |
| Keystatic | Better in isolation — its TypeScript config plus reader API collapse schema and CMS config into one file. Rejected on maturity: self-described experimental at 0.6.x, save-path bugs through Aug–Sep 2026, and an undeclared-licence transitive dependency. Revisit at 1.0 |
| Decap / Sveltia | Need a GitHub OAuth proxy, i.e. a server. Not available on Pages |
| No CMS (GitHub web editor) | Honest fallback. For a few posts a month it is defensible and has no dependency to rot |

#### Two constraints Phase 0 surfaced

**The newsletter workflow ships with the website.** `send-newsletter.yml` and
an `email:` frontmatter field are designed to live in the website repo, so
`mco-website-next` inherits them. **Read that workflow before finalising the
news schema** — it dictates fields the schema must carry.

**Reconsider the `_pages/` exclusion.** The current config excludes `_pages/`
as "too risky", which is sensible in Jekyll where a page mixes layout and
prose. In Astro the split is clean: structural pages are `.astro`, prose pages
are a collection. Staff can probably be trusted with more than they are today.

#### `.pages.yml` is generated, not written

**Decided.** The Zod schema and the CMS config describe the same shape twice
and would drift. One source produces both.

**Not by introspecting Zod.** Walking `._def` gets most of the way and is
lossy in both directions: `z.string()` could be a text input, a textarea, an
image path or a slug, and the type does not say which; `.refine()` is a
closure and invisible to a parser; and `.pages.yml` needs a `body` field that
is not in the Zod schema at all, because Astro keeps the Markdown body
separate from frontmatter.

**Instead, one field definition emits both.** `src/content/_fields.ts` holds
field primitives that each carry a Zod type and its CMS presentation.
`toZod()` builds what `content.config.ts` validates against; `toCms()` builds
what the generator writes into `.pages.yml`.

Reference implementation: `docs/examples/cms-codegen/`.

```
src/content/_fields.ts        field defs → Zod + CMS metadata
src/content.config.ts         imports toZod(), exports collections
scripts/generate-pages-yml.mjs  writes .pages.yml
.pages.yml                    GENERATED — committed, never hand-edited
```

```json
"scripts": {
  "gen:cms": "tsx scripts/generate-pages-yml.mjs",
  "check:cms": "tsx scripts/generate-pages-yml.mjs --check"
}
```

`.pages.yml` stays committed because Pages CMS reads it from the repo. CI runs
`check:cms`, which regenerates in memory and fails the build if the committed
file differs. Drift becomes impossible rather than merely discouraged.

**Type mapping**

| Zod | Pages CMS | Note |
|---|---|---|
| `z.string()` | `string` / `text` | Ambiguous — the field helper decides, not the type |
| `z.coerce.date()` | `date` | Frontmatter dates are strings; coerce them |
| `z.boolean().default(x)` | `boolean` + `default` | |
| `z.enum([...])` | `select` + `options.values` | The only clean one-to-one mapping |
| `.optional()` | `required: false` | |
| image path | `image` | Still `z.string()` underneath |
| — | `rich-text` (`body`) | No Zod equivalent; added by the generator |
| `.refine(...)` | **nothing** | See below |

**Cross-field rules do not generate.** Pages CMS cannot express "imageAlt is
required when image is set" — only the build can. So each collection carries a
`refineNote` that the generator writes into the CMS entry's description, and
an editor who trips it sees a build failure rather than a silent pass. That is
the right trade: the rule is enforced in one place, and explained in the other.

Parts of `.pages.yml` that no schema describes — media paths, allowed
extensions, and the merge guard below — stay in a hand-maintained
`STATIC_CONFIG` block inside the generator.

#### The merge guard

```yaml
settings:
  content:
    merge: true      # DO NOT REMOVE
```

Without it, **Pages CMS writes back only the fields its config lists and
silently deletes the rest of the file on save.** A reported case lost 131
lines in a single save. This is the strongest practical argument for
generating `.pages.yml` rather than hand-writing it: codegen guarantees the
config lists every field, so the two mechanisms cover each other.

#### Hosting — decided: hosted

`app.pagescms.org`, the free hosted service (D14). No database to run, no
GitHub App to operate, no migrations to own.

It holds write access to MCO repositories, so:

- **Scope the GitHub App installation to `mco-website-next` only** — not the
  org, not all repositories. Add further repos individually if other sites
  adopt it.
- **Put it on record with UM IT** before launch, not after.
- **Review editor access periodically.** Access is per person against the
  repo, and staff leave.

Saves commit immediately and sequentially, so concurrent edits by two people
can conflict — acceptable for serial editorial work. There is no built-in
draft/publish workflow, which is why the schema carries a `draft` boolean.

**Migrate the news archive selectively.** Keep the drought and climate updates
and the announcements. Move the three internal technical notes
(`2022-08-05-envirocam-setup`, `2022-08-19-backup-neo4j`,
`2023-10-27-utm-arcgis`) out of the public feed.

### 4.7 Publications portal

Replace the hand-maintained list at `/research/` with a real portal. The point
is that it stays current without anyone remembering to update it.

**Model.** An Astro content collection, one entry per publication:

```
title, authors[], year, venue, doi, url, type (article | report | dataset |
software | thesis), projects[], topics[], abstract, openAccess (bool),
pdf (optional), citationCount (optional)
```

**Source.** Do not retype the list. Pick one and automate it:

1. **DOI-driven** — keep a plain list of DOIs in the repo; a scheduled Action
   hits Crossref for metadata and regenerates the collection. Simplest, most
   robust, no credentials.
2. **ORCID-driven** — pull each staff member's ORCID works and deduplicate.
   Keeps itself current as people publish, but catches personal work that is
   not MCO output.
3. **BibTeX/CSL-JSON** — if the office already keeps a Zotero group library,
   export and parse it. Best if that library exists; ask before assuming.

Recommendation: option 1, with the DOI list editable through Pages CMS so
staff can add a paper by pasting one string.

**Required fixes carried over from the current page:**

- **Descriptive link text.** Never "Read Article". Use the publication title
  as the link, or an explicit label — "Read *Drought assessment has been
  outpaced by climate change* (DOI)". The live site repeats "Read Article"
  nine times, a WCAG 2.4.4 failure. (The brief previously claimed "Permalink"
  ×12; that was wrong — the page is a Liquid loop over `_data/publications.yml`
  with nine DOI-bearing entries, which is the seed for option 1.)
- Filter and sort by year, type, project and topic.
- Per-publication pages so each is linkable, citable and indexable.
- Export the whole list as BibTeX and CSL-JSON — researchers will want it, and
  it costs almost nothing once the data is structured.
- Mark open access where known.
- Cross-link to `/projects/` so NGP-RIDR, Sustainable FSA, EcoRestore and
  Native Resilience each show their own outputs.
- **Replace the stock Unsplash hero.** Use a station photo from the office's
  own cameras.

### 4.8 The drought hub

`/drought/` has to hold four things that overlap and are easy to confuse.
Lead with what each answers, not what each is called:

| Tool | Question it answers | Scope |
|---|---|---|
| D³ Drought Data Dashboard | How dry is it, by which index, anywhere in the country? | CONUS |
| UMRB Drought Indicators | What do the Governor's drought committee indicators say? | Upper Missouri basin |
| Snowpack Explorer | How does this year's snowpack compare to the record? | CONUS |
| LFP Explorer | Does this county qualify for livestock forage assistance? | Montana / national |

Note D³ is marked BETA and the two HHP layers are marked IN REVIEW. Mirror
those labels on the site; do not quietly drop them.

---

## Part 5 — Accessibility, required

University of Montana policy requires **WCAG 2.1 Level AA** on all
institutional web content. Build it in; do not retrofit.

Non-negotiable in every template:

- `<html lang="en">`; unique descriptive `<title>` per page
- **Skip link to `#main`**, not `#main-content` — the kit convention, and
  `snippets/skip-link.html` already ships it. `<main id="main" tabindex="-1">`,
  plus real `<header>`, `<nav aria-label>` and `<footer>`. None of the map
  tools currently ships a footer; the website should
- **Exactly one `<h1>` per page**, no skipped levels
- Every `<img>` has `alt`; decorative images `alt=""`
- Every icon-only control has `aria-label`; decorative SVG `aria-hidden="true"`
- Every input has a real `<label>` — placeholder text is not a label
- Visible focus indicator at 3:1 against its surround; never bare `outline: none`
- Body text 4.5:1, large text and UI 3:1. Link text uses `--accent-line`,
  never `--accent`, which is fill-only (`HOUSE-STYLE` §2)
- Colour never the sole carrier of meaning — map station states differ in
  lightness and shape, not hue alone
- Tables: `<caption>` and `scope` on every `<th>`
- `prefers-reduced-motion` respected
- Ship a real `/accessibility/` statement — the current site has none

Add automated checks to CI: `axe-core` or `pa11y` against built pages, plus a
Lighthouse accessibility budget. Fail the build on regressions.

### Performance budget

- No unpinned CDN dependencies, ever
- No library loaded on a page that does not use it
- Total JS on the homepage under 150 KB gzipped, excluding the lazy map island
- Lighthouse performance ≥ 90 on mobile
- **Fonts come from the pinned kit tag**, `font-display: block` plus preload,
  as the kit does deliberately. Do not self-host and do not switch to `swap`

---

## Part 6 — Build order

### Phase 0 — Read the existing code first

**Do this before writing any code, and before trusting Part 1 of this brief.**
Everything in Part 1 was read off live sites from the outside. The repo is
authoritative and will contradict it in places. Where they disagree, the repo
wins — and note the disagreement in your first report so this brief gets fixed.

Working directory for the new site:
`~/git/mt-climate-office/mco-website-next` (repo
`mt-climate-office/mco-website-next`, created new in Phase 1). The tools to
review sit alongside it under `~/git/mt-climate-office`.

**0.1 — Find `HOUSE-STYLE.md`.** `mco-core.js` cites it directly
(*"Convention (HOUSE-STYLE.md §4): read once at boot with precedence URL param
> localStorage > default, validating every value; mirror state back on every
mutation and map moveend"*). It is the office's own engineering convention
document. Read it in full before anything else and treat it as binding.

**0.2 — Inventory every modern tool.** For each of the following, find its
repo and record what is listed in the table below it.

| Tool | Where it runs |
|---|---|
| `mco-web-style` | the design system itself — read this one first |
| Mesonet Explorer | `mesonet.climate.umt.edu/explorer/` |
| Photo Explorer | `mesonet.climate.umt.edu/photos/` |
| Station Dashboard | `mesonet.climate.umt.edu/dash/next/` |
| UMRB Build Status | `mesonet.climate.umt.edu/umrb/` |
| Station Status | `mesonet.climate.umt.edu/status/` |
| Station Maintenance | `mesonet.climate.umt.edu/maintenance/` |
| Snowpack Explorer | `snow.climate.umt.edu` |
| D³ Drought Data Dashboard | `d3drought.org` |
| Mesonet API v2 | `mesonet2.climate.umt.edu/api/v2` |
| EcoRestore | project site |
| NGP-RIDR | project site |
| Sustainable FSA | project site |
| LFP Explorer, USDM Editor | project sites |
| Current Jekyll site | `climate.umt.edu` — the thing being replaced |

For each, record: build tooling and deploy pipeline; pinned `mco-web-style`
version; framework and map library; which API endpoints it calls and with what
parameters; its URL-state parameters; where its copy lives; its accessibility
posture (landmarks, `h1`, labelled controls, `sr-only` tables); and whether it
is actively maintained or frozen.

**0.3 — Identify what should become shared.** Anything implemented twice is a
candidate for `mco-web-style`. Known candidates:

- **Photo date / time / direction controls** — see §3.0.1. The highest-value
  extraction, and the one the website needs first.
- **Place search and "near me"** — the Dashboard resolves a city, county or ZIP
  to the nearest stations with distances. The website needs exactly this on the
  homepage. Find out whether it already uses `MCO.searchModel` / `initSearchBox`
  or rolls its own.
- **Plain-language conditions summary** — the Dashboard generates lines like
  *"Partly cloudy tonight, calm, no precipitation in 3 days."* That is a
  content asset, not just a UI string. Find the generator.
- **`srTable`** — confirm it is what builds the 253-row accessible tables on
  `/status/` and `/maintenance/`, and reuse it.
- **Colour scales** — the Explorer credits Fabio Crameri's scientific colour
  maps; D³ and Snowpack follow the USDM convention. Establish which applies
  where before the website draws anything with a legend.
- **Station metadata caching** — several tools fetch `/stations/`. Check for a
  shared cache helper before adding another.

**0.4 — Resolve these specific contradictions.** Each was observed from the
outside and needs a repo-side answer:

1. Photo capture schedule. The Explorer's picker offers 9:00 AM and 3:00 PM;
   the owner reports three captures a day, moving to hourly. Where is that
   list defined, and why has the picker not followed?
2. No endpoint enumerates available capture times (§1.4.3). Confirm, then
   specify one.
3. Direction vocabulary. API returns `E/N/S/W/SNOW`; the Explorer UI offers
   North/South/East/West/North Sky/South Sky; the agreed set for the website
   is North/South/East/West, defaulting to North and the most recent photo.
   Reconcile all three, and decide where snow-platform and sky images go.
4. `mco-web-style` version drift: four consumers on `0.11.3`, `/umrb/` on
   `0.12.0`. What changed between them, and is there a release policy?
5. How entangled are the Explorer's photo controls with its map state?
   This decides whether §3.0.1 is an afternoon or a refactor.
6. Camera count: the API lists 152 stations with cameras; the live site says
   "over 120". Which is current?
7. Does D³ share anything with the Mesonet tools, or is it wholly separate?
8. **How is `climate.umt.edu` served today?** Which repo holds the `CNAME`,
   and what is its Pages configuration? Needed for the cutover in Phase 5,
   when the domain moves to `mco-website`.
9. **Who issues DNS for `*.climate.umt.edu`?** `next.climate.umt.edu` is the
   staging host and almost certainly needs a UM IT request. Raise it on day
   one — it is the longest-lead item in the project and nothing about the
   deploy pipeline is testable without it.
10. **Does "internal" need to be enforced?** GitHub Pages serves the staging
    host to anyone with the URL. If obscurity is not acceptable, staging has
    to move off Pages or sit behind an authenticating proxy, and that is a
    Phase 1 decision, not a Phase 5 one.

**0.5 — Rules for this phase.** Read and report; do not refactor the existing
tools as a side effect of building the website. Any change to a shared module
affects five live products — propose it, get agreement, ship it as its own
versioned release. Open a short written report answering 0.4 before starting
Phase 1.

**Phase 1 — Foundations**
1. Create `mt-climate-office/mco-website-next`. Wire the kit per D1: pinned
   jsDelivr tag at **v0.13.1**, SRI, `crossorigin`, favicons and `og-card.png`
   hot-linked from the tag. **Done.**

   The repo is **private to start with** (owner, 22 Oct 2026). Its Pages site
   is still public, as D2 accepts. The kit's canary checks out consumers
   without a token, so **joining the canary (D3) waits until the repo is
   public.**

   In parallel, not blocking: send the UM IT DNS ticket (O6, public **and**
   internal view), request the domain-verification TXT record (O5), and push
   `eight-view-plan` (O1).
2. Astro scaffold, GitHub Actions deploy to Pages, `next.climate.umt.edu`
   with HTTPS enforced. **Done.** The UM IT record exists in both views; the
   project-pages URL was never needed.
3. Base layout: header, nav, footer, skip link, theme toggle honouring all three
   themes. Accessibility CI in place from day one. **Done.** CI runs the kit's
   verify harness at the pinned tag, built-page checks, HTML validation and
   Lighthouse budgets (Part 5).

   Two owner decisions, 22 Oct 2026. The navbar drops the "A service of the
   Montana Climate Office." subtitle and links the logo to the site's own
   home; this is a HOUSE-STYLE §1 exception, to be written into HOUSE-STYLE
   as its own kit-docs change. The footer carries W.A. Franke College of
   Forestry & Conservation, University of Montana, Missoula, MT 59812, and
   `state.climatologist@umontana.edu`.
4. `src/lib/mesonet.ts` — typed client for `/stations/` and `/latest/`,
   generated from mesonet2's `/api/openapi.json`. Not `/stations/status/`,
   which is the AirTable build registry; health figures come from the
   `mesonet-compliance` summary (D5). Not `/photos/`, which is broken on
   mesonet2; photos read data2 directly (D6).

**Phase 1.5 — Prerequisites owned elsewhere**

These are not website code, and the website blocks on them. Track them.

- **`mesonet-compliance`** (D5) — ruleset repo plus a scheduled job publishing
  a summary JSON to data2. `NetworkStatusBar` and `/mesonet/status/` both
  depend on it. Resolve D4 (0 versus 41 overdue) as part of this work.
- **Kit extraction #1: photo modules** (D9) — ported from the dashboard's
  TypeScript to the kit's classic-script style, as `MCO.photos` plus a thin
  `initPhotoControls`. Its own versioned release; retrofits the Photo Explorer
  and the dashboard.
- **Create the MCO News list in Listmonk** (D11).
- **Fix mesonet2's photo routes** (D6) — currently 406, reading a storage tree
  retired 2026-09-20. The legacy API is already ported; copy that.

**Phase 2 — The homepage**
5. Chosen visual direction, desktop and mobile.
6. `StationMap`, `ConditionsNow`, `StationSearch`, `NetworkStatusBar`,
   `PhotoStrip` — each with its own loading, error and stale states.

**Phase 3 — Structure**
7. Section hubs per §4.2.
8. `/mesonet/status/` with the visible 253-row table and CSV export.
9. `/mesonet/stations/` directory, statically generated per station, deep-linking
   to `/dash/next/?s=<id>`.
10. Pagefind search.

**Phase 4 — Content**
11. Content collections; migrate pages from the Jekyll site. Fix "distiribute".
12. Pages CMS wired up; walk staff through it.
13. News migration, splitting public posts from dev notes.
14. `/accessibility/`, partners, staff, contact.

**Phase 5 — Cutover**

Cutover is a checklist, not a step. In this order:

15. **Inventory inbound links to `next.climate.umt.edu`** before anything
    else — org repos, Mesonet tool footers, partner emails, slides, reports.
    The subdomain is being retired, not redirected, so every one of these
    breaks. Anything found needs a real destination first.
    **Org repos done, 23 Oct 2026:** `docs/cutover-inbound-links.md`. No
    repo links the staging host; links to the production host are checked
    against the redirect map there. Re-run before cutover.
16. Move the custom domain `climate.umt.edu` to `mco-website-next` in its
    Pages settings (the deploy picks the new origin up from
    `configure-pages`). Settle the repo-rename
    question from §2.1 at this point, not later.
17. **Lift `noindex`.** It lifts itself when the Pages origin is
    `climate.umt.edu`, and the staging `robots.txt` with it. The deploy job
    refuses an indexable build until `EXPECT_INDEXABLE: '1'` is set in
    `.github/workflows/site.yml`; set it in the same change as step 16.
    Verify on the built output, not in source.
18. Submit the sitemap. Confirm canonical tags point at `climate.umt.edu`.
19. Redirect map from every old URL. Do not break inbound links from NOAA,
    DNRC, NIDIS or published papers — inventory them first.
    **Built, 23 Oct 2026:** `src/data/redirects.json` covers every URL in the
    old sitemap, every `_pages` permalink and the old short links; the build
    writes a redirect page at each old path, and `npm run check:redirects`
    gates it. Entries with a `todo` are stand-ins until content is migrated;
    `npm run check:redirects -- --strict` must pass at cutover.
20. Resolve `umt.edu/climate` versus `climate.umt.edu`: canonical tags, or
    retire one.
21. Full axe + Lighthouse pass. Manual keyboard and screen-reader pass on the
    homepage, a hub, a content page and `/mesonet/status/`.
22. Confirm the old Jekyll site is retired or archived and nothing still
    publishes to it.
23. **Retire `next.climate.umt.edu`** — remove the DNS record and the Pages
    site. Do this last, after the live site is verified, not alongside the
    switch.

---

## Part 7 — Questions, and where they stand

Settled questions live in `docs/DECISIONS.md`. This list records which of the
original fourteen are closed and which are still open.

### Closed

| # | Question | Answer |
|---|---|---|
| 1 | Visual direction | **A + C** — dark instrument chassis, photo mosaic hero. Reference comp at `docs/design/homepage-reference.html` |
| 2 | Kit consumption | D1 — pinned jsDelivr tag + SRI, v0.13.1 |
| 3 | Version policy | D3 — consumers may trail by MINOR; security fixes move all within a week |
| 4 | Publish maintenance compliance | **No**, pending D4. The 0-versus-41 discrepancy must be resolved first |
| 5 | Publish the partial-outage figure | **Yes** (D10), with a plain-language line explaining what partial means |
| 9 | Newsletter | D11 — create the MCO News list in Listmonk, ship the footer signup at launch. Listmonk 6.1.0 is live at `lists.climate.umt.edu`, SES approved; the public list does not exist yet |
| 13 | Publications source | `_data/publications.yml` already holds nine DOI entries. Seed option 1 from it. No Zotero library or office `.bib` exists |

### Still open

6. **`umt.edu/climate`** — it already 301s to `climate.umt.edu`, so this is
   smaller than the brief thought. Confirm nothing else needs doing.
7. **News archive** — where do the three internal technical notes go?
   (`2022-08-05-envirocam-setup`, `2022-08-19-backup-neo4j`,
   `2023-10-27-utm-arcgis`.)
8. **Analytics** — keep GA4, or move to something lighter? GA4 is on every
   page today, and D³ has its own separate property.
10. **Spanish or Salish/Kootenai content** — cheaper to design in now than to
    add later.
11. **D³ and the design system** — note `mco-drought-dashboard` is marked
    **hands-off** in `CONSUMERS.md:227` and is excluded from family-wide
    sweeps unless asked for by name. Its accessibility gaps (no `h1`, no
    `main`, no canonical, no SRI, HTTPS not enforced) still want closing.
12. **The HHP layers are marked IN REVIEW** via `data-flag` and read from
    `hhp_v2_test` shares. Promote, label provisional, or hold back?
14. **D³ is CONUS-wide and BETA.** How prominently should a national tool sit
    on a Montana office's homepage?

### New, from Phase 0

15. **Unsplash stock photos appear on 23 pages**, not just research. Replace
    with station camera imagery, or source properly?
16. **`/mesonet/funding_draft/` is a live draft page.** Retire or finish.
17. **Three brand blues are in circulation** — kit `#1a6faf`, Jekyll
    `#08729e`, mailing lists `#52adc8`. Converge on the kit value?
18. **Owner of `streamflow.climate.umt.edu`** is unknown, and the current
    site embeds it.

---

## Part 8 — Notes for whoever builds this

- **Read `/api/openapi.json` and generate types from it.** Do not hand-write
  the API client.
- **`datetime` fields are epoch milliseconds.** Element keys are display
  strings with units baked in, e.g. `"Air Temperature @ 2 m [°F]"`.
- **Station counts must come from the API**, never a constant. They change.
- **Do Phase 0 before anything else.** Part 1 of this brief was assembled from
  outside the repo, on one day, by inspecting live sites. It is a starting
  point, not a specification. `HOUSE-STYLE.md` and the source of
  `mco-web-style` outrank it everywhere they disagree.
- **Check the source repo before trusting §1.2.** Those token values were read
  from the live stylesheet on one day; the repo is authoritative.
- Content was drafted with AI assistance and needs review by MCO staff before
  publication, per UM's AI disclosure standard.
