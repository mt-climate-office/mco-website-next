# mco-website-next

The Montana Climate Office website, rebuilt as a static Astro site on GitHub
Pages. It consumes the office's design system,
[mco-web-style](https://github.com/mt-climate-office/mco-web-style), as
pinned, SRI-checked files from jsDelivr.

This is staging. It is unlinked and every page is `noindex`. Do not share
staging links outside the office: the staging host is retired at launch,
not redirected.

## Develop

Node is pinned in `.nvmrc`.

```sh
npm ci
npm run dev
```

## Deploy

Pushes to `main` build and deploy through `.github/workflows/site.yml`. The
host and base path come from the repository's Pages settings, so nothing in
source changes when the custom domain is set.

## Checks

Every pull request runs: a scan for hosts and base paths in source, the kit
pin against the published tag, a type check, checks on the built pages (CSP,
`noindex`, canonical, one `h1`, base path), HTML validation, and the kit's own
verify harness (axe in three themes at two widths in Chromium and WebKit, plus
keyboard probes). See `CLAUDE.md` for running them locally.
