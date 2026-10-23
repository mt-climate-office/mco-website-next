# Decisions — climate.umt.edu rebuild

Decided by R. Kyle Bocinsky, 22 October 2026, against
`docs/phase-0-report.md`. These are settled. Reopen them explicitly if
circumstances change; do not quietly reinterpret them.

---

## D1 — Design system consumption

**Pinned jsDelivr tag + SRI + `crossorigin`, per `HOUSE-STYLE.md`.** Start at
**v0.13.1**. Favicons and `og-card.png` hot-linked from the pinned tag.

The website is an ordinary kit consumer, not a special case. Do not vendor,
do not add a `package.json` to the kit, do not self-host the fonts — the kit
uses `font-display: block` plus preload deliberately, and that behaviour
travels with the published bytes.

*Supersedes the rebuild plan's "Option 1 preferred".*

## D2 — Staging access

**Obscurity, not enforced access control.** `next.climate.umt.edu`, unlinked,
`noindex, nofollow`, `robots.txt Disallow: /`, no sitemap, canonicals pointing
at `climate.umt.edu`.

Recorded plainly: GitHub Pages on the org's Team plan cannot restrict access.
Anyone with the URL can read staging. This is accepted, not mitigated.

## D3 — Kit release policy

**Accepted as proposed in the Phase 0 report §4 Q4:**

- Consumers may trail by MINOR versions.
- Any security fix moves every consumer within a week.
- A MAJOR release ships with the consumer PRs ready.
- The website joins the canary matrix once it exists.

Add `mesonet-aq` to the canary workflow as well — it is currently missing.

## D4 — Maintenance compliance figure

**Unresolved. Needs investigation.** The maintenance app's rules give 0
overdue; the feed's `compliance_state` gives 41 (37 AgriMet + 4 absent from
`/stations`).

Until this is settled, **no compliance figure is published anywhere** — not in
the footer, not on `/mesonet/status/`, not in the mockups. See D10.

**Resolved 22 Oct 2026 (D15):** the maintenance app's rules are the
definition. The figure stays unpublished until the API's `compliance_state`
no longer contradicts them.

## D5 — Where compliance and health are computed

**A new repo, `mesonet-compliance`**, holding the ruleset as versioned,
importable code. Not a server-side endpoint, not a third client copy.

**Addition agreed in discussion:** the same repo runs the ruleset on a
schedule and publishes a small summary JSON to `data2.climate.umt.edu`.
Clients needing detail import the rules; clients needing a headline number
read the summary file.

Rationale: the maintenance feed is 784 KB. A sitewide footer line cannot
compute from raw data on every page load. One ruleset, one set of answers,
2 KB on the homepage.

## D6 — Photo capture times

**Read `data2.climate.umt.edu` directly for now** — `photos/schedule/schedule.json`
and `photos/manifest/{sta}_{YYYY-MM}.csv` — as the dashboard already does.
Add `GET /photos/{station}/times/` later if a second consumer wants it.

Independent of the website: **mesonet2's photo routes are broken** (reading a
storage tree retired 2026-09-20, returning 406). They need porting to the new
layout. Keep `photos/schedule/arrivals.json` fresh or retire it.

## D7 — Historical photo directions

**Clamp the public default to dates on or after 2026-10-21.** Before that
date, "N" was preset 1 aimed at the pluviometer and "S" at the snow stake, so
a North default on an older date shows a rain gauge.

The homepage hero defaults to North and the most recent capture, which is
always within the clean range.

**Amended 22 Oct 2026 (D15):** the re-aim took effect at **2026-10-21 16:00
MDT** for all 165 cameras (`schedule.json`), after that day's last slot, so
the first clean date is 2026-10-22.

**Corrected 22 Oct 2026 (D16):** the clamp applies to the **website's
photo hero only**. The Photo Explorer and the Station Dashboard keep the
full public history in every direction, including pre-cutover North and
South, as they showed before. An earlier amendment applied the clamp to
every public surface; that misread the owner's answer and was never
deployed.

## D8 — Snow, Pluvio and Solar views

**Staff-only, as today.** Behind `?internal=1` in the Photo Explorer. Not on a
public station detail page.

Follow-up for the Photo Explorer, not the website: **NSNOW and SOLAR are
currently unhandled** and may be rendering publicly with raw tokens. Someone
should open a browser and check.

## D9 — Kit extractions

**All three approved:** the dashboard's photo modules, place search, and the
plain-language conditions summary move into `mco-web-style`.

Each is its own versioned kit release and each requires retrofitting the
dashboard. Sequence them; do not bundle. Photo modules first — the website
needs them soonest.

## D10 — Public network figures at launch

**Publish:** station count; reporting count and percentage; the health split
(operational / partial sensor outage / total outage).

**Do not publish:** maintenance compliance, pending D4.

The health split includes the partial-outage figure (~12%). Publishing it is
deliberate. It needs one plain-language line on the page explaining that
partial means one sensor of several is down and the station is still
reporting — otherwise it reads worse than it is.

**Amended 22 Oct 2026 (D15):** the line follows the ruleset, which counts a
station as partial when any expected sensor is silent: "A station with a
partial sensor outage is still reporting. At least one of its sensors is
not." Percentages are floored, so 100% means every station reported.

## D11 — Newsletter

**Create the public "MCO News" list in Listmonk and ship the footer signup at
launch.** The list does not exist yet; creating it is a prerequisite, not a
website task.

The existing newsletter workflow (`send-newsletter.yml`, `email:` front
matter) is designed to live in the website repo, so `mco-website-next`
inherits it.

## D12 — UMRB operational count

**167.** Confirmed against the live legend. The rebuild plan's 187 was a
misreading; there is no discrepancy in the tool.

**General correction:** two figures in the plan's Part 1 were misread from
screenshots — HydroMet 165 as 185, and UMRB 167 as 187. Treat every
screenshot-derived figure in the original brief as unverified. Prefer the
Phase 0 report and the API.

---

## Still open

Not decisions, but things that need an owner before they are forgotten.

| # | Item | Why it matters |
|---|---|---|
| O1 | **Push `eight-view-plan`** in `mesonet-cameras` — 44 commits, no remote, plus an uncommitted `MASTER_POSITIONS.csv` | The live camera schedule is generated from code that exists on one laptop |
| O2 | **Staff names and field comments** on the open `/stations/maintenance/live/` endpoint (CORS `*`) | Employee information published by default rather than by decision |
| O3 | **Snowpack's Stadia and MapTiler keys** in public git history | Revocation not recorded anywhere |
| O4 | **`mesonet-gateway` certificate** expires 2027-01-21, no auto-renew | Blocks the CloudFront cutover |
| O5 | **Verify `climate.umt.edu` for the org** (TXT record via UM IT) | Unverified today; there is a claimable window at cutover |
| O6 | **DNS ticket for `next.climate.umt.edu`**, public *and* internal view | Split-horizon DNS: without the internal record, campus and VPN users cannot reach staging |
| O7 | **Owner of `streamflow.climate.umt.edu`** | Live, embedded by the current site, no org repo claims it |
| O8 | **UMRB writes `mco-status-*` localStorage keys** | Collides with the Status app on the shared origin |
| O9 | **Uncommitted changes in `mesonet-status`** dated 2026-10-20 | Reverts a committed marker fix; stale tree or intended? |

---

## D13 — `.pages.yml` is generated from the schema

**Added 22 October 2026.**

One field definition (`src/content/_fields.ts`) produces both the Zod schema
Astro validates against and the Pages CMS field config. `.pages.yml` stays
committed — Pages CMS reads it from the repo — but is never hand-edited. CI
runs `check:cms`, which regenerates in memory and fails if the committed file
is stale.

**Not by Zod introspection.** `z.string()` does not say whether it is a text
input, a textarea, an image path or a slug; `.refine()` is a closure and
cannot be parsed; and the CMS needs a `body` field that is not in the Zod
schema at all. One definition emitting both outputs avoids all three.

**Cross-field rules stay build-only.** Pages CMS cannot express "imageAlt is
required when image is set". Each collection carries a `refineNote` that the
generator writes into the CMS description, so editors are told the rule even
though only the build enforces it.

Reference implementation: `docs/examples/cms-codegen/`.

---

## D14 — CMS: Pages CMS, reconsidered against Keystatic

**Reviewed 22 October 2026**, after the owner raised Keystatic and noted the
other MCO sites might also move to Astro.

**Outcome: stay on Pages CMS.** The original reason — Keystatic has no story
for Jekyll or Eleventy — would stop applying if the estate moves to Astro.
These are the reasons that survive that.

**Keystatic's real advantage, conceded:** its config is TypeScript and its
reader API can replace Astro content collections, so schema and CMS config
become one file. D13's generator exists to solve a problem Keystatic does not
have. If Keystatic were mature this would be the better choice.

**Why not yet:**

- Its own README still describes the project as experimental; it is on 0.6.x
  with no 1.0.
- Open issues from Aug–Sep 2026 concentrate in the save path — a Markdoc field
  dropping escapes so a paragraph beginning "2026." returns as a list; a
  body-only edit deleting `index.json`; `fields.date()` truncating a
  frontmatter value carrying a time; an array save wiping sibling fields on
  Keystatic Cloud.
- `@keystatic/core` depends on `y-provider`, which **declares no licence**
  (open issue, Sep 2026). At a university this is a procurement blocker, not
  a footnote.

**Pages CMS for comparison:** v2.1.8 (June 2026), MIT, ~55 open issues against
Keystatic's ~170, and explicitly supports Jekyll, Hugo, Eleventy, Next, Astro
and others — so it stays correct whether or not the estate moves.

**Revisit when Keystatic reaches 1.0 and the licence issue closes.** Note it
in the next annual review rather than treating this as permanent.

### Two requirements this review surfaced

**1. `settings.content.merge: true` is mandatory.** Without it Pages CMS
writes back only the fields its config lists and silently deletes the rest of
the file on save; a reported case lost 131 lines in one save. It is now in the
generator's `STATIC_CONFIG` marked do-not-remove.

This also strengthens D13: generating `.pages.yml` from the schema guarantees
the config lists every field, so the two mechanisms cover each other.

**2. Hosted.** `app.pagescms.org`, the free hosted service. Decided 22 Oct
2026. No PostgreSQL, no GitHub App to run, no migrations to own.

The trade accepted: a third party holds write access to MCO repositories.
Three things follow from that, and they are not optional.

- **Scope the GitHub App installation to `mco-website-next` alone.** Not the
  org, not "all repositories". Least privilege (NIST CSF, Protect). If other
  sites adopt Pages CMS later, add them one at a time.
- **Tell UM IT.** A third-party integration with commit rights on university
  repositories is the kind of thing that should be on record before it is
  discovered, not after. It is unlikely to be refused; it is likely to be
  asked about.
- **Review who has access, periodically.** Pages CMS access is granted per
  person against the repo. Staff leave. Put it on the same cadence as any
  other account review.

### Also worth knowing

- Saves commit immediately and sequentially; concurrent edits by different
  people can conflict. Fine for serial editorial work, which is what this is.
- There is no built-in draft/publish workflow — hence the `draft` boolean in
  the schema.

---

## D15 — Second round, after the Phase 1.5 drafts

**Decided 22 October 2026**, against the worker reports on
`mesonet-compliance`, the MCO News list and the kit's `MCO.photos` draft.

**Compliance (D4, D5).**
- The maintenance app's rules define compliance. Fix the API's
  `compliance_state` to agree or remove it; until then the figure is not
  published, and **the summary JSON omits the maintenance section entirely**
  (it sits at a public URL, so a flag would not hide it).
- `mesonet-compliance` is a **public** repo. The 15-minute job runs on
  **EventBridge + Lambda** in `mco-aws`, with a missed-run alarm, as
  `mesonet-aq` and `mesonet-power` do. Not a GitHub Actions cron.
- Reporting percentage is **floored**.

**Homepage.**
- The conditions card shows its empty state (a link to the Station
  Dashboard) until place search ships in the kit. No default station.

**Photos (D7, D9).**
- Public direction order is **N, E, S, W**.
- Staff-view labels for pre-cutover N and S stay "North" and "South".
- The dashboard adopts `MCO.photos` by loading the pinned kit file; its
  vitest suite loads the same file. No TypeScript copy.
- `MCO.photos` ships as a full kit release (0.14.0) with the Photo Explorer
  and dashboard retrofit PRs ready (D3).

**Newsletter (D11).**
- List description: "Posts from climate.umt.edu by email, including the
  Montana Drought & Climate update. Every message has an unsubscribe link."
- Anti-abuse: the honeypot plus a Caddy rate limit on the Listmonk host; the
  form stays JavaScript-free.
- Postal address everywhere: W.A. Franke College of Forestry & Conservation,
  University of Montana, Missoula, MT 59812.
- The newsletter renderer is **ported into `mco-website-next`**, with pinned
  dependencies, not checked out from the private `mco-mailing-lists`.

---

## D16 — Photo history stays in the tools

**Decided 22 October 2026**, correcting D15's reading of D7.

- The 2026-10-22 public start (the kit's default) applies to the
  **website's photo hero** only.
- The Photo Explorer and the Station Dashboard show the **full public
  history**, all four directions, including pre-cutover North and South
  (then aimed at the rain gauge and the snow stake), exactly as before.
- The kit keeps its clamped default and gains an opt-in for full history
  (`MCO.photos`, v0.15.0, MINOR). The tools pass it; the website does not.
- The dashboard's photo tile follows the Photo Explorer.
- As built (kit v0.15.1): the hero calls `MCO.photos.load()` with no
  options, at build time (`src/lib/photo-snapshot.ts`) and in the page
  (`src/scripts/photo-hero.ts`).


---

## D17 — CI tiers

**Decided 22 October 2026.** CI was too heavy for every pull request; keep
the protection, tier it.

- **Expensive checks run where they protect a deploy or a release.** Push to
  main, the nightly rebuild and manual runs get the full set before deploy:
  the kit verify harness in Chromium and WebKit, Lighthouse on every page,
  median of 3 runs. Deploy still needs it to pass.
- **Pull requests** get every cheap gate, the harness in Chromium only, and
  Lighthouse on the homepage, median of 3 runs (one run proved too noisy:
  89 against a median of 96). Budgets are unchanged (accessibility 100,
  performance ≥ 90, homepage JS < 150 KB gzipped).
- **WCAG axe still runs on every PR**, in all three themes at both widths.
- The scripts default to the full set, so a local `npm run verify` or
  `npm run lighthouse` does everything. CI narrows them with
  `VERIFY_ENGINES`, `LH_PAGES` and `LH_RUNS`.
- Playwright browsers are cached per Playwright version, and the download and
  apt steps each carry a timeout, so a hung mirror fails in minutes under a
  step name that says which.
- **Engines run in parallel** (D19, 23 October 2026). One `build` job runs
  the cheap gates and uploads `dist/`; a `verify` matrix runs one job per
  engine against it (PRs `[chromium]`, the full tier `[chromium, webkit]`),
  each with its own browser cache. Lighthouse runs in the Chromium job.

---

## D18 — Homepage CSP allows inline style attributes

**Decided 22 October 2026**, merging the photo hero (PR #10).

- The homepage's meta CSP adds `style-src-attr 'unsafe-inline'`, set only
  through the `photos` option in `src/kit/csp.ts`. WebKit draws the native
  `<select>` that `MCO.initPhotoControls` uses for the time menu with inline
  style attributes; without this it logs a CSP error on every load and the
  control renders 21 px tall, under the 40 px target.
- It allows style attributes only, not `<style>` elements, and applies to no
  other page.
- **Remove it** when the kit's photo controls offer a time control that is
  not a native `<select>` (for example the segmented buttons already used for
  direction). Raise that at the kit's next photos change.

---

## D19 — Morning-after decisions

**Decided 23 October 2026.**

- **`bozmtest` stays public.** "Bozeman Test" is a real station in
  `/stations/`; the website shows it like any other.
- **Search Escape order follows the kit** everywhere. The dashboard drops its
  local shim (close-and-restore, then clear).
- **CI:** the website's full tier runs Chromium and WebKit as a parallel
  matrix; the kit's verify harness retries a failed scenario once, so a
  transient network error does not fail a deploy (kit PATCH).
- **Tools move to the current kit together:** Explorer, Photo Explorer,
  Status, Maintenance, UMRB, Snowpack, Air Quality and the dashboard, each
  verified and merged when green.
- **Next builds, in parallel:** the plain-language conditions summary (kit
  extraction #3, D9), the publications portal (rebuild plan §4.7), and the
  Phase 5 redirect map.
- **Camera North view:** left as is; the homepage hero keeps North.
- **MCO News:** the owner runs the bootstrap script; the footer signup is
  wired once the list's UUID exists.

---

## D20 — The website repo is public

**Decided 23 October 2026.**

`mt-climate-office/mco-website-next` is public. GitHub Actions had stopped
starting jobs on the private repo ("recent account payments have failed or
your spending limit needs to be increased"), which blocked CI and staging
deploys; Actions minutes are free on public repos. Before the change the full
history was scanned (gitleaks, 40 commits, no findings; a credential pattern
search found nothing) and the repo had no Actions secrets or variables.

Consequences:
- Staging content was already public by design (D2); now the source is too.
- Newsletter credentials stay Actions secrets, never files.
- The website can join the kit's canary matrix (D3).
- Staff and partner content comes from the current public site (owner,
  23 Oct 2026).
