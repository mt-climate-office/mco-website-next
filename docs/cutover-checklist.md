# Cutover checklist — climate.umt.edu

The runbook for rebuild plan Part 6, Phase 5 (items 15–23): moving
`climate.umt.edu` from the Jekyll site (`mt-climate-office/mco-website`) to
this repo. Written 23 Oct 2026 from a production dry run (below) and a
read-only look at both repos' Pages settings and DNS. Nothing live was
changed to write it.

**Who.** **Owner** is R. Kyle Bocinsky, or whoever he names. **UM IT** is
`dns-admin@umontana.edu`. **Claude** prepares PRs and runs checks, and
merges or changes settings only when the owner asks.
**Undo** says whether a step can be reversed, and how.

## What actually moves

- **DNS does not change on launch day.** `climate.umt.edu` is already a
  CNAME to `mt-climate-office.github.io.`, and so is `next.climate.umt.edu`.
  Both repos publish through the org's Pages host. The switch is two GitHub
  settings changes: remove the custom domain from one repo, add it to the
  other.
- **A Pages site has one custom domain.** When `climate.umt.edu` replaces
  `next.climate.umt.edu` in this repo's settings, staging stops serving at
  that moment. Only its DNS record is left to retire (step F3).
- **The first minutes serve the staging build.** Pages serves whatever
  artifact this repo last deployed. That artifact was built for the staging
  origin, so `climate.umt.edu` shows `noindex` and `Disallow: /` until the
  deploy in step D5 finishes, about 25 minutes plus the wait for the
  certificate. The pages are complete and canonicals already name
  `climate.umt.edu`, so visitors see nothing wrong. Crawlers that call in
  that window are told to wait. Google caches `robots.txt` for up to a day,
  so crawling may pause for a day. Pages are not dropped. Schedule the
  switch outside working hours to keep the window quiet.
- **Current state, 23 Oct 2026** (`gh api repos/mt-climate-office/<repo>/pages`):
  `mco-website` is a `legacy` build from `gh-pages` `/`, `cname`
  `climate.umt.edu`, HTTPS enforced, certificate for `climate.umt.edu` only
  (expires 2027-01-20). `mco-website-next` is a `workflow` build, `cname`
  `next.climate.umt.edu`, HTTPS enforced. Both report
  `protected_domain_state: unverified`. This repo is **private**.

## Dry run, 23 Oct 2026

Built exactly as the deploy job builds once Pages reports the production
origin:

```sh
SITE_ORIGIN=https://climate.umt.edu BASE_PATH=/ npm run build
EXPECT_INDEXABLE=1 BASE_PATH=/ npm run check:built
npm run check:html
BASE_PATH=/ npm run check:redirects -- --strict
BASE_PATH=/ npm run check:redirects -- --live
```

| Check | Result |
|---|---|
| Pages built | 342 HTML files: 287 indexable, 54 redirect pages, `404.html` |
| `noindex` | On the 54 redirect pages and `404.html` only. None elsewhere |
| `robots.txt` | `Allow: /` and `Sitemap: https://climate.umt.edu/sitemap.xml` |
| `sitemap.xml` | **Did not exist before this change.** Added: 287 URLs, every indexable page (homepage, 2 about, accessibility, conditions, drought, 257 under `/mesonet/` including station pages, 12 news, 11 research, search) |
| Canonicals | All on `https://climate.umt.edu/`, except the 9 redirect pages that leave the site, whose canonical is their external target (by design) |
| `next.climate.umt.edu` in output | None |
| `check:built` (indexable) | Pass, 342 pages |
| `check:html` | Pass |
| `check:redirects --live` | Pass. 65 of 65 URLs in the old site's live sitemap covered |
| `check:redirects --strict` | **Failed: 25 entries carried a `todo`.** All cleared by 24 Oct 2026; passes since (P2) |

Two fixes to the check machinery came out of it, in the same PR as this
document:

- `check:built` now checks `robots.txt` and `sitemap.xml` in both modes: a
  production build allows crawling, names the sitemap, and the sitemap lists
  exactly the indexable pages; any other build disallows everything and has
  no sitemap.
- `check:redirects --live` fetches `climate.umt.edu/sitemap.xml`. After
  cutover that is this site's sitemap, whose new URLs would all have failed
  as "no entry". It now recognises this site's sitemap, says so and skips,
  and the snapshot in `src/data/legacy-sitemap.json` stays the gate.

## Timeline at a glance

| When | What |
|---|---|
| T−14 days | UM IT ticket (P1). Decisions (P9) |
| T−7 days | Freeze new posts on the old site. Content and AI-disclosure review. Inbound-link PRs in other repos. Prepare the cutover PRs |
| T−1 day | Dry run again, `--strict` clean, `--live` re-checked, PRs green |
| T0 | Launch day, steps D1–D9, then verification V1–V8 |
| T+1 to T+7 | Search Console, watch 404s, `www` |
| T+7 | Retire `next.climate.umt.edu` DNS. Rename the repo if decided |
| T+30 | Archive `mco-website` |

---

## P — Pre-flight (before launch day)

### P1. UM IT ticket, one request — UM IT · T−14 · Undo: yes

Long lead, so send it first. Each record is in the **public view**; the
`www` change also needs the **internal view** (split-horizon DNS, phase-0
report §4 Q9).

1. **O5, org domain verification.** In GitHub, org Settings → Pages →
   Add a domain → `climate.umt.edu`. GitHub shows a TXT record named
   `_github-pages-challenge-mt-climate-office.climate.umt.edu` and a value.
   Ask UM IT to publish it, then press Verify. Verifying the domain also
   protects every subdomain, so a dangling `next.` or `www.` record cannot be
   claimed by another GitHub account. Do this before launch day. In the gap
   between removing the domain from one repo and adding it to the other, an
   unverified domain is claimable.
2. **Search Console domain property.** A Google `google-site-verification`
   TXT record on `climate.umt.edu`. A domain property covers `http`, `https`
   and `www` at once and needs no change to the site. First check whether the
   office already has a property for the old site (it ran GA4). If it does,
   keep it.
3. **`www.climate.umt.edu`.** It is a CNAME to `climate.umt.edu`. Over HTTP
   GitHub already redirects it to `https://climate.umt.edu/`. Over HTTPS it
   fails: the certificate names `climate.umt.edu` only. Ask UM IT to point
   `www.climate.umt.edu` at `mt-climate-office.github.io.` directly, in both
   views, **before launch day**. GitHub then has a chance to include `www`
   when it issues the new certificate in D3. **Unsure:** GitHub documents the
   `www` alternate name for apex domains. Whether it does the same for a
   subdomain custom domain like this one is unverified. If `www` still fails
   TLS at T+1 (V7), ask UM IT to delete the `www` record. Nothing in any repo
   links it (`docs/cutover-inbound-links.md`).
4. Do **not** touch `climate.umt.edu` or `next.climate.umt.edu` yet.
   `next.` goes at T+7 (F3).

### P2. Redirect map clean under `--strict` — Owner + Claude · T−7 to T−1 · Undo: yes

`BASE_PATH=/ npm run check:redirects -- --strict` must pass. **It passes
as of 25 Oct 2026**: 77 entries, none with a `todo`, 65 of 65 old sitemap
URLs covered. The 25 todos of 23 Oct were cleared by the method pages at
their old paths (#28), people, partners and projects (#29), the privacy
policy and user agreement (#23), and the owner's decisions on the donation
page, app page, streamflow and normals atlas (D23).

Re-run it in the final week. A new page at an old path changes its entry to
200; an entry that gains a `todo` fails the check again.

### P3. Freeze the old site — Owner · T−7 · Undo: yes

No new posts or page edits on `mco-website` from T−7. Anything published
there after the migration is lost at the switch. At T−1, run
`BASE_PATH=/ npm run check:redirects -- --live` after a build. It fails on
any URL in the old live sitemap that the map does not cover. If it finds
one, add it to the map, and refresh `src/data/legacy-sitemap.json` from the
live sitemap so the snapshot matches what the old site last served.

### P4. Content sign-off — Owner and MCO staff · T−7 · Undo: n/a

- Every page read by MCO staff, against `docs/VOICE.md`.
- **UM AI-disclosure review.** Much of the copy was drafted with AI
  assistance (rebuild plan Part 8). Staff review it before publication,
  per UM's AI disclosure standard. Record who signed off, and when, in
  the cutover PR.
- `/about/agreement/` and `/mesonet/app/privacy/` read correctly. Both
  APIs and the dashboard name the first as the data terms. App-store
  listings may name the second.
- `/accessibility/` is accurate, and its contact address works.

### P5. Inbound links in other repos — Claude (PRs), Owner (merge) · T−7 · Undo: yes

From `docs/cutover-inbound-links.md`. Re-run its search first, because new
links may have appeared since 23 Oct. **None link `next.climate.umt.edu`.**

**No change needed.** These keep working at cutover:

- `/about/agreement/` is now migrated at the same path (200), so the links
  stand: `mesonet-db-rds/api/app/app/main.py:123`,
  `mesonet_app/apiv2/app/app/main.py:111`,
  `mesonet-dashboard/web/public/data/MANIFEST.json:16`,
  `mesonet-dashboard/web/src/core/ag/data/vendor-static.mjs:104`.
- `/assets/images/MCO_logo_icon_only.png` is kept at the same path, because
  emails already sent show it. Links in
  `mco-mailing-lists/email/newsletter.mjml:34`,
  `mco-mailing-lists/listmonk/branding/campaign-template.html:31`,
  `mco-data-cdn/storage-browser/src/App.jsx:128`, and D³
  (`mco-drought-dashboard/docs/index.html:8231`, hands-off) keep working.
  Moving them to the kit's pinned logo is optional and not launch work.
- `/mesonet/` (tool footers, READMEs, `mesonet-gateway` redirect function,
  `mesonet_app/Caddyfile:198`) and the bare host (330 links) are unchanged.

**PRs needed before cutover.** The method pages kept their old paths
(#28), so the dashboard's links to `/mesonet/ag_tools/` and
`/mesonet/variables/` stand. One link is left (25 Oct 2026):

| Repo and file | Link | Change |
|---|---|---|
| `mesonet-dashboard/app/mdb/app.py:2579` (legacy Dash) | `/mesonet/funding_draft/` (404 at cutover) | Remove the link, or retire `/dash/` first. Its `/about/support/` link redirects to `/about/` (D23) and can stay |

**Optional, already broken today:** `mco-drought-conus/storage-browser/src/App.jsx:47`
and `mcor`, `mcor.data` READMEs link old logos that were 404 before
cutover. `mco-drought-indicators` Quarto docs set `site-url:
climate.umt.edu`, so its generated sitemap names pages that never existed.

**Outside the org:** partner sites, NOAA, DNRC, NIDIS and papers. The
redirect map covers every old sitemap URL. After launch, Search Console's
404 report (V8) shows anything else that still sends visitors.

### P6. Pages CMS — Owner · T−7 · Undo: yes

- The Pages CMS GitHub App is installed on `mco-website-next` **only**
  (D14). Tell UM IT about it before launch.
- Plan to remove `mco-website` from the app's installation at D2, so nobody
  edits the old site by habit. `mco-website` already has a `.pages.yml`.

### P7. Newsletter — Owner · T−7 · Undo: yes

- The **MCO News** list exists in Listmonk (D11, D19). Footer signup is
  wired once the list's UUID exists. **Decide** whether launch waits for it
  (P9).
- Confirm nothing else sends news posts by email after cutover. If the
  old Jekyll workflow or `mco-mailing-lists` sends posts, plan to switch it
  off at D8, when `NEWSLETTER_SEND_ENABLED` is set here.
  (`docs/newsletter.md`: until cutover a post's URL is the old site, so
  sends stay dry-run.)

### P8. Prepare the cutover PRs — Claude · T−3 · Undo: yes (revert)

1. **`mco-website-next`: "Cutover: production is indexable".** One line in
   `.github/workflows/site.yml`, the deploy job's `check:built` step:
   `EXPECT_INDEXABLE: '0'` → `'1'`, with its comment updated. CI on the PR
   runs the noindex verify build, so it passes. The production guard runs
   only in deploy. Do not merge before D4.
2. **`mco-website`: "Stop claiming climate.umt.edu".** Delete
   `cname: climate.umt.edu` from `.github/workflows/build-site.yml`
   (line 58 per phase-0 report §4 Q8; the last line of the deploy step).
   Without this, the next push to `main` deploys `gh-pages` with a `CNAME`
   file again and takes the domain back.
3. Run the dry run on the PR head and paste the result into PR 1.

### P9. Decisions the owner makes before launch — Owner · T−14

1. **Launch date and hour.** Off-hours, with the owner available for two
   hours after.
2. ~~**The P2 owner rows**~~: decided 24 Oct 2026 (D23).
3. **Newsletter signup at launch** (D11 says ship it at launch; the list
   UUID is the blocker).
4. **Analytics** (plan Part 7 Q8). The old site has GA4 on every page; this
   site has none. Launching without it ends the old site's traffic series.
   Adding it changes the CSP and needs a consent and privacy review.
5. **Search Console**: domain property via DNS (P1.2), or reuse an existing
   one.
6. **`www`**: fix (P1.3), or retire the record.
7. **Repo rename** (plan §2.1), below in R1.
8. ~~**Repo visibility.**~~ Public since 23 Oct 2026 (D20); the site joined
   the kit's canary on 25 Oct 2026 (mco-web-style #75).

---

## D — Launch day

Do these in order and do not skip ahead. Each step has a check.

### D0. Final checks — Claude · Undo: n/a

```sh
git switch main && git pull
npm ci
SITE_ORIGIN=https://climate.umt.edu BASE_PATH=/ npm run build
EXPECT_INDEXABLE=1 BASE_PATH=/ npm run check:built
BASE_PATH=/ npm run check:redirects -- --strict --live
```

All pass. The last deploy of `main` is green, and `next.climate.umt.edu`
serves the commit that is about to go live. If O5 is not verified yet (org
Settings → Pages lists `climate.umt.edu` as Verified), stop and wait for
it.

### D1. Stop the old site deploying — Owner · Undo: yes (Enable workflow)

In `mco-website` → Actions → "Deploy Jekyll site to GitHub Pages" →
**Disable workflow**. A push to its `main` can then no longer rewrite
`gh-pages`.

### D2. Remove the domain from the old site — Owner · Undo: yes (R2)

1. `mco-website` → Settings → Pages → Custom domain → **Remove**. GitHub
   deletes `CNAME` from `gh-pages`. The old site now answers only at
   `mt-climate-office.github.io/mco-website/`. Keep it published, because
   it is the rollback.
2. Merge P8 PR 2, which deletes `cname:` from `build-site.yml`. The workflow
   is disabled, so this deploys nothing.
3. Remove `mco-website` from the Pages CMS app installation (P6).

`https://climate.umt.edu/` now answers GitHub's 404. Move straight to D3.

### D3. Add the domain to this repo — Owner · Undo: yes (R2)

`mco-website-next` → Settings → Pages → Custom domain: replace
`next.climate.umt.edu` with `climate.umt.edu` → Save. The DNS check passes
at once because the CNAME already points at the org's Pages host.
`next.climate.umt.edu` stops serving now.

Wait for the certificate:

```sh
gh api repos/mt-climate-office/mco-website-next/pages \
  -q '{cname, https_enforced, cert: .https_certificate.state, domains: .https_certificate.domains, url: .html_url}'
```

Expected: `cname` `climate.umt.edu`, `cert` `approved`, and the domains
include `climate.umt.edu` (and `www.climate.umt.edu` if P1.3 worked). This
takes minutes, sometimes an hour. Then tick **Enforce HTTPS** and confirm
`url` is `https://climate.umt.edu/`.

The site sends HSTS for a year, so returning visitors' browsers insist on
HTTPS. While the certificate is pending, some of them may see a
certificate error. That is the main reason to switch off-hours.

### D4. Make production indexable — Owner (merge) · Undo: yes (revert)

**Only after `url` reads `https://…`.** `actions/configure-pages` reports
the origin from that value. If it still reads `http://climate.umt.edu`, the
build is not indexable and, with the flag at `'1'`, the guard fails the
deploy. That is safe, but it is wasted time.

Merge P8 PR 1. The push to `main` runs the full tier: build, Chromium and
WebKit verify, Lighthouse on every page, then deploy. About 25 minutes.

### D5. Watch the deploy — Claude · Undo: n/a

```sh
gh run watch "$(gh run list -R mt-climate-office/mco-website-next -w site -b main -L 1 --json databaseId -q '.[0].databaseId')" -R mt-climate-office/mco-website-next
```

The "Built pages are noindex" step (renamed by PR 1) passes with
`indexable`, and the log shows `sitemap.xml: N page(s)`. If the guard
fails, the site keeps serving the staging build. It is noindexed but
otherwise fine. Fix forward (usually the origin, D4) or roll back (R2).
Re-run only steps that died installing browsers or apt packages.

### D6. Verify — Claude · Undo: n/a

The V checks below, all of them.

### D7. Lighthouse and axe on production — Claude + Owner · Undo: n/a

CI ran axe in three themes at two widths and Lighthouse on every page
before deploying. Repeat on the live host: PageSpeed Insights (mobile) for
the homepage, a hub (`/drought/`), a content page (`/about/`) and
`/mesonet/status/`. Then a **manual keyboard and screen-reader pass** on the
same four pages (plan item 21).

### D8. Newsletter on — Owner · Undo: yes (unset)

Set the repository variable `NEWSLETTER_SEND_ENABLED` to `true`. Switch off
any other sender found in P7.

### D9. Announce — Owner

Tell staff, and partners if wanted. Never share a `next.` link. It no
longer works.

---

## V — Post-switch verification

Run from off campus and from campus or VPN (split-horizon DNS).

| # | Command | Expected |
|---|---|---|
| V1 | `curl -sI https://climate.umt.edu/` | `HTTP/2 200`, `server: GitHub.com` |
| V1 | `curl -sI http://climate.umt.edu/` | `301`, `Location: https://climate.umt.edu/` |
| V2 | `curl -s https://climate.umt.edu/robots.txt` | `User-agent: *` / `Allow: /` / `Sitemap: https://climate.umt.edu/sitemap.xml` |
| V2 | `curl -s https://climate.umt.edu/sitemap.xml \| grep -c '<loc>'` | The count in D5's log (287 on 23 Oct) |
| V3 | `curl -s https://climate.umt.edu/ \| grep -c 'noindex'` | `0` |
| V3 | `curl -s https://climate.umt.edu/ \| grep -o '<link rel="canonical" href="[^"]*"'` | `href="https://climate.umt.edu/"` |
| V3 | `curl -s https://climate.umt.edu/about/ \| grep -o '<link rel="canonical" href="[^"]*"'` | `href="https://climate.umt.edu/about/"` |
| V4 | `curl -s 'https://climate.umt.edu/mesonet/2026/05/15/montana-wind.html' \| grep -o 'http-equiv="refresh" content="[^"]*"'` | `content="0; url=/news/montana-wind/"` |
| V4 | `curl -s 'https://climate.umt.edu/montana%20drought%20&%20climate/newsletter/update/2026/07/07/mtdrought-and-climate-2026-June.html' \| grep -o 'url=[^"]*'` | `url=/news/mtdrought-and-climate-2026-june/` |
| V4 | `curl -sI https://climate.umt.edu/code/2022/08/19/backup-neo4j.html` | `404` (retired) |
| V4 | `curl -sI https://climate.umt.edu/about/agreement/` and `/mesonet/app/privacy/` | `200` both |
| V4 | `curl -sI https://climate.umt.edu/feed.xml` | `200` (feed readers keep working) |
| V5 | `curl -sI https://climate.umt.edu/no-such-page/` | `404` |
| V6 | `curl -sI https://next.climate.umt.edu/` | GitHub `404` (staging is gone) |
| V7 | `curl -sI https://www.climate.umt.edu/` | `301` to `https://climate.umt.edu/`. A TLS error means P1.3 did not take: follow its fallback |
| V8 | Every redirect, scripted (below) | No failures |

V8, every map entry against the live host (Node 24, no dependencies, from
the repo root). `HOST` defaults to production. On 23 Oct 2026 it passed,
75 of 75, against `npx astro preview` of the production dry-run build
(`HOST=http://localhost:<port>`).

```sh
node --input-type=module -e "
import data from './src/data/redirects.json' with { type: 'json' };
const host = process.env.HOST || 'https://climate.umt.edu';
let bad = 0;
for (const r of data.redirects) {
  const res = await fetch(host + r.from, { redirect: 'manual' });
  const html = res.status === 200 ? await res.text() : '';
  const refresh = html.match(/http-equiv=\"refresh\" content=\"0; url=([^\"]*)\"/)?.[1] ?? null;
  const ok = r.status === 410 ? res.status === 404
    : r.status === 200 ? res.status === 200 && !refresh
    : res.status === 200 && refresh === r.to;
  if (!ok) { bad++; console.log(res.status, r.from, '->', refresh, 'expected', r.status, r.to); }
}
console.log(bad ? bad + ' failed' : 'all ' + data.redirects.length + ' ok');
"
```

**Search Console** (Owner, T0 or T+1): add or open the `climate.umt.edu`
domain property (P1.2) and submit `https://climate.umt.edu/sitemap.xml`. Use
URL Inspection on the homepage and one news post to confirm Google sees
them as indexable. Over the next week, watch Pages → "Not found (404)" for
old URLs the map missed, and add them to `redirects.json`.

---

## F — Follow-up

### F1. `umt.edu/climate` — Owner · T+7 · Undo: yes

On 23 Oct 2026, `https://umt.edu/climate` answered **302** to
`https://www.umt.edu/climate`, which answered **301** to
`https://climate.umt.edu`. That is two hops, the first temporary (the
phase-0 report recorded a single 301). Nothing in this repo needs changing.
Optionally ask the UM web team to make `umt.edu/climate` a single 301 to
`https://climate.umt.edu/`, so search engines settle on the new site
sooner.

### F2. Keep the rollback ready — Owner · T0 to T+7

Until T+7, leave `mco-website`'s `gh-pages` branch, its Pages site (at the
github.io URL) and the `next.climate.umt.edu` DNS record alone. All three
are what R2 uses.

### F3. Retire `next.climate.umt.edu` — UM IT · T+7 · Undo: yes (new ticket)

Plan item 23, last on purpose. The Pages side went at D3. Ask UM IT to
delete the `next.climate.umt.edu` CNAME in **both** the public and internal
views. Before asking, re-run the inbound-link search for
`next.climate.umt.edu` (none on 23 Oct). After O5 the dangling record cannot
be claimed by another account, but it should still go.

### F4. Archive the old site — Owner · T+30 · Undo: yes (unarchive; republish)

1. Confirm nothing publishes to it: the workflow is disabled, Pages CMS is
   removed, and no recent commits.
2. `mco-website` → Settings → Pages → Unpublish site. This retires the
   github.io copy, which still serves the old pages without the domain.
3. Settings → Archive this repository. Its history, including the Jekyll
   sources and `_data/publications.yml`, stays readable.

### F5. Close the open items this unblocks — Owner

`www` (P1.3 fallback), the canary (D3, if the repo is now public), and the
note in `docs/DECISIONS.md` recording launch date and any P9 decisions.

---

## R — Rollback and the rename

### R1. Repo rename (plan §2.1) — Owner decides by T−7 · Undo: yes (rename back)

The repo keeps serving `climate.umt.edu` after staging is retired, so its
name outlives the "next". Two choices, both acceptable:

- **Keep `mco-website-next`.** Nothing to do. Say so in `DECISIONS.md` so it
  is a choice, not drift.
- **Rename to `mco-website`.** The old repo must be renamed first (for
  example `mco-website-jekyll`), because the names collide. Do it at T+7 or
  later, as its own change, **not on launch day.** What it touches: GitHub
  redirects old remotes and web URLs, but local clones and worktrees should
  update their remote. The Pages custom domain stays with the repo. Check
  that the Pages CMS installation and the `github-pages` environment
  survive. The canary matrix entry, if any, needs updating. The
  `check-paths` rule for the project-pages base path `/mco-website-next/`
  would then name the wrong path. The `CLAUDE.md` files at both levels and
  the docs name the repo throughout.

### R2. Rollback — Owner · Undo: this is the undo

**Triggers.** The live site is broken for visitors (pages blank or
unstyled, CSP blocking the kit, data islands failing without their
snapshot). Or the certificate has not issued after two hours. Or a content
problem cannot be fixed forward within the hour. A noindex deploy alone is
**not** a trigger. The site is fine for visitors, so fix forward.

Steps, about ten minutes plus a certificate wait:

1. `mco-website-next` → Settings → Pages → Custom domain: replace
   `climate.umt.edu` with `next.climate.umt.edu` → Save. This frees the
   domain and brings staging back. Its DNS record still exists until F3.
2. `mco-website` → Settings → Pages → Custom domain: `climate.umt.edu` →
   Save. GitHub commits `CNAME` to `gh-pages` and rebuilds from the
   untouched branch. Wait for the certificate, then Enforce HTTPS.
3. Revert P8 PR 1 in this repo. Otherwise every later deploy fails at the
   guard, because staging is not indexable again. Run the workflow so
   staging is rebuilt for its own origin.
4. Leave the old workflow disabled unless the old site needs a change. If
   it does, revert P8 PR 2 first, so a deploy keeps the domain.
5. Re-add `mco-website` to Pages CMS only if staff must edit it.
6. Write down what failed before trying again.

Checks after rollback: V1 against `climate.umt.edu` shows the old site
(`last-modified` from the Jekyll deploy), and V6 shows staging back.
