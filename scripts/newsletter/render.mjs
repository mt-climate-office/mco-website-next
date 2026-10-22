// Render a news post as a newsletter email. Ported from
// mco-mailing-lists/email/render.py (DECISIONS D15) to Node, so the repo
// stays single-runtime and every dependency is pinned in package-lock.json.
//
//   front matter + Markdown -> HTML -> iframes swapped for a banner link
//   -> URLs made absolute -> newsletter.mjml -> mjml -> inlined HTML
//
// Pure: no network, no writes. scripts/newsletter/send.mjs does those.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import * as cheerio from 'cheerio';
import { marked } from 'marked';
import mjml2html from 'mjml';
import { parse as parseYaml } from 'yaml';
import { CANONICAL_ORIGIN } from '../../astro.config.mjs';
import { kit } from '../../src/kit/kit.ts';
import { newsPath, newsSlug } from '../../src/lib/news.ts';

const TEMPLATE = new URL('./newsletter.mjml', import.meta.url);

/** Front matter and body of a post file. */
export function parsePost(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  return { data: parseYaml(m[1]) ?? {}, body: m[2] };
}

/** The post's date as YYYY-MM-DD, from front matter. */
export function postDate(data) {
  const d = data.date;
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d)) return d.slice(0, 10);
  return null;
}

/** Today in Mountain time, YYYY-MM-DD. */
export const todayMT = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(now);

/**
 * The send rule (docs/newsletter.md): `email: pending`, not a draft, and not
 * dated in the future. Being on main is the workflow's job. Whether the post
 * was just added or edited later does not matter.
 */
export function sendDecision(data, today = todayMT()) {
  const flag = String(data.email ?? '').trim().toLowerCase();
  if (flag !== 'pending') return { send: false, reason: `email is ${JSON.stringify(data.email ?? null)}, not "pending"` };
  if (data.draft === true) return { send: false, reason: 'draft is true' };
  const d = postDate(data);
  if (!d) return { send: false, reason: 'no valid date' };
  if (d > today) return { send: false, reason: `dated ${d}, after ${today}` };
  return { send: true, reason: 'ok' };
}

/** Rewrite `email: pending` to `email: sent` inside the front matter only. */
export function markSent(text) {
  return text.replace(/^(---\r?\n)([\s\S]*?)(\r?\n---)/, (_, open, fm, close) =>
    open + fm.replace(/^(email:[ \t]*)["']?pending["']?([ \t]*(#.*)?)$/m, '$1sent$2') + close);
}

/**
 * Make a link or image URL absolute against the production origin.
 * Root-relative paths are site paths (public/ files, other pages). Relative
 * paths are refused: an email has no page to be relative to, and the news
 * collection's image convention (docs/newsletter.md) is root-relative.
 */
export function absolutize(value, origin = CANONICAL_ORIGIN) {
  if (!value || /^(https?:|mailto:|tel:|data:|#|\{\{)/i.test(value)) return value;
  if (value.startsWith('//')) return 'https:' + value;
  if (value.startsWith('/')) return new URL(value, origin + '/').href;
  throw new Error(`relative URL "${value}" cannot be resolved in an email; use a root-relative path such as /images/news/...`);
}

const isEmbedWrapper = ($, el) =>
  el?.type === 'tag' && el.name === 'div' && !$(el).text().trim() && $(el).find('iframe').length > 0;

/** Email clients strip iframes, so each embed becomes a banner linking to the post. */
function swapIframes($, postUrl, bannerUrl, host) {
  $('iframe').each((_, iframe) => {
    let target = iframe;
    while (target.parent && isEmbedWrapper($, target.parent)) target = target.parent;
    const label = `Interactive version on ${host}`;
    $(target).replaceWith(
      `<p><a href="${escapeAttr(postUrl)}"><img src="${escapeAttr(bannerUrl)}" alt="${escapeAttr(label)}" ` +
      `style="max-width:100%;height:auto;border-radius:4px;"></a></p>` +
      `<p><a href="${escapeAttr(postUrl)}" style="color:#2a7f9e;font-size:14px;">` +
      `View the interactive version on ${escapeHtml(host)}</a></p>`);
  });
  $('script, style').remove();
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeAttr = (s) => escapeHtml(s).replace(/"/g, '&quot;');

/** Markdown body to email-safe HTML. */
export function renderBody(markdown, { postUrl, bannerUrl, origin = CANONICAL_ORIGIN }) {
  const html = marked.parse(markdown, { async: false, gfm: true });
  const $ = cheerio.load(html, null, false);
  swapIframes($, postUrl, bannerUrl, new URL(origin).host);
  $('img[src]').each((_, el) => { $(el).attr('src', absolutize($(el).attr('src'), origin)); });
  $('a[href]').each((_, el) => { $(el).attr('href', absolutize($(el).attr('href'), origin)); });
  return $.html();
}

const prettyDate = (ymd) => ymd
  ? new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(ymd + 'T00:00:00Z'))
  : '';

/**
 * Render one post file.
 * @returns {Promise<{slug, url, subject, preheader, campaignName, html}>}
 */
export async function renderPost(file, { origin = CANONICAL_ORIGIN } = {}) {
  const { data, body } = parsePost(readFileSync(file, 'utf8'));
  if (!data.title) throw new Error(`${file}: front matter has no title`);
  const slug = newsSlug(basename(file), data.slug);
  const url = new URL(newsPath(slug), origin + '/').href;
  const bannerUrl = data.image ? absolutize(data.image, origin) : kit('assets/og-card.png');
  const content = renderBody(body, { postUrl: url, bannerUrl, origin });

  const tokens = {
    '@@TITLE@@': escapeHtml(data.title),
    '@@PREHEADER@@': escapeHtml(data.summary ?? ''),
    '@@DATE@@': escapeHtml(prettyDate(postDate(data))),
    '@@POST_URL@@': escapeAttr(url),
    '@@ORIGIN@@': escapeAttr(origin),
    '@@HOST@@': escapeHtml(new URL(origin).host),
    '@@LOGO_URL@@': escapeAttr(kit('assets/mco-logo.png')),
    '@@CONTENT@@': content, // already HTML
  };
  let source = readFileSync(TEMPLATE, 'utf8');
  for (const [token, value] of Object.entries(tokens)) source = source.split(token).join(value);

  const { html, errors } = await mjml2html(source, { validationLevel: 'soft' });
  if (errors?.length) {
    // The post body sits in <mj-raw>, so these are template problems.
    throw new Error('mjml: ' + errors.map((e) => e.formattedMessage ?? e.message).join('; '));
  }
  return {
    slug,
    url,
    subject: String(data.title),
    preheader: String(data.summary ?? ''),
    campaignName: `news/${slug}`,
    html,
  };
}
