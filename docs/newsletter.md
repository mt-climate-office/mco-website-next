# Newsletter

News posts go out by email through Listmonk at `lists.climate.umt.edu`
(DECISIONS D11). The renderer was ported here from `mco-mailing-lists`
(D15) and runs in this repo with pinned dependencies only.

| File | Role |
|---|---|
| `.github/workflows/newsletter.yml` | Finds due posts, sends, commits `email: sent` |
| `scripts/newsletter/send.mjs` | CLI: candidates, Listmonk calls, dry run |
| `scripts/newsletter/render.mjs` | Post to email HTML. No network |
| `scripts/newsletter/newsletter.mjml` | The email template |
| `scripts/newsletter/test/` | `npm run test:newsletter`, run in the site workflow |
| `src/lib/news.ts` | `newsSlug()` and `newsPath()`, the one definition of a post URL |

## Status: dry runs only until launch

`src/content/news/` exists from Phase 4, with the migrated Jekyll posts. None
of them carries `email:`, so none is ever due. The workflow triggers on
pushes to `main` that touch the directory. Live sends also need the
repository variable `NEWSLETTER_SEND_ENABLED` set to `true`; without it every
run is a dry run.

Leave it unset until launch. Before cutover, a post's URL on
`climate.umt.edu` is still the Jekyll site, so the email's links would 404.

## When a post sends

All of these, at the time the workflow runs:

1. The post is on `main`.
2. `draft` is not `true`.
3. `email: pending`.
4. `date` is today or earlier, in Mountain time.

Whether the post was just added or edited later does not matter. Pages CMS
commits on every save, so a post can be written over several saves with
`draft: true` and goes out on the first save that clears it.

After a successful send the workflow rewrites `email: pending` to
`email: sent` in the front matter and commits it to `main` as
`github-actions[bot]`.

### Never twice

- Each campaign is named `news/<slug>`. Before creating one, the script
  lists Listmonk's campaigns and looks for that exact name.
  - Scheduled, running, paused or finished: not sent again; the post is
    marked `sent`.
  - Draft (an earlier run created it and failed before starting it): its
    body is refreshed and it is started.
  - Cancelled: not sent, not marked. A warning asks a person to decide.
- The workflow's `concurrency` group runs one job at a time and never
  cancels one mid-send. Each run checks out the tip of `main`, so a queued
  run sees the `email: sent` an earlier run pushed.
- If the push of `email: sent` fails, the Listmonk check still stops a
  resend on the next run.

### Dry run

Manual runs default to `dry_run: true`. A dry run renders each due post (or
the one named in the `post` input, whatever its flags) to
`previews/<slug>.html`, uploads them as the `newsletter-previews` artifact,
and never contacts Listmonk or changes a file. Locally:

```sh
npm run newsletter:preview
node scripts/newsletter/send.mjs --dry-run --post scripts/newsletter/test/fixtures/2026-10-01-october-drought-update.md
```

## Front matter the news schema must carry

Phase 4 builds `src/content/news/` from `src/content/_fields.ts` (D13). These
fields must be in it, with these names:

| Field | Type | Used for |
|---|---|---|
| `title` | string, required | Subject line and email heading |
| `date` | date, required | Date line; future dates do not send |
| `summary` | text, required | Preheader (the inbox preview line) |
| `image` | image, optional | Banner that replaces an embedded iframe. Default: the kit's `og-card.png` |
| `imageAlt` | string, required when `image` is set | Alt text (already a `refine` in the reference schema) |
| `draft` | boolean, default `false` | `true` never sends |
| `email` | select: `pending`, `sent`; optional | Opt-in. Absent means the post is not emailed |
| `slug` | string, optional | Overrides the slug from the file name |

`email: sent` is written by the workflow. Editors should only ever choose
`pending`; the CMS description should say so.

### URLs

A post's URL is `/news/<slug>/`, where the slug is the file name without its
extension and `YYYY-MM-DD-` prefix (the reference CMS config names files
`{year}-{month}-{day}-{primary}.md`), unless `slug` is set. The Phase 4 route
must call `newsSlug()` and `newsPath()` from `src/lib/news.ts` so the site
and the email agree. Email links resolve against `CANONICAL_ORIGIN`, which
is exported from `astro.config.mjs`; no host is written anywhere else.

### Images

Post images are **root-relative paths to files in `public/images/news/`**,
such as `/images/news/2026-10-dillon.jpg`. Pages CMS writes them that way
(`.pages.yml` `media.input` is `public/images/news`, `media.output` is
`/images/news`); migrated posts keep theirs in `public/images/news/<slug>/`.
The renderer makes them absolute against the production origin. On the site,
`src/lib/markdown-site-paths.mjs` puts them under the base path, adds width
and height, and fails the build if the file is missing. An 800px copy named
`<name>-800w.<ext>` beside an image, if present, becomes its `srcset`.

They are not colocated with the post or processed by `astro:assets`, whose
hashed `/_astro/` URLs a script reading the Markdown cannot know. A relative
path in a post fails the render with an error rather than guessing.

## Secrets and variables

Set in the repository's Actions settings.

| Name | Kind | Value |
|---|---|---|
| `LISTMONK_API_URL` | secret | Listmonk base URL, no trailing `/api` |
| `LISTMONK_API_USER` | secret | Listmonk API user |
| `LISTMONK_API_TOKEN` | secret | That user's token |
| `LISTMONK_LIST_ID` | variable (or secret) | Numeric id of the MCO News list |
| `LISTMONK_TEMPLATE_ID` | variable (or secret) | Id of the passthrough campaign template, whose body is exactly `{{ template "content" . }}`, so the email is not wrapped twice |
| `NEWSLETTER_SEND_ENABLED` | variable | `true` to allow live sends. Set at launch |
| `NEWSLETTER_FROM` | variable, optional | Default `Montana Climate Office <news@lists.` + production host + `>` |

Reply-To defaults to `info@` plus the production host. That mailbox must
exist before replies go anywhere (mco-mailing-lists README). `send.mjs` reads
`NEWSLETTER_REPLY_TO` to change it; an empty value omits the header.

The API user needs campaign read, create and update rights, nothing on
subscribers.

## Changes from the mco-mailing-lists version

- Node instead of Python, so the repo stays single-runtime. `marked`,
  `cheerio`, `mjml` and `yaml` are exact-pinned devDependencies; no
  `npx --yes`, no global installs, no cross-repo checkout or token.
- Sends on `draft: false` and `email: pending` for any post on `main`, not
  only newly added files. The old workflow ignored `draft`.
- Idempotency checks Listmonk by campaign name before creating one.
- Post URLs are Astro's `/news/<slug>/`, not Jekyll's
  `/<categories>/<yyyy>/<mm>/<dd>/<slug>.html`.
- Preheader reads `summary`, not `description`.
- Logo and default banner come from the pinned kit tag.
- Copy follows VOICE.md: no `→` or `▶`, no middle-dot joins in the footer.
- Footer address is the Franke College address (D15), matching the site
  footer.
- The title is an `<h1>`, the document has `lang="en"`, and the grey footer
  and date text were darkened to pass 4.5:1 on their backgrounds.
- Smart punctuation is not applied (the Python version used `smarty`). Straight
  quotes in Markdown stay straight in email.

## Open: colours

The email keeps the old site's teal: `#52adc8` for the accent rule and
button, `#2a7f9e` for links. The owner has not decided whether email moves to
the kit blue (Phase 0 §7.13, three brand blues in circulation). Note that
two teal pairs fail WCAG AA: white on the `#52adc8` button is 2.6:1, and
`#2a7f9e` footer links on the `#f2f3f3` ground are 4.1:1 (body links on white
pass at 4.5:1). Whichever palette is chosen, those two need darker values.
