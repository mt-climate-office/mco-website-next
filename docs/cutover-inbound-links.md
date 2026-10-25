# Cutover inbound-link inventory

Phase 5 step 15 (rebuild plan Part 6): hard-coded links to `climate.umt.edu`
and `next.climate.umt.edu` in the office's own repositories, checked against
the redirect map (`src/data/redirects.json`). Read-only: no other repo was
changed.

**Method.** Every text file in every local clone under
`~/git/mt-climate-office/`, except this repo and `mco-website` (the site
being replaced), skipping `.git`, `node_modules`, `_site`, `dist` and
similar build trees. A match is the host not preceded by a letter, digit,
`.` or `-`, so `mesonet.climate.umt.edu`, `data2.climate.umt.edu` and other
subdomains are not counted. 23 Oct 2026. Clones may be behind their remotes
(phase-0-report §7.14), and sites outside the org (NOAA, DNRC, NIDIS,
papers) are not covered: search engines' inbound-link reports and the old
site's traffic logs are the way to find those.

**Re-run** before cutover with the same search, and
`npm run check:redirects -- --live` to re-check the old sitemap.

**Not in any repo, but possibly linked from outside:** the Mesonet app's
privacy policy, `/mesonet/app/privacy/`. App-store listings require a
working privacy-policy URL. The map retires it with a BLOCKER todo: migrate
the policy to the same path before cutover.

**Status, 25 Oct 2026.** The "new site" column below is as of 23 Oct.
Every `todo` it names has since been cleared (`docs/cutover-checklist.md`
P2): the privacy policy and `/about/agreement/` are migrated at the same
paths (#23), `/mesonet/ag_tools/` and `/mesonet/variables/` too (#28),
`/disclaimer/` redirects to `/about/agreement/`, and `/about/support/`
redirects to `/about/` (D23). The one link still to change is the legacy
Dash app's `/mesonet/funding_draft/` (checklist P5).

## Summary

- 485 matches in 39 repos.
- **`next.climate.umt.edu`: none.** No repo links the staging host.
- 330 are the bare host or homepage (`climate.umt.edu`, `https://climate.umt.edu/`): footers, READMEs, credits, DNS and gateway config. The homepage stays, so these keep working.
- Everything else is listed below, by what happens at cutover.

## Needs action before cutover

| Link | Where | At cutover | Action |
|---|---|---|---|
| `climate.umt.edu/about/agreement/` | `mesonet-dashboard/web/public/data/MANIFEST.json:16` | redirects to /about/ (todo) | Migrate the disclaimer; the API docs and dashboard name this URL as the data terms. |
| `climate.umt.edu/about/agreement/` | `mesonet-dashboard/web/src/core/ag/data/vendor-static.mjs:104` | redirects to /about/ (todo) | Migrate the disclaimer; the API docs and dashboard name this URL as the data terms. |
| `climate.umt.edu/about/agreement/` | `mesonet-db-rds/api/app/app/main.py:123` | redirects to /about/ (todo) | Migrate the disclaimer; the API docs and dashboard name this URL as the data terms. |
| `climate.umt.edu/about/agreement/` | `mesonet_app/apiv2/app/app/main.py:111` | redirects to /about/ (todo) | Migrate the disclaimer; the API docs and dashboard name this URL as the data terms. |
| `climate.umt.edu/about/support/` | `mesonet-dashboard/app/mdb/app.py:2579` | redirects to /about/ (todo) | Owner: keep a donation page or drop the link in the legacy Dash app. |
| `climate.umt.edu/mesonet/ag_tools/` | `mesonet-dashboard/app/mdb/app.py:710` | redirects to /mesonet/ (todo) | Migrate the ag method pages; the new dashboard's Ag view sends readers here. |
| `climate.umt.edu/mesonet/ag_tools/` | `mesonet-dashboard/web/src/core/ag/view/learnMore.ts:8` | redirects to /mesonet/ (todo) | Migrate the ag method pages; the new dashboard's Ag view sends readers here. |
| `climate.umt.edu/mesonet/funding_draft/` | `mesonet-dashboard/app/mdb/app.py:2579` | retired (404) | Remove the link from the legacy Dash app, or retire `/dash/` first. |
| `climate.umt.edu/mesonet/variables/` | `mesonet-dashboard/app/mdb/layout.py:684` | redirects to /mesonet/#mesonet-networks (todo) | Migrate the variables table; both dashboards link it. |
| `climate.umt.edu/mesonet/variables/` | `mesonet-dashboard/web/partials/charts/compare.html:66` | redirects to /mesonet/#mesonet-networks (todo) | Migrate the variables table; both dashboards link it. |

## Covered by the map

| Link | Where | At cutover |
|---|---|---|
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-data-cdn/storage-browser/src/App.jsx:128` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-drought-dashboard/docs/index.html:8231` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-drought-dashboard/docs/legacy/index-new-map-backend-maplibre.html:1833` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-drought-dashboard/docs/legacy/index.html:1865` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-mailing-lists/email/newsletter.mjml:34` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-mailing-lists/listmonk/branding/README.md:20` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mco-mailing-lists/listmonk/branding/campaign-template.html:31` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/assets/images/MCO_logo_icon_only.png` | `mesonet-dashboard/web/KIT-PROPOSALS.md:933` | same path on new site. Kept in public/assets/images/: every email already sent shows it. |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2018-october/index.html:246` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2018-summer/index.html:253` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2019-april/index.html:359` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2019-march/index.html:361` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2019-november/index.html:351` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2020-april/index.html:377` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2020-june/index.html:356` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2020-march/index.html:356` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/docs/mtdrought-2020-october/index.html:363` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2018-october/index.Rmd:99` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2018-summer/index.Rmd:97` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2019-april/index.Rmd:46` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2019-june/index.Rmd:48` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2019-march/index.Rmd:68` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2019-november/index.Rmd:49` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2020-april/index.Rmd:84` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2020-june/index.Rmd:60` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-2020-march/index.Rmd:61` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer` | `mtdrought/mtdrought-working/index.Rmd:48` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2018-october/index.html:246` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2018-summer/index.html:253` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2019-april/index.html:359` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2019-march/index.html:361` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2019-november/index.html:351` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2020-april/index.html:377` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2020-june/index.html:356` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2020-march/index.html:356` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/docs/mtdrought-2020-october/index.html:363` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2018-october/index.Rmd:99` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2018-summer/index.Rmd:97` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2019-april/index.Rmd:46` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2019-june/index.Rmd:48` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2019-march/index.Rmd:68` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2019-november/index.Rmd:49` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2020-april/index.Rmd:84` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2020-june/index.Rmd:60` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-2020-march/index.Rmd:61` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/disclaimer/` | `mtdrought/mtdrought-working/index.Rmd:48` | redirects to /about/ (todo). Already 404 on the old site. Added to the map: redirects to /about/ (todo). |
| `climate.umt.edu/drought` | `mtdrought/docs/mtdrought-2020-april/index.html:363` | same path on new site |
| `climate.umt.edu/drought` | `mtdrought/docs/mtdrought-2020-april/index.html:364` | same path on new site |
| `climate.umt.edu/drought` | `mtdrought/mtdrought-2020-april/index.Rmd:65` | same path on new site |
| `climate.umt.edu/drought` | `mtdrought/mtdrought-2020-april/index.Rmd:67` | same path on new site |
| `climate.umt.edu/drought.` | `mtdrought/mtdrought-2020-april/index.Rmd:65` | same path on new site |
| `climate.umt.edu/index.html` | `mco-drought-indicators/documentation/quarto-docs/docs/sitemap.xml:4` | exists on new site |
| `climate.umt.edu/mesonet` | `mesonet-alerts/listmonk/alerts-template.html:67` | same path on new site |
| `climate.umt.edu/mesonet` | `mesonet-status/README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `MCA/docs/index.html:224` | same path on new site |
| `climate.umt.edu/mesonet/` | `MCA/index.qmd:15` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-drought-dashboard/docs/index.html:6420` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-drought-dashboard/docs/index.html:8207` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-drought-dashboard/docs/index.html:8237` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-drought-indicators/documentation/quarto-docs/core_datasets.qmd:10` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-drought-indicators/documentation/quarto-docs/docs/core_datasets.html:229` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-web-style-verify-retry/exemplar/index.html:269` | same path on new site |
| `climate.umt.edu/mesonet/` | `mco-web-style/exemplar/index.html:269` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-dashboard/web/partials/shell.html:128` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-db-rds/docs/archive-public-README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-explorer/README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-explorer/package.json:4` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-gateway/README.md:38` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-gateway/terraform/cloudfront-functions/redirect.js:23` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-gateway/terraform/terraform.tfvars:24` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-gateway/terraform/terraform.tfvars.example:33` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-gateway/terraform/variables.tf:127` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-maintenance/README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-photo-explorer/README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-photo-explorer/docs/index.html:560` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-photo-explorer/package.json:4` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-soils/README.Rmd:19` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-soils/README.md:5` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet-umrb-build/README.md:3` | same path on new site |
| `climate.umt.edu/mesonet/` | `mesonet_app/Caddyfile:198` | same path on new site |
| `climate.umt.edu/mesonet/` | `mt-normals/docs/misc/MCA_Reanalysis.md:10` | same path on new site |
| `climate.umt.edu/mesonet/` | `mtdrought/docs/mtdrought-2020-march/index.html:342` | same path on new site |
| `climate.umt.edu/mesonet/` | `mtdrought/mtdrought-2020-march/index.Rmd:42` | same path on new site |
| `climate.umt.edu/mesonet/` | `normals/docs/misc/MCA_Reanalysis.md:10` | same path on new site |
| `climate.umt.edu/mesonet/stations/` | `mesonet-dashboard/web/src/core/analytics.test.ts:56` | same path on new site |
| `climate.umt.edu/mesonet/umrb/` | `mesonet-photo-explorer/docs/index.html:561` | redirects to /mesonet/#mesonet-history |
| `climate.umt.edu/mesonet_dashboard` | `mtdrought/docs/mtdrought-2020-march/index.html:342` | redirects to https://mesonet.climate.umt.edu/dash/next/. Already 404 on the old site. Added to the map: redirects to the Station Dashboard. |
| `climate.umt.edu/mesonet_dashboard` | `mtdrought/docs/mtdrought-2020-march/index.html:343` | redirects to https://mesonet.climate.umt.edu/dash/next/. Already 404 on the old site. Added to the map: redirects to the Station Dashboard. |
| `climate.umt.edu/mesonet_dashboard` | `mtdrought/mtdrought-2020-march/index.Rmd:42` | redirects to https://mesonet.climate.umt.edu/dash/next/. Already 404 on the old site. Added to the map: redirects to the Station Dashboard. |
| `climate.umt.edu/mesonet_dashboard` | `mtdrought/mtdrought-2020-march/index.Rmd:44` | redirects to https://mesonet.climate.umt.edu/dash/next/. Already 404 on the old site. Added to the map: redirects to the Station Dashboard. |

## Not covered, and why

None of these work today either: each answered 404 on the live site on 23 Oct 2026, or is not a link.
Two were added to the map anyway because they are cheap to catch (`/disclaimer/`, `/mesonet_dashboard/`).

| Link | Where | Note |
|---|---|---|
| `climate.umt.edu/img/MCO_logo_white.svg` | `mco-drought-conus/storage-browser/src/App.jsx:47` | Already 404 on the old site. The storage browser shows a broken logo today; switch it to the kit logo. |
| `climate.umt.edu/img/MCO_logo_white.svg` | `mco-web-style-verify-retry/CONSUMERS.md:263` | Already 404 on the old site. The storage browser shows a broken logo today; switch it to the kit logo. |
| `climate.umt.edu/img/MCO_logo_white.svg` | `mco-web-style/CONSUMERS.md:263` | Already 404 on the old site. The storage browser shows a broken logo today; switch it to the kit logo. |
| `climate.umt.edu/imx/MCO-Logo-Footer.png` | `mcor.data/README.Rmd:20`, `mcor.data/README.md:11`, `mcor.data/docs/index.html:87` | Already 404 on the old site. README logo broken today; switch it to the kit logo. |
| `climate.umt.edu/imx/MCO-Logo-Footer.png` | `mcor/README.Rmd:21`, `mcor/README.md:11`, `mcor/docs/index.html:87` | Already 404 on the old site. README logo broken today; switch it to the kit logo. |
| `climate.umt.edu/mesonet/Stations` | `mtdrought/docs/mtdrought-2018-october/index.html:215`, `mtdrought/mtdrought-2018-october/index.Rmd:7` | Already 404 on the old site. Not mapped: on a case-insensitive checkout it collides with /mesonet/stations/. |
| `climate.umt.edu/mesonet/Stations.` | `mtdrought/docs/mtdrought-2018-october/index.html:214` | As above. |
| `climate.umt.edu/mesonet/Stations/default.php` | `mtdrought/docs/mtdrought-2018-october/index.html:215`, `mtdrought/mtdrought-2018-october/index.Rmd:7` | Already 404 (pre-Jekyll PHP page). Not mapped. |
| `climate.umt.edu/mesonet/dashboard/ag_tools/` | `mesonet-dashboard/app/mdb/layout.py:1166` | Already 404 on the old site. Legacy Dash app only. Not mapped. |
| `climate.umt.edu/mtdrought/` | `mtdrought-sampling/mtdrought-sampling.qmd:55` | Already 404 on the old site. Not mapped: the 2018–2020 newsletters it held are gone. |
| `climate.umt.edu/mtdrought/` | `mtdrought/docs/mtdrought-2018-october/index.html:245`, `mtdrought/docs/mtdrought-2018-spring/index.html:244`, `mtdrought/docs/mtdrought-2018-summer/index.html:252`, `mtdrought/docs/mtdrought-2019-april/index.html:358` and 17 more | Already 404 on the old site. Not mapped: the 2018–2020 newsletters it held are gone. |
| `climate.umt.edu/sitemap.xml` | `mco-drought-indicators/documentation/quarto-docs/docs/robots.txt:1` | Quarto output with the wrong site-url (see below). Not a link. |
| `climate.umt.edu/x?a=1&amp;b=2` | `mesonet-dashboard/web/src/core/markdown.test.ts:50` | Test fixture, not a link. |
| `climate.umt.edu/x?a=1&b=2` | `mesonet-dashboard/web/src/core/markdown.test.ts:49` | Test fixture, not a link. |
| `climate.umt.edu/…/MCO_logo_icon_only.png` | `mco-web-style-verify-retry/MIGRATING.md:465` | Prose in the kit docs, not a link. |
| `climate.umt.edu/…/MCO_logo_icon_only.png` | `mco-web-style/MIGRATING.md:465` | Prose in the kit docs, not a link. |
| `climate.umt.edu/*.html` (14 URLs) | `mco-drought-indicators/documentation/quarto-docs/docs/sitemap.xml` | Quarto docs built with `site-url: climate.umt.edu`; the generated sitemap names pages that never existed there. Not inbound links; fix the Quarto `site-url` in that repo. |

## Bare host and homepage links

These keep working: the homepage is the same URL. Listed per file for completeness.

| Repo | File: lines |
|---|---|
| Zentra-API | `setup.cfg`: 11 |
| climate-explorer | `docs/index.html`: 537, 752 |
| ecorestore | `README.md`: 5<br>`docs/_includes/footer.html`: 15, 19<br>`docs/about/index.md`: 15<br>`docs/app/index.html`: 2057, 2060<br>`docs/index.md`: 12 |
| gridmet-normals | `README.md`: 229 |
| mco-aws | `docs/conventions.md`: 195<br>`docs/runbooks/cert-renewal.md`: 78<br>`docs/runbooks/dns-delegation.md`: 8<br>`modules/container-lambda/README.md`: 29<br>`modules/container-lambda/examples/basic/main.tf`: 36 |
| mco-briefings | `README.md`: 3<br>`references/mco.yml`: 14 |
| mco-data-cdn | `README.md`: 95<br>`build/cert-renewer/handler.py`: 14<br>`cert-renewer/handler.py`: 14<br>`scripts/renew-letsencrypt-cert.sh`: 5<br>`storage-browser/src/App.jsx`: 126<br>`terraform/cert-renewal.tf`: 5 |
| mco-dns | `README.md`: 3, 5, 8, 22, 23, 51<br>`docs/delegation-runbook.md`: 1, 3, 14, 15, 46, 47, 62, 66, 71, 78, 83, 88, 89<br>`docs/um-it-requests/delegation.md`: 1, 9, 14, 17, 20, 23, 24, 25, 26, 30, 39, 44, 47<br>`docs/zone-inventory.md`: 1, 12, 13, 36, 54, 65<br>`terraform/outputs.tf`: 2, 7<br>`terraform/records.tf`: 1, 12, 20, 31, 45, 48<br>`terraform/zones.tf`: 1, 4, 7, 8 |
| mco-drought-conus | `docs/methods.html`: 1426 |
| mco-drought-dashboard | `README.md`: 3, 123<br>`docs/index.html`: 154, 6421, 8231<br>`docs/legacy/index-new-map-backend-maplibre.html`: 1832<br>`docs/legacy/index.html`: 1864<br>`docs/methods.html`: 1426 |
| mco-drought-indicators | `docs/index.html`: 649, 1032, 3209<br>`docs/old_docs/footer.html`: 3<br>`docs/old_docs/index.html`: 3179<br>`docs/old_docs/index_cog_test.html`: 2926<br>`documentation/quarto-docs/_quarto.yml`: 9<br>`processing/build-website/footer.html`: 3<br>`processing/build-website/index.html`: 3181<br>`processing/cog/index.html`: 182, 952 |
| mco-mailing-lists | `INFRA-NOTES.md`: 20, 155, 157<br>`README.md`: 73, 97, 99, 126<br>`STATUS.md`: 48<br>`docs/um-it-requests/dns-records.md`: 15, 64<br>`docs/um-it-requests/dns-records.txt`: 8, 57<br>`email/newsletter.mjml`: 70, 82<br>`email/render.py`: 41, 44, 46, 120, 126, 222<br>`listmonk/README.md`: 119<br>`listmonk/branding/campaign-template.html`: 53<br>`listmonk/static-override/email-templates/base.html`: 100<br>`terraform/outputs.tf`: 2<br>`terraform/ses.tf`: 5 |
| mco-snowpack-explorer | `README.md`: 3<br>`index.html`: 320, 516<br>`package.json`: 4 |
| mco-web-style | `CHANGELOG.md`: 42, 161, 358<br>`CONSUMERS.md`: 19, 25, 250<br>`HOUSE-STYLE.md`: 17, 37, 42, 58, 131<br>`MIGRATING.md`: 44, 171<br>`README.md`: 3<br>`core/mco-core.js`: 371<br>`demo/index.html`: 136, 512, 880<br>`exemplar/index.html`: 166<br>`package.json`: 4 |
| mco-web-style-verify-retry | `CHANGELOG.md`: 67, 186, 383<br>`CONSUMERS.md`: 19, 25, 250<br>`HOUSE-STYLE.md`: 17, 37, 42, 58, 131<br>`MIGRATING.md`: 44, 171<br>`README.md`: 3<br>`core/mco-core.js`: 371<br>`demo/index.html`: 136, 512, 880<br>`exemplar/index.html`: 166 |
| mcor | `README.Rmd`: 23<br>`README.md`: 13<br>`docs/index.html`: 88 |
| mcor.data | `README.Rmd`: 22<br>`README.md`: 13<br>`docs/index.html`: 88 |
| mesonet-alerts | `common/listmonk.py`: 38<br>`tests/test_listmonk.py`: 55 |
| mesonet-aq | `docs/index.html`: 156 |
| mesonet-cameras | `docs/onvif.md`: 281<br>`go/internal/brand/layout.json`: 7<br>`src/mesonet_cameras/ptz.py`: 1293, 1638, 1643 |
| mesonet-dashboard | `app/mdb/layout.py`: 284<br>`web/DIVERGENCES.md`: 119, 120, 1427<br>`web/KIT-PROPOSALS.md`: 941, 982, 987, 992, 1406, 1408<br>`web/MIGRATION-MATRIX.md`: 50<br>`web/partials/shell.html`: 9, 130<br>`web/src/core/analytics.test.ts`: 56 |
| mesonet-db-python | `setup.cfg`: 11 |
| mesonet-db-rds | `README.md`: 3<br>`api/app/app/main.py`: 127, 133<br>`api/app/app/static/latest/index.html`: 716<br>`docs/archive-public-README.md`: 16 |
| mesonet-explorer | `README.md`: 3<br>`app.js`: 3859<br>`index.html`: 1116, 1231, 1499<br>`package.json`: 4 |
| mesonet-gateway | `README.md`: 91<br>`terraform/acm.tf`: 4, 22<br>`terraform/terraform.tfvars.example`: 36 |
| mesonet-maintenance | `README.md`: 3<br>`index.html`: 375, 378 |
| mesonet-ogc | `pygeoapi-config.yml`: 35, 45, 63 |
| mesonet-photo-explorer | `README.md`: 10, 122<br>`docs/app.js`: 30, 1408<br>`docs/index.html`: 368, 560 |
| mesonet-soils | `README.Rmd`: 23<br>`README.md`: 9 |
| mesonet-status | `README.md`: 3<br>`index.html`: 320 |
| mesonet-umrb-build | `README.md`: 3<br>`index.html`: 335, 338 |
| mesonet_app | `apiv2/app/app/main.py`: 115, 121<br>`apiv2/app/app/static/latest/index.html`: 743<br>`apiv2/app/app/static/maintenance/index.html`: 517, 520<br>`apiv2/app/app/static/status/index.html`: 456, 459<br>`examples/README.md`: 13 |
| mini-analyses | `20220816_missoula_heat/20220816_missoula_heat.html`: 119<br>`20220816_missoula_heat/20220816_missoula_heat.qmd`: 935<br>`20220819_missoula_record/20220819_missoula_record.qmd`: 1000<br>`20240708_missoula_heat/20220816_missoula_heat.html`: 119<br>`20240708_missoula_heat/20220816_missoula_heat.qmd`: 942<br>`202407_missoula_heat/20220816_missoula_heat.html`: 119<br>`202407_missoula_heat/20220816_missoula_heat.qmd`: 942<br>`202607_lewistown_heat/202607_lewistown_heat.html`: 119<br>`202607_lewistown_heat/202607_lewistown_heat.qmd`: 942 |
| mt-normals | `docs/misc/sidebar_example.html`: 282<br>`index.html`: 165 |
| mtdrought | `docs/mtdrought-2018-october/index.html`: 245, 252, 253<br>`docs/mtdrought-2018-spring/index.html`: 244, 254, 255<br>`docs/mtdrought-2018-summer/index.html`: 252, 259, 260<br>`docs/mtdrought-2019-april/index.html`: 358, 365, 366<br>`docs/mtdrought-2019-march/index.html`: 360, 367, 368<br>`docs/mtdrought-2019-november/index.html`: 350, 357, 358<br>`docs/mtdrought-2020-april/index.html`: 363, 376, 384, 387, 394<br>`docs/mtdrought-2020-june/index.html`: 342, 355, 363, 366, 373<br>`docs/mtdrought-2020-march/index.html`: 342, 355, 362, 363<br>`docs/mtdrought-2020-october/index.html`: 362, 370, 373, 380<br>`mtdrought-2018-october/index.Rmd`: 97, 110, 113, 121<br>`mtdrought-2018-spring/index.Rmd`: 37, 50, 53, 61<br>`mtdrought-2018-summer/index.Rmd`: 95, 108, 111, 119<br>`mtdrought-2019-april/index.Rmd`: 44, 56, 59, 67<br>`mtdrought-2019-june/index.Rmd`: 46, 58, 61, 69<br>`mtdrought-2019-march/index.Rmd`: 66, 78, 81, 89<br>`mtdrought-2019-november/index.Rmd`: 47, 59, 62, 70<br>`mtdrought-2020-april/index.Rmd`: 65, 82, 94, 97, 105<br>`mtdrought-2020-june/index.Rmd`: 41, 58, 70, 73, 81<br>`mtdrought-2020-march/index.Rmd`: 42, 59, 71, 74, 82<br>`mtdrought-working/index.Rmd`: 46, 58, 61, 69 |
| mtdrought-sampling | `mtdrought-sampling.qmd`: 55 |
| normal-explorer | `docs/index.html`: 138 |
| normals | `docs/misc/sidebar_example.html`: 282 |
