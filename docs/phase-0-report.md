# Phase 0 report — climate.umt.edu rebuild

**For:** R. Kyle Bocinsky
**Prepared:** 22 October 2026, by Claude Code (read-and-report only)
**Answers:** `docs/mco-website-rebuild-plan.md` §0.2, §0.3, §0.4, plus every
place the code contradicts Part 1 of that brief.

Nothing was created, scaffolded, committed or pushed. No repo was modified.
Live checks were HTTP GETs and `dig` on 22 Oct 2026, around 08:00–09:00 MT,
run from the UMT campus network (this matters for DNS answers — see §4 Q9).

Confidence labels: **Verified** means read in code or observed live, with a
citation. **Unsure** means the evidence is incomplete; those are collected in
§9. File citations are `repo/path:line`, relative to `~/git/mt-climate-office/`.

---

## 1. Summary

1. **`HOUSE-STYLE.md` is at `mco-web-style/HOUSE-STYLE.md`.** It is read in
   full, along with `AGENTS.md`, `CONSUMERS.md` and `MIGRATING.md` beside it.
   Several brief recommendations conflict with it; it wins (§2).
2. **The photo "contradictions" mostly dissolve.** The 9 AM / 3 PM picker is
   in the **Photo Explorer**, not the Explorer, and it already builds its time
   list from the camera schedule: it offers **9:00 / 12:00 / 3:00** today. A
   capture-time enumeration **already exists** as static files on
   `data2.climate.umt.edu` — no API route, but the dashboard already uses
   them. The real defect is that **the mesonet2 API's `/photos/` routes read a
   storage tree frozen since September** and now return 406.
3. **There are two Mesonet APIs.** `mesonet.climate.umt.edu/api/v2` is the
   legacy on-prem one; `mesonet2.climate.umt.edu/api/v2` is the new AWS one.
   They have diverged (photos is the visible case).
4. **`/stations/status/` is not network health.** It is the AirTable build
   registry. Reporting %, the health split and maintenance compliance are all
   computed **client-side inside the status and maintenance apps**. The
   website would be a second copy of that logic unless the API grows a summary
   endpoint.
5. **`mco-web-style` is at v0.13.1 with eight consumers, not five.** The
   0.11.3 ↔ 0.12.0 drift is harmless (0.12.0 only added the `roma` palette).
   A release process exists (SemVer, pinned + SRI, never retag, a downstream
   canary); a policy on whether consumers move together does not.
6. **DNS for `*.climate.umt.edu` is issued by UM IT** (`dns-admin@umontana.edu`).
   `next.climate.umt.edu` does not exist. A Route 53 zone is drafted in
   `mco-dns`, but delegation is blocked until three records leave campus.
7. **Staging on GitHub Pages cannot be access-controlled** on the org's Team
   plan. "Internal" can only mean "unlinked and `noindex`".
8. Things worth knowing that the brief does not cover (§7): the live camera
   schedule is generated from a **44-commit branch that exists only on this
   laptop**; the maintenance feed publishes **staff names and field comments**;
   UMRB and Status **share localStorage keys**; Snowpack's revoked-or-not
   **API keys** are in public history.

---

## 2. Binding conventions that change the brief

`HOUSE-STYLE.md` outranks the brief. These are the places they disagree, or
where the house style adds a rule the brief does not mention.

| Topic | Brief says | HOUSE-STYLE / kit says | Evidence |
|---|---|---|---|
| Skip-link target | `#main-content` (Part 5) | `id="main" tabindex="-1"`; snippet is `href="#main"` | HOUSE-STYLE §5.6; `mco-web-style/snippets/skip-link.html` |
| Font loading | self-host, `font-display: swap` (§3, Perf budget) | `font-display: block` + preload of the two latin files, deliberately, to stop the title re-setting | `mco-web-style/theme/mco-theme.css:29-53`; HOUSE-STYLE §1 Typography |
| Consumption | Option 1 preferred: submodule / npm, self-host | Pinned jsDelivr tag + SRI + `crossorigin`; favicons and `og-card.png` **hot-linked from the pinned tag** (decided 2026-10-08); the kit has **no `package.json` by policy** | HOUSE-STYLE §1 Head assets, §8; `AGENTS.md` §1 and "When consuming"; `.gitignore` |
| Link/inline accent on dark | use `--accent-light` | Text, borders, icons use **`--accent-line`**; `--accent` is fill-only. (Same hex today, but the token name is the contract.) | HOUSE-STYLE §2; `AGENTS.md` rule 3 |
| Page titles | "unique descriptive `<title>`" | `<Short> · MCO` in the tab, `<Short> · Montana Climate Office` in cards, `og:site_name` = long family alone; set via `MCO.setPageTitle` / `setSocialMeta` | HOUSE-STYLE §1 Naming |
| Footer credit | — | `MCO.credit({source})`, `·` never `\|` | HOUSE-STYLE §1 Voice |
| Navbar | — | Badge 40×40 linked to `https://climate.umt.edu`; app subtitle "A service of the Montana Climate Office." Long pages use `.mco-navbar.is-sticky`, one row on compact | HOUSE-STYLE §1, §3 |
| Breakpoints | — | Only the kit ladder (1400 / 1060 / 750 / 640, compact includes `max-height: 560px`) | HOUSE-STYLE §3 |
| Map library | MapLibre GL | **MapLibre 6.11.2**, ESM via `MCO.map.loadMapLibre()`, import map with SRI; needs `worker-src blob: https://unpkg.com` in CSP | HOUSE-STYLE §7; kit README § CSP |
| Map scroll capture | ctrl/cmd-wheel or click-to-activate | Not covered by the house style — would be a new kit feature (admission rule: ≥2 properties) | HOUSE-STYLE §8 |
| `.prose` reading layer | add on top of the kit | Compatible: app-local until a second property wants it; uses `--fs-lg` (1.0625rem) | HOUSE-STYLE §8 |
| Data colors | — | Brand tokens are chrome only; data uses `MCO.palette` (Crameri / ColorBrewer / Tol); **Spectral banned**; USDM ramps must print D/W category names | HOUSE-STYLE §6 |
| Status tones | — | `--danger/--warning/--success` are chrome; a station's "stale/dead" category is **data** and takes a palette | HOUSE-STYLE §2 |
| localStorage | use `MCO.lsGet/lsSet` | Also: only `mco-theme` is shared; everything else `mco-website-*` | HOUSE-STYLE §4 |
| Canonical | point at `climate.umt.edu` | Production host, never github.io | HOUSE-STYLE §1 Head assets |
| D³ | Q11 offers "bring it onto the system" | `mco-drought-dashboard` is **hands-off** — excluded from every family-wide sweep unless you ask for it by name | `mco-web-style/CONSUMERS.md:227` |

**Consumption recommendation (not a decision).** Option 2 (CDN pin + SRI) is
what the house style prescribes for every consumer. Option 1 can still work
for an Astro build — vendor a pinned tag at build time and serve the fonts
from the same relative path the CSS expects — but it would make the website
the first consumer that does not load the kit as published bytes, and the
house style would need a line saying so. Your call (Part 7 Q2); I would
not choose it silently.

---

## 3. §0.2 — Inventory

### 3.1 The tools on the design system

| Tool (repo) | Deploy | Kit pin | Map / framework | Data sources | URL state | A11y posture | Activity |
|---|---|---|---|---|---|---|---|
| **mco-web-style** | Tags on GitHub, served by jsDelivr. CI: tokens, contrast, SRI, axe, canary over 7 consumers | latest **v0.13.1** (2026-10-10) | — (classic scripts on `window.MCO`) | — | — | axe in all 3 themes in CI | active |
| **Explorer** (`mesonet-explorer`) | Pages legacy, `main /`, no CNAME; proxied by on-prem Caddy at `/explorer/`. No CI | **0.11.3** + SRI | MapLibre 6.11.2, vanilla, flatgeobuf 3.38.0 | mesonet2 `/api` (unversioned base) `stations, elements, latest, observations/{hourly,daily,grouped}, derived/*`; data2 photo schedule, manifests, S3 listings; IEM NEXRAD | `mode var date hour units net labels agg scale ramp radar nodata stale counties watersheds legend sidebar theme kbd lng lat zoom station export` — **no photo params** | skip link, header, 1 h1, main, `MCO.srTable`, `MCO.announce`; no footer | very active (HEAD 2026-10-21) |
| **Photos** (`mesonet-photo-explorer`) | Pages legacy, `main /docs`; Caddy `/photos/`; nightly `preview.yml` commits og image | **0.11.3** + SRI (also hard-coded in `docs/app.js:35`) | MapLibre 6.11.2 | mesonet2 `stations`, `stations/status`; data2 `schedule.json` and WebP frames. **No longer calls `/api/v2/photos`** | `date time dir overlay theme lng lat zoom station internal kbd export`; `dir` default **W** | skip link, header, 1 h1, main, labelled controls, `srTable`, `announce`; no footer | active (2026-10-19) |
| **Dashboard** (`mesonet-dashboard/web`) | Vite build → Actions `deploy-pages`; Caddy `/dash/next/` → Pages `/mesonet-dashboard/`. `/dash/` is still the legacy Python Dash app | **0.11.3** + SRI | MapLibre 6.11.2; Alpine 3, TypeScript, ECharts 6 | mesonet2 `/api/v2` as CSV (allowlist generated from OpenAPI); NWS points/forecast/alerts; data2 photos; raw.githubusercontent normals/one-pagers | `s units theme` + hash `#now #charts #about` + ~30 section params (`web/src/core/url-schema.ts`) | full landmarks incl. footer; **own** sr table and combobox, not the kit's; axe + keyboard in CI | very active |
| **Status** (`mesonet-status`) | Pages legacy `main /`; Caddy `/status/`; nightly preview bot | **0.12.0** + SRI | MapLibre 6.11.2 | mesonet2 `/api` `stations`, `latest` (5-min poll), `elements?all=true` | `mode net scat tcat hcat labels legend theme lng lat zoom station kbd` | `srTable`, `announce`, `initSearchBox`; no footer | last code 2026-10-10; **uncommitted changes** (§6) |
| **Maintenance** (`mesonet-maintenance`) | as Status, `/maintenance/` | **0.12.0** + SRI | MapLibre 6.11.2 | mesonet2 `stations`, hidden `stations/maintenance/live` (AirTable, 300 s cache) | `mode net cat-<mode> labels legend kbd theme lng lat zoom station` | `srTable`, `announce`, `initSearchBox`; no footer | 2026-10-10 |
| **UMRB Build** (`mesonet-umrb-build`) | as Status, `/umrb/` | **0.12.0** + SRI | MapLibre 6.11.2, flatgeobuf | mesonet2 hidden `stations/status/live`; vendored 205-cell grid; data.climate.umt.edu FGB overlays | `internal view cat-<view> overlays stations labels legend kbd theme lng lat zoom cell station` | **hand-built** sr table (per cell); `announce`, `initSearchBox` | 2026-10-10 |
| **Air Quality** (`mesonet-aq`) — not in the brief | Pages `main /docs`; proxied at `mesonet2…/air/` only | **0.13.1** | MapLibre, ECharts 6 | Parquet pipeline output | — | conformance 30/30 | 2026-10-10 |
| **Snowpack** (`mco-snowpack-explorer`) | Pages legacy `main /`, CNAME `snow.climate.umt.edu` | **0.11.3** + SRI | MapLibre 6.11.2; **`hyparquet@1` from esm.sh, floating, no SRI** (`app.js:18`) | data2 `snodas/…` only; no Mesonet API | `method date view huc lat lng zoom export` | canonical, OG, skip link, header, 1 h1, main, `srTable`; no footer | 2026-10-19 |

### 3.2 Off the design system

| Tool (repo) | Deploy | Stack | Notes |
|---|---|---|---|
| **D³** (`mco-drought-dashboard`, hands-off) | Pages `main /docs`, CNAME `d3drought.org`, **HTTPS not enforced** (HTTP serves 200) | OpenLayers 10.5.0, geotiff 2.1.3, chroma 2.4.2, **`topojson-client@3` floating**; **no SRI on any script**; Google Fonts | No h1/main/header/footer, no canonical/OG; own GA4 property. Data from data2 (same SNODAS pipeline as Snowpack), GHCNd S3, data.sustainable-fsa.com. Does not call the Mesonet API; links to the old `climate.umt.edu/mesonet/` page. URL state only on Share (hash). Active (2026-10-19, mostly Zach Hoylman) |
| **API v2** (`mesonet-db-rds`) | ECS Fargate → API Gateway → RDS; **manual `workflow_dispatch` deploy**, pushes `:latest` image | FastAPI | 22 OpenAPI paths + ~20 hidden routes; CORS `*` at API Gateway; **30 s gateway timeout** |
| **Legacy API** (`mesonet_app/apiv2`) | on-prem Docker behind Caddy (`mesonet_app/Caddyfile`) | FastAPI | 21 paths; still edited (2026-10-19) |
| **EcoRestore** (`ecorestore`) | Actions → Pages, `ecorestore.umt.edu` | Jekyll, Tailwind 3, Alpine **`@3.x.x` floating**, d3@7 floating | axe + Playwright + html-validate in CI — the strongest a11y CI in the org; no canonical |
| **NGP-RIDR** (`ngp-ridr/ngp-ridr.github.io`, other org) | Actions → Pages, `ngp-ridr.org` | **Eleventy 3**, Pages CMS, Leaflet 1.9.4 (SRI), `chart.js@4` floating | landmarks, canonical, OG; pa11y dev-only |
| **USDM Editor** (`ngp-ridr/usdm-editor`, **private repo**, public Pages) | `ngp-ridr.org/usdm-editor/` | vendored MapLibre 5.18.0; `ridr-theme.css`, a fork of `sustainable-fsa/style`, itself a fork of `mco-web-style` | canonical points at a github.io URL that 301s |
| **Sustainable FSA** (`sustainable-fsa/sustainable-fsa.github.io`) | Actions → Pages, `sustainable-fsa.com` | **Jekyll + Tailwind, not Astro** | own `sustainable-fsa/style` kit (v0.4.1) with its own HOUSE-STYLE/CONSUMERS/MIGRATING |
| **LFP Explorer** (`sustainable-fsa/lfp-explorer`) | Pages legacy | `sfsa-theme` 0.4.1, MapLibre 5.18.0 | Lighthouse CI config present |
| **climate.umt.edu** (`mco-website`, **private repo**) | Actions (`build-site.yml`) builds Jekyll 3.10 → `peaceiris/actions-gh-pages` → `gh-pages`; CNAME written by the action | Minimal Mistakes **remote theme, unpinned**; Pages CMS already configured for posts and team | last deploy 2026-09-29; clean tree |
| **Headwaters Hydrology streamflow** | `streamflow.climate.umt.edu` (live; DNS record exists) | Leaflet from unpkg, **unpinned** | **No org repo claims this host.** Owner unknown |

### 3.3 Hosting map for `mesonet.climate.umt.edu`

Today it is the **on-prem Caddy** (`mesonet_app/Caddyfile:20-198`): `/photos`,
`/status`, `/maintenance`, `/umrb`, `/explorer` → their GitHub Pages repos;
`/dash/next/` → Pages `/mesonet-dashboard/`; `/dash/` → the legacy Dash
container; `/api/v2` → the legacy API; `/` → 301 to `climate.umt.edu/mesonet/`.
Unmatched paths return **200 with an empty body** (e.g. `/air/`).

A CloudFront replacement (`mesonet-gateway`) is live as `mesonet2.climate.umt.edu`
but **does not match yet**: `/dash*` 301s to github.io and drops `?s=`;
`/status-data` and `/performance` are 404; `/air/` exists only there. The
cutover is a CNAME flip that UM IT has to make. **Until it lands, website deep
links into the dashboard must use `mesonet.climate.umt.edu/dash/next/?s=<id>`.**

---

## 4. §0.4 — The ten questions

### Q1. Photo capture schedule

- **The picker belongs to the Photo Explorer** (`/photos/`), not the Explorer.
  The Explorer has no photo date/time/direction controls; its station panel
  has a carousel that follows the map's own mode, date and hour.
- **It is not hard-coded, and it has followed the pipeline.** The static
  `<option>`s at `mesonet-photo-explorer/docs/index.html:449-452` are
  placeholders. The real list comes from `slotsForDate()`
  (`docs/app.js:212-243`): a slot is offered on a date when at least half the
  stations shooting that day were scheduled for it in `schedule.json`.
  Landed in `8ff0596`, 2026-09-28. Dates before 2026-09-20 show 9:00 / 3:00;
  later dates show **9:00 / 12:00 / 3:00**.
- **What the pipeline runs** (`mesonet-cameras/data/patrol_plan.toml`, and the
  live `schedule.json` generated 2026-10-21): horizon views N/E/S/W at
  `0 9,12,15 * * *`; instrument views (SNOW, NSNOW, SSNOW, PLUVIO, SOLAR) once
  at 09:00. Archive keys for 21 Oct confirm 9 / 12 / 3 MDT.
- **"Moving to hourly" is not in code.** Hourly ran only as a pilot,
  2026-09-11 to 09-20 (`mesonet-cameras/docs/ROLLOUT.md:19`);
  `patrol_plan.hourly.toml` is marked a draft. I found no scheduled fleet move.
- **The remaining hard-coded 9 / 15 is in the Explorer**: Daily mode picks the
  frames nearest 9 AM and 3 PM (`mesonet-explorer/app.js:2847-2851`), so the
  noon frame never appears there. Comments at `:2652` and `:2834` still say
  "legacy cameras shoot only 9 AM and 3 PM".
- **"An unlisted hour silently snaps back to 3 PM" is wrong in detail.**
  `resolveTimeForDate` (`docs/app.js:313-328`) moves to the next later slot
  that day (`?time=10` → 12:00), else the last slot, and **shows a toast**
  saying the time was adjusted (`:330-340`).

### Q2. An endpoint that enumerates capture times

- **Confirmed: no API route does it.** `/photos/{station}/` and
  `/photos/{station}/{direction}/` return an image (`mesonet-db-rds/api/app/app/main.py:2296-2380`).
- **But enumeration already exists as public static files** on
  `https://data2.climate.umt.edu/mesonet/`, CORS `*`:
  - `photos/schedule/schedule.json` — what *should* exist: per station, dated
    periods, per view `cron` and `slots_local`. Published by
    `mesocam rollout publish`.
  - `photos/manifest/{sta}/{sta}_{YYYY-MM}.csv` — what *did* land: one row per
    capture (`station, view, token, captured_utc, captured_local, date_local,
    time_local, slot_utc, jpg, webp_large, webp_thumb`).
  - `photos/manifest/latest.csv`, and S3 ListObjectsV2 via
    `?list-type=2&prefix=…`.
  - `photos/schedule/arrivals.json` is **stale** (last modified 2026-09-20).
- **The dashboard already consumes these** in typed, framework-free modules:
  `mesonet-dashboard/web/src/core/photos/{schedule,archive,time}.ts`.
- **Real defect found instead:** mesonet2's photo routes read
  `s3://mco-mesonet/photos/raw/`, the mirror retired 2026-09-20
  (`mesonet-db-rds/docs/deployment.md:282`). Live: `/photos/aceabsar/n/`
  returns 406; with `force=true` it serves a frame from 2026-09-10. The legacy
  API was already ported to the new layout
  (`mesonet_app/apiv2/app/app/crud.py:2411-2455`).
- **Specification, two options** (choose one):
  1. **No API change** — the website reads `schedule.json` and the monthly
     manifest directly, as the dashboard does. Cheapest, already proven.
  2. **API route** — `GET /photos/{station}/times/?date=YYYY-MM-DD[&direction=n][&type=json|csv]`
     returning `[{datetime, slot, direction, view}]` with epoch-ms times like
     `/latest/`, backed by the manifest CSV; optionally `/photos/schedule/`
     passing `schedule.json` through. Port the mesonet2 photo routes to the
     new storage layout in the same change.

  Either way, keep `arrivals.json` fresh or retire it.

### Q3. Direction vocabulary

There are five vocabularies, not two:

| Source | Values |
|---|---|
| mesonet2 API labels (`crud/photos.py:191-199`) | N, S, E, W, SNOW, **NS, SS**; path enum also has an orphan `g` (`schemas.py:97-105`) |
| Camera pipeline (`patrol_plan.toml`) | N, E, S, W, SNOW, NSNOW, SSNOW, PLUVIO, SOLAR, PARK (rest position, not a view) |
| Explorer carousel (`mesonet-explorer/app.js:2676`) | E, N, S, W, SNOW, NS, SS — and it cycles whatever the schedule lists, **unfiltered** |
| Photo Explorer (`docs/app.js:38-50`) | N, S, E, W public; SNOW, SSNOW, PLUVIO only with `?internal=1`; PARK hidden; **NSNOW and SOLAR not handled** (would show publicly with raw tokens — unverified in a browser) |
| Dashboard (`web/src/core/photos/schedule.ts:88-91`) | N, E, S, W only |

What to decide, with the facts:

- **Sky images are retired.** NS / SS came from a dual-lens camera at four
  stations (`acecrowa`, `aceingom`, `aceround`, `acesidne`), replaced in late
  September 2026 (`mesonet-cameras/docs/photo-pipeline.md:433,513-514`). They
  exist only as history.
- **Historical "North" is not the horizon.** Before 2026-10-21, "N" was
  preset 1, aimed at the pluviometer; "S" was aimed at the snow stake
  (comments near `patrol_plan.toml:80-90`). **Defaulting to North for an older
  date shows a rain gauge.** The agreed N/S/E/W set is only clean from
  2026-10-21 onward.
- **The Photo Explorer defaults to West**, not North (`docs/app.js:43`).
- Snow, Pluvio and Solar views are already staff-only in `/photos/`. A station
  detail page is the natural public home if you want them public at all.

Recommendation: adopt the dashboard's N/E/S/W filter as the public set, label
pre-2026-10-21 "North" honestly or hide it, and register NSNOW/SOLAR in the
Photo Explorer. These are your decisions; I have changed nothing.

### Q4. `mco-web-style` version drift and release policy

- **Actual pins** (all with SRI): Explorer, Photos, Dashboard, Snowpack on
  **0.11.3**; **Status, Maintenance, UMRB on 0.12.0**; Air Quality on
  **0.13.1**. Eight consumers.
- **0.11.3 → 0.12.0 changed the palette file only**: it added `MCO.palette`
  `roma`, which status, maintenance and umrb adopted the same day
  (`mco-web-style/CHANGELOG.md:44-53`). Theme, core and map are byte-identical,
  so the drift is cosmetic.
- 0.13.0 added `[data-autolift]` (theme only); 0.13.1 capped the lift (theme
  and core).
- **Release process that exists** (`AGENTS.md` § Releasing, `README.md`
  § Versioning): SemVer (a default change is MAJOR), pinned URLs + SRI, never
  delete or re-point a tag, CHANGELOG per tag, and a **canary workflow** that
  loads seven consumers against the candidate before tagging
  (`.github/workflows/canary.yml:22`; `mesonet-aq` is not in it).
- **What does not exist:** a rule on whether consumers move together. Practice
  so far: security fixes (MapLibre 6) moved every consumer in a coordinated
  sweep; other bumps happen per app.
- Proposal for you to accept or reject: consumers may trail by MINOR versions;
  any security fix moves all consumers within a week; a MAJOR release ships
  with the consumer PRs ready; the website is added to the canary matrix when
  it exists.

### Q5. How entangled are the photo controls with map state?

- **Explorer: there is nothing to extract.** Its carousel
  (`app.js:2624-2976`) reads the module globals `activeMode`, `activeDate`,
  `activeHour` and `_selectedStation`, and is called from the panel builders.
- **Photo Explorer: real controls, woven into the app.** The time-menu logic
  (`slotsForDate`, `resolveTimeForDate`, `computeMaxTimestep`, `clampDate`,
  `:212-340, 1403-1427`) depends on the parsed schedule and on the stations
  placed on the map (`dirsForSlot`, `:727`). Every change also refreshes the
  mosaic, rewrites the URL including the camera, updates the landscape rail
  and batches toasts.
- **The cleanest source is the dashboard**, whose photo modules are pure
  TypeScript with no Alpine dependency.
- **Verdict: a refactor, not an afternoon.** Shape: a kit `MCO.photos` data
  module (schedule parse, `slotsForDate`, `dirsForSlot`, frame URL, manifest
  reader, MT↔UTC wall-clock conversion), then a thin `initPhotoControls` on
  the existing `initStepper` and `initSegmentedFallback`. That is a kit
  release (ported from TS to the kit's classic-script style) plus retrofits of
  the Photo Explorer and dashboard. It passes the admission rule (≥2
  properties) easily.

### Q6. Camera count

**165.** Every public HydroMet station has a camera. This figure agrees across
`schedule.json`, `latest.csv` and the legacy API's `/photos/`; on 21 Oct, 165
stations delivered North frames and 163 delivered all three slots. The
**152** is mesonet2's stale tree (including `acetest`, `bench_it` and an
archive artifact). **"Over 120"** is in the Jekyll site at `mco-website/index.md:17`
and `_posts/2026-03-24-mesonet-photo-explorer-launch.md:30`. Per brief §1.5,
the website should take the number from data, not prose.

### Q7. Does D³ share anything with the Mesonet tools?

**No code, but more than the brief says.** Shared: GitHub org and Pages;
the `data2.climate.umt.edu` host and its SNODAS output (the same pipeline
Snowpack reads); the drought-indicators soil-moisture FGB on
`data.climate.umt.edu`; the accent `#1a6faf` and the Outfit / Space Mono
fonts through a hand-forked token block (`docs/styles.css:8-37`, deliberately
drifted per CONSUMERS); a local copy of the MCO logo.

**Its theme control is not only a basemap selector.** The "Basemap & theme"
section has a separate Dark / Light / High Contrast strip that sets
`data-theme` on `<html>` (`docs/index.html:552-556, 1957-1969`) — the kit's
names and attribute. What it lacks: `localStorage['mco-theme']`, the OS
default (hard-coded `'dark'`), and a pre-paint boot. So a visitor's choice
still does not carry across. The rest of brief §1.4.1 is confirmed.

Labels: **BETA** is a hard-coded navbar pill (`:62-66`). **IN REVIEW** is
`data-flag="In Review"` on the two HHP options (`:185`, `:188`), and those
layers read from `…/share/hhp_v2_test/…` and `…/share/hhp-kgml-soil-moisture`
(`:856`, `:864`).

### Q8. How is `climate.umt.edu` served today?

- Repo **`mt-climate-office/mco-website`** (private; its Pages output is
  public). Pages `build_type: legacy`, source **`gh-pages` branch at `/`**,
  HTTPS enforced, certificate auto-renewing (expires 2026-11-21).
- **There is no `CNAME` file on `main`.** `build-site.yml:58`
  (`cname: climate.umt.edu`) writes it into `gh-pages` on every deploy.
- **The domain is not verified for the org** (`protected_domain_state:
  "unverified"`; no `_github-pages-challenge-mt-climate-office` TXT record).
- DNS: `climate.umt.edu` is a CNAME → `mt-climate-office.github.io`.
  `www.climate.umt.edu` → `climate.umt.edu`; **HTTPS on `www` is broken**
  (certificate is `*.github.io`).

Cutover consequences, for Phase 5: remove the custom domain from
`mco-website`'s Pages settings **and** delete `cname:` from `build-site.yml`
(otherwise the next push re-claims it); verify the domain for the org first
(a UM IT TXT record) so nobody can claim it during the gap; fix `www`.
The brief's Q8 says the domain "moves to `mco-website`" — it means
`mco-website-next`.

### Q9. Who issues DNS for `*.climate.umt.edu`?

- **UM central IT.** `climate.umt.edu` is not a delegated zone; it is flat
  records in `umt.edu` (NS `ns1/ns3.umt.edu`, SOA `dns-admin.umontana.edu`).
  Confirmed by `mco-dns/README.md:5-7` and `mco-mailing-lists/INFRA-NOTES.md:20-23`.
- **UM runs split-horizon DNS**: `mesonet.climate.umt.edu` is 150.131.194.170
  publicly and 10.10.41.37 on campus. The `lists.*` records needed a separate
  internal-view request (`mco-mailing-lists/docs/um-it-requests/internal-dns-lists.md`).
  So **`next.climate.umt.edu` needs a public and an internal-view record**
  (CNAME → `mt-climate-office.github.io.`), or campus and VPN users will not
  reach it. The internal-view part is an inference from that precedent.
- `next.climate.umt.edu` is NXDOMAIN today.
- **Longer path:** `mco-dns` holds a Route 53 zone for `climate.umt.edu`
  (`terraform/zones.tf`), inert until UM IT delegates NS. UM IT will only
  delegate once every record resolves off campus (`docs/delegation-runbook.md:14-31`),
  and three do not: `data`, `mesonet` (waiting on the gateway cutover) and
  `staging`. I could not confirm whether the zone is applied or the delegation
  email was sent.
- **Action for day one:** a ticket to `dns-admin@umontana.edu` for
  `next.climate.umt.edu` in both views. I have not sent anything.

### Q10. Does "internal" need to be enforced?

- **On the org's plan it cannot be enforced on GitHub Pages.** The org is on
  GitHub **Team**; Pages access control needs Enterprise Cloud. A private repo
  still publishes a public Pages site (this is already true of `mco-website`).
- So the choice is:
  1. **Accept obscurity**: unlinked, `noindex, nofollow`, `robots.txt Disallow: /`,
     no sitemap, canonicals pointing at `climate.umt.edu`. This is the brief's
     default.
  2. **Enforce it**: host staging off Pages behind authentication — for
     example CloudFront + an auth function in `mco-aws`, matching how
     `mesonet-gateway` is built. More work, and it changes the deploy design
     in Phase 1.
- This is yours to decide. Nothing in the content planned for staging looked
  sensitive to me, which argues for option 1.

---

## 5. §0.3 — What is implemented more than once

Ranked by what the website needs first. "Admissible" means it meets the kit's
rule of ≥2 MCO properties (HOUSE-STYLE §8) once the website is counted.

| Candidate | Copies today | Best source | Recommendation |
|---|---|---|---|
| **Photo data layer** (schedule parse, slot logic, frame URLs, MT wall-clock ↔ UTC, direction labels) | Explorer (`app.js:2693-2760`), Photo Explorer (`docs/app.js:365-432, 649-669`), Dashboard TS, both APIs. Direction label maps ×3, disagreeing | `mesonet-dashboard/web/src/core/photos/*.ts` | Kit `MCO.photos` + `initPhotoControls` (Q5). Admissible. The kit has no wall-clock→UTC helper at all |
| **Network health + maintenance compliance** (reporting %, operational / partial / outage, visited / overdue / exempt) | Client-side only in `mesonet-status/app.js:31,169-202` and `mesonet-maintenance/app.js:244-264` | — | **Server-side summary endpoint** rather than a third client copy; a footer line ("253 stations · 99% reporting") and `/mesonet/status/` both need it. **Do not use the API's `compliance_state`** (it says 41 overdue; the app's rules say 0 — §6.1) |
| **Place search / near me** | Dashboard only: own combobox, Census 2026 gazetteer `web/public/data/places.json` (930 places), haversine nearest | `web/src/core/places/*`, `core/stations/nearest.ts` | Admissible with the website. Port the model onto `MCO.searchModel`/`initSearchBox` (the dashboard's combobox says it was written to be swapped for the kit one) |
| **Plain-language conditions summary** | Dashboard only: `web/src/core/overview/summary.ts` (`summarize()` `:128`) | same | Pure TS, injectable clock and units; inputs are NWS `shortForecast`, `/latest` wind, 72 h hourly gusts, `/derived/ppt/`. Admissible. Also VOICE.md's model sentence |
| **`srTable`** | Kit helper used by Status, Maintenance, Explorer, Photos, Snowpack. **UMRB hand-builds its table**; the dashboard has its own | kit | Confirmed: status/maintenance tables come from `MCO.srTable` (status `app.js:1034-1047`; maintenance `:866-876`). Visible table on `/mesonet/status/` should use the same columns and data path |
| **Station metadata fetch + normalization** (`indexStations`, co-location `bucketKey`, `netRank`) | Status, Maintenance, Explorer; dashboard has its own TTL cache. **No app uses `MCO.promiseCache`** | — | Kit candidate: a station-catalog helper on `promiseCache`. Explorer's `cached()` is a near-copy of `promiseCache` |
| **USDM color ramp** | Snowpack, D³, USDM Editor, LFP Explorer — and **not in `MCO.palette`** | — | `MCO.palette.usdm` with category labels baked in (HOUSE-STYLE §6 already requires them) |
| **Branded PNG export** | Explorer, Photos, Snowpack, D³, USDM Editor | — | Kit has deferred it; noting only |
| **API base URL / dashboard link constants** | Hard-coded per app; status uses unversioned `/api`; status, maintenance, umrb link `DASH_URL` to the **legacy** `/dash/<id>`, not `/dash/next/` | — | One shared constant, or at least consistent values |
| **Design-system forks** | `sustainable-fsa/style` (own HOUSE-STYLE), `ngp-ridr` `ridr-theme.css`, D³'s token block | — | Not website work; recording that the "one source of truth" has three descendants |
| **cog-protocol.js** | Kit, D³ `legacy/`, mco-snodas | kit | Not website work |

Color scales, as requested in §0.3: Crameri `roma` (via `MCO.palette`) for
status, maintenance time-since and UMRB stages; Crameri batlow / ColorBrewer /
Tol in the dashboard's own copy and the Explorer's `RAMPS` table; USDM for
Snowpack, D³, USDM Editor and LFP Explorer; D³ also offers the banned
Spectral (`docs/index.html:1075`). Anything the website draws with a legend:
`MCO.palette` for Mesonet data, USDM (with D/W labels) for drought and snow.

---

## 6. Where the code contradicts the brief

### 6.1 Part 1 — verified facts

| § | Brief says | Code / live says | Evidence |
|---|---|---|---|
| 1.1 | Five consumers on 0.11.3 / 0.12.0 | **Eight**; Status and Maintenance are on 0.12.0 too; Air Quality on **0.13.1**; latest tag **0.13.1** | §3.1; `CONSUMERS.md:203-212` |
| 1.1, 3.0 | Source repo "presumably" under the org | `mt-climate-office/mco-web-style`, local `~/git/mt-climate-office/mco-web-style` | — |
| 1.2 | 78 custom properties | Values match exactly (all three themes checked). The CSS defines **84** distinct custom properties across its `:root` and theme blocks; not worth a correction beyond "count from the file" | `theme/mco-theme.css:132-292` |
| 1.2 | Use `--accent-light` for text on dark | Same hex, but the contract token is `--accent-line` | HOUSE-STYLE §2 |
| 1.3 | One API, 22 paths (lists 18) | **Two APIs** (legacy on `mesonet.`, new on `mesonet2.`). mesonet2 has 22 paths; the brief's list omits `/observations/{hourly,daily,flags,grouped}/`. Legacy has 21. Plus ~20 hidden routes (`/stations/maintenance/live/`, `/stations/status/live/` …) | `mesonet-db-rds/api/app/app/main.py:500-2438`; live `openapi.json` |
| 1.3 | CORS open | Confirmed: `*` at API Gateway (`terraform/apigateway.tf:74-86`), Caddy for legacy. **Add: 30 s gateway timeout** — long-range queries fail by design | `apigateway.tf:97` |
| 1.3 | (implied) API reachable | `mesonet.climate.umt.edu` resolves to a **private IP on campus** (split horizon); mesonet2 is public CloudFront. Prefer mesonet2 for browser fetches | §4 Q9 |
| 1.4 | Dashboard at `/dash/next/` | Correct path, but repo layout changed: `web-next/` became `web/` on 2026-10-12 (`b2a1cf9e`); `/dash/` is still the legacy Dash app; canonical is **github.io**, against HOUSE-STYLE §1 | `mesonet-dashboard/web/index.html:60,65` |
| 1.4 | All tools have header/main/h1/canonical/OG | Mostly true; **none of the map tools has a `<footer>`** (dashboard does); dashboard canonical wrong; **UMRB's sr table is hand-built** | §3.1 |
| 1.4.1 | D³ theme control is basemap-only | Also has a real 3-theme `data-theme` strip; no persistence or OS default | §4 Q7 |
| 1.4.2 | `hhp.climate.umt.edu` doesn't resolve; HHP products are D³ layers only | Also **`streamflow.climate.umt.edu`** is live, embedded by `mco-website/_pages/streamflow.md:12,14`; owner repo unknown | live; `mco-dns/terraform/records.tf:75` |
| 1.4.3 | 152 stations with cameras | **165**; 152 is the stale mesonet2 tree | §4 Q6 |
| 1.4.3 | API returns E/N/S/W/SNOW | Also NS, SS (and enum `g`); plus the pipeline's NSNOW/SSNOW/PLUVIO/SOLAR/PARK | §4 Q3 |
| 1.4.3 | Explorer picker 9 AM / 3 PM only | That is the **Photo Explorer**, and it offers 9 / 12 / 3 from data | §4 Q1 |
| 1.4.3 | Unlisted hour silently snaps to 3 PM | Rolls to the next scheduled slot, **with a toast** | `docs/app.js:313-340` |
| 1.4.3 | No endpoint lists capture times | True for the API; **static manifests and `schedule.json` on data2 do**, and the dashboard uses them | §4 Q2 |
| 1.4.3 | Owner: three a day, moving to hourly | Three a day confirmed; hourly was a 10-day pilot, nothing scheduled | §4 Q1 |
| 1.4.4 | Hand-maintained Markdown, "Permalink"/"Read Article" ×12 | Liquid loop over **`_data/publications.yml` (9 entries, each with a DOI)**; 9× "Read Article", **0× "Permalink"**. Unsplash heroes are on **23 pages**, not just research | `mco-website/_pages/research/research.md:26` |
| 1.4 | `/umrb/?cell=<id>` | Correct; cell ids normalize as e.g. `H-8` | `mesonet-umrb-build/app.js:412` |
| 1.5 | Figures from `/stations/status/` | `/stations/status/` is the **AirTable build registry** (311 rows: active 255, candidate-27 38, decommissioned 16, inactive 2). Health and reporting come from `/latest` + `/elements` computed in the status app | `mesonet-db-rds/.../crud/queries.py:582-609` |
| 1.5 | Health 220 / 31 / 2 | 218 / 33 / 2 on 22 Oct — normal drift; the method is the point | recomputed from app logic |
| 1.5 | 10 co-located sites | 10 **pairs** (20 stations); computed client-side, no API field | live |
| 1.5 | Maintenance overdue 0 | 0 only by the app's rules; the feed's own `compliance_state` says **41** (37 AgriMet + 4 not in `/stations`) | `mesonet-maintenance/app.js:244-264` |
| 1.5 | UMRB operational 187 | With the app's rules on its 205-cell grid: **167** operational, 37 pending 2027, 1 available. 187 + 37 + 1 exceeds the grid. **Unsure** where 187 came from | `mesonet-umrb-build/data/mt_grids_simple.geojson` |
| 1.6 | Five h1, no main/header, untitled iframes, FontAwesome `@latest`, MathJax 2.7.6, Lunr, drought image 01-23-2024, dev notes, "distiribute" | **All confirmed.** FontAwesome `@latest` is injected by the **unpinned remote theme** (`_config.yml:45`), not repo code; typo at `_pages/climate.md:15`; dev notes are three posts (`2022-08-05-envirocam-setup`, `2022-08-19-backup-neo4j`, `2023-10-27-utm-arcgis`) | `mco-website` |
| 1.6 | Footer has no contact details | The contact block exists but is **commented out** (`_includes/footer.html:21-25`) | — |
| 1.6 | 420 px nav hides 7 of 8 links | Not reproduced (greedy-nav with 8 items confirmed) | Unsure |
| 1.6 | `umt.edu/climate` competes | It already **301s to `climate.umt.edu`** | live |
| 1.6 | Iframe intermittently fails | Two of the three iframes hit the on-prem `mesonet.` host (`/photos`, `/api/v2/map/stations/`); plausible cause, unconfirmed | `mco-website/index.md:13,22,30` |

### 6.2 Parts 2–5 — claims about the stack

| § | Brief says | Code says |
|---|---|---|
| 2 | Astro "matches Sustainable FSA" | Sustainable FSA is **Jekyll + Tailwind**. There is no Astro project anywhere under `~/git`. Astro is still a fine choice; the precedent claim is wrong |
| 2 | Pages CMS "proven on NGP-RIDR" | True (NGP-RIDR is **Eleventy**), and **`mco-website` already has a `.pages.yml`** (posts + team; `_pages/` excluded as "too risky") |
| 2.1 | Project-pages fallback `mt-climate-office.github.io/mco-website-next/` | Works, but is public like everything else on Pages (Q10) |
| 3.0 | 62 exports | Correct count. The group table omits `initSegmentedFallback` |
| 3.0.1 | "Photo controls live in the Explorer's `app.js`" | They live in the **Photo Explorer's** `docs/app.js`; the Explorer has a carousel |
| 3.0.1 | Default North | Photo Explorer defaults to **West**; historical "North" is the rain gauge |
| 3.1 | `MCO.versions` (listed) | Reports `'0.1.0'` for core, map and palette at v0.13.1 — stale strings in the kit; not usable to detect the loaded version |
| 4.5 | `NetworkStatusBar` from `/stations/status/` | Wrong source (see §1.5 row) |
| 4.7 | Retype or automate | `_data/publications.yml` is already a DOI list — seed option 1 from it. No Zotero library or office `.bib` exists (`mco-briefings/templates/mco.csl` is a style only) |
| 5 | Skip link to `#main-content` | Kit convention is `#main` |
| Perf | `font-display: swap` | Kit uses `block` + preload, deliberately |
| 7 Q9 | Is Listmonk staying? | Listmonk 6.1.0 runs on Lightsail at `lists.climate.umt.edu`, SES approved 2026-10-02. **The public "MCO News" list is not created yet**; the site has no signup form; the newsletter workflow (`send-newsletter.yml`, `email:` front matter) is designed to live in the website repo, so the Astro repo inherits it |

---

## 7. Other findings the brief does not cover

Each of these is outside the brief's scope. **I have not acted on any of
them**; several need your decision.

1. **The live camera schedule depends on unpushed work.** `schedule.json`'s
   `source.git` is `e770121`, on local branch `eight-view-plan` in
   `mesonet-cameras`: 44 commits ahead of `main`, on no remote. That
   worktree also has an uncommitted `data/MASTER_POSITIONS.csv`. If this
   machine is lost, so is the code behind the live schedule.
2. **The maintenance feed publishes staff names and field comments.**
   `/api/v2/stations/maintenance/live/` (CORS `*`, 784 KB) carries
   `visits[].inspected_by`, free-text comments and AirTable photo URLs. Intended?
3. **mesonet2 photo routes are broken** (Q2). Anything that switches to
   mesonet2 photo URLs gets 406s.
4. **UMRB writes `mco-status-*` localStorage keys**
   (`mesonet-umrb-build/app.js:250,259,391,398,1404,1431`), colliding with
   Status on the shared origin: seeing one intro suppresses the other, and
   label/legend preferences bleed across. Violates HOUSE-STYLE §4.
5. **`mesonet-status` has uncommitted changes** (dated 2026-10-20) that revert
   the committed AgriMet ring/fill marker fix (`4dce4c3`, kit issue #56).
   Stale tree or intended revert?
6. **Snowpack's Stadia and MapTiler keys** remain in public git history
   (`a8f3534`, `ce528d9`). Revocation at the vendors is not recorded anywhere.
7. **Unpinned dependencies in live properties**, contrary to the "never
   unpinned" rule: Minimal Mistakes remote theme → FontAwesome `@latest`
   (climate.umt.edu); `hyparquet@1` via esm.sh (Snowpack); `topojson-client@3`
   and no SRI anywhere (D³); `alpinejs@3.x.x` and `d3@7` (EcoRestore);
   `chart.js@4` (NGP-RIDR); unpkg Leaflet (streamflow).
8. **HTTPS gaps:** `d3drought.org` does not enforce HTTPS; `www.climate.umt.edu`
   fails TLS.
9. **mesonet-gateway's certificate expires 2027-01-21 and does not auto-renew**
   (`mesonet-gateway/terraform/terraform.tfvars:26-29`).
10. **API deploys are manual and push `:latest`** (`mesonet-db-rds/.github/workflows/deploy.yml:7-8`).
11. **`mco-web-style/CONSUMERS.md:211` is stale** about the dashboard
    (`web-next/`, `/mesonet-dashboard/next/`). Docs fix for the kit repo, not
    done.
12. **Jekyll post URLs contain spaces and categories**
    (`/montana%20drought%20&%20climate/newsletter/update/2026/07/07/…`), and
    nav links to three `gdds/*` pages that do not exist. The Phase 5 redirect
    map needs every post URL. The live sitemap (65 URLs) is saved at
    `/private/tmp/claude-502/-Users-kyle-bocinsky-git-mt-climate-office/4ea1d49e-4f93-41cc-a79a-80602fea929c/scratchpad/live/sitemap.txt`
    (temporary; copy it if you want to keep it). `/mesonet/funding_draft/` is
    a draft that is live.
13. **Three brand blues remain**: kit `#1a6faf`, Jekyll `#08729e`, mailing
    lists `#52adc8` (`mco-mailing-lists/email/newsletter.mjml:26,40,68`).
14. **Four local clones are behind their remotes** (`mco-drought-indicators`,
    `mco-drought-conus`, `usdm-archive`, the old `ngp-ridr/website` clone).
    Findings for those repos were checked against `git ls-remote` and live
    sites, not the stale clones.

---

## 8. Decisions needed from you before Phase 1

Grouped by when they block. Part 7 of the brief still stands; these are
additions or sharpened versions.

**Blocks Phase 1**
1. Consumption strategy given §2: CDN pin + SRI (house convention) or
   vendored build (needs a HOUSE-STYLE line). Which kit version — I'd start at
   0.13.1.
2. Staging: accept obscurity, or put staging behind auth off Pages (Q10).
3. Send the UM IT DNS ticket for `next.climate.umt.edu` (public + internal
   view), and the domain-verification TXT record while you're at it.
4. Release policy for the kit (Q4 proposal).

**Blocks Phase 2–3**
5. Health and compliance figures: a server-side summary endpoint in
   `mesonet-db-rds`, or a shared client module? (The website should not be a
   third copy.)
6. Photo data: read data2 directly, or add `/photos/{station}/times/` — and
   fix mesonet2's photo routes either way.
7. Direction rules: public N/E/S/W only; what to do with pre-2026-10-21
   "North"; where snow/pluvio/solar go.
8. Extract the dashboard's place search, conditions summary and photo modules
   into the kit (each needs its own versioned kit release, and touches the
   dashboard).

**Not website work, but surfaced**
9. Push `eight-view-plan` (§7.1).
10. Maintenance feed personal data (§7.2).
11. UMRB localStorage keys (§7.4) and the uncommitted Status diff (§7.5).
12. Revoke the Snowpack keys if not done (§7.6).
13. Who owns `streamflow.climate.umt.edu`?

---

## 9. Open uncertainties

- Whether the mco-dns Route 53 zone is applied and whether the delegation
  request went to UM IT (SSO token expired; direct NS queries timed out).
- Owner repo of `streamflow.climate.umt.edu`.
- The brief's UMRB "187 operational".
- Whether the Explorer carousel shows PARK / SOLAR / PLUVIO frames publicly
  (code does not filter them; not checked in a browser), and whether the
  Photo Explorer shows NSNOW / SOLAR with raw labels.
- Whether `latest.csv` on data2 is meant as a public contract.
- How the dashboard's `openapi.d.ts` was generated (no script for it).
- Whether the deployed on-prem Caddyfile matches the repo exactly (behavior
  matched on every path tested).
- The 420 px greedy-nav behavior on the Jekyll site.
- Whether D³'s HHP layers reading `*_test` shares is deliberate.
- GitHub issues were not reviewed for the API, so open defects beyond those
  in repo docs may be missing.

---

## 10. Method

- Read in full: the brief, `CLAUDE.md`, `mco-web-style/{HOUSE-STYLE,AGENTS,CONSUMERS,README}.md`,
  and the kit's `core/mco-core.js` theme and URL-state sections, snippets and
  changelog. Kit token values were diffed against brief §1.2.
- Five read-only audit agents covered: photo tools and the camera pipeline;
  dashboard, status, maintenance and UMRB; the APIs, gateway and Caddy; Snowpack,
  D³ and project sites; the Jekyll site, DNS and mailing lists. Their key
  claims are cited to file and line above; where two agents overlapped (photo
  schedule, counts, `/stations/status/`), their answers agreed.
- Side effect outside the repos: one memory note was corrected (it recorded
  MapLibre 5.x as the house pin; the kit is on 6.11.2).
- Content in this report was drafted with AI assistance and needs MCO staff
  review before it informs anything public, per UM's AI disclosure standard.
