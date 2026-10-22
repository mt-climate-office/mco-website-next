#!/usr/bin/env node
// Find news posts that are due to go out by email, render them, and send each
// as a Listmonk campaign. Run by .github/workflows/newsletter.yml; see
// docs/newsletter.md for the rules.
//
//   node scripts/newsletter/send.mjs --dry-run [--out previews] [--post <file>]
//   node scripts/newsletter/send.mjs [--post <file>]          (live)
//
// Dry run renders HTML to --out and never contacts Listmonk. A live run
// creates and starts one campaign per due post, then rewrites that post's
// `email: pending` to `email: sent`; the workflow commits the change.
//
// Never double-sends: before creating a campaign it looks in Listmonk for one
// with the same name (`news/<slug>`), and the workflow serialises runs with a
// concurrency group.
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseArgs } from 'node:util';
import { CANONICAL_ORIGIN } from '../../astro.config.mjs';
import { NEWS_DIR } from '../../src/lib/news.ts';
import { markSent, parsePost, renderPost, sendDecision } from './render.mjs';

const ROOT = new URL('../..', import.meta.url).pathname;

const { values: args } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    out: { type: 'string', default: 'previews' },
    post: { type: 'string' },
  },
});
const dryRun = args['dry-run'];

const notice = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::notice::${msg}` : msg);
const warn = (msg) => console.log(process.env.GITHUB_ACTIONS ? `::warning::${msg}` : `warning: ${msg}`);
const output = (k, v) => { if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

/* ─── Candidates ─────────────────────────────────────────────────────── */

const newsDir = join(ROOT, NEWS_DIR);
if (!args.post && !existsSync(newsDir)) {
  notice(`${NEWS_DIR}/ does not exist yet (Phase 4). Nothing to send.`);
  output('marked', '0');
  process.exit(0);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.mdx?$/i.test(name)) yield p;
  }
}

let files;
if (args.post) {
  const p = join(ROOT, args.post);
  if (!existsSync(p)) { console.error(`post not found: ${args.post}`); process.exit(1); }
  files = [p];
} else {
  files = [...walk(newsDir)].sort();
}

/* ─── Listmonk ───────────────────────────────────────────────────────── */

const env = process.env;
const host = new URL(CANONICAL_ORIGIN).host;
const cfg = {
  apiUrl: env.LISTMONK_API_URL?.replace(/\/+$/, ''),
  user: env.LISTMONK_API_USER,
  token: env.LISTMONK_API_TOKEN,
  listId: env.LISTMONK_LIST_ID,
  templateId: env.LISTMONK_TEMPLATE_ID,
  from: env.NEWSLETTER_FROM || `Montana Climate Office <news@lists.${host}>`,
  // Replies land in a monitored mailbox; empty string omits the header.
  replyTo: env.NEWSLETTER_REPLY_TO ?? `info@${host}`,
};

async function api(method, path, body) {
  const res = await fetch(cfg.apiUrl + path, {
    method,
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${cfg.user}:${cfg.token}`).toString('base64'),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Listmonk ${method} ${path}: HTTP ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

/** Every campaign whose name is exactly `name`. Pages through all campaigns. */
async function findCampaigns(name) {
  const found = [];
  for (let page = 1; ; page++) {
    const { data } = await api('GET', `/api/campaigns?page=${page}&per_page=100&no_body=true`);
    const results = data?.results ?? [];
    found.push(...results.filter((c) => c.name === name));
    if (results.length < 100) return found;
  }
}

function payload(r) {
  return {
    name: r.campaignName,
    subject: r.subject,
    lists: [Number(cfg.listId)],
    from_email: cfg.from,
    content_type: 'html',
    body: r.html,
    type: 'regular',
    messenger: 'email',
    ...(cfg.templateId ? { template_id: Number(cfg.templateId) } : {}),
    ...(cfg.replyTo ? { headers: [{ 'Reply-To': cfg.replyTo }] } : {}),
  };
}

const SENT_STATES = new Set(['scheduled', 'running', 'paused', 'finished']);

/**
 * Send one rendered post, unless Listmonk already has it.
 * @returns {Promise<'sent' | 'already-sent' | 'cancelled'>}
 */
async function send(r) {
  const existing = await findCampaigns(r.campaignName);
  if (existing.some((c) => SENT_STATES.has(c.status))) return 'already-sent';
  if (existing.some((c) => c.status === 'cancelled')) return 'cancelled';
  let id;
  const draft = existing.find((c) => c.status === 'draft');
  if (draft) {
    // A previous run created it but did not start it. Refresh and start it.
    id = draft.id;
    await api('PUT', `/api/campaigns/${id}`, payload(r));
  } else {
    id = (await api('POST', '/api/campaigns', payload(r))).data.id;
  }
  await api('PUT', `/api/campaigns/${id}/status`, { status: 'running' });
  return 'sent';
}

/* ─── Run ────────────────────────────────────────────────────────────── */

if (!dryRun) {
  const missing = ['LISTMONK_API_URL', 'LISTMONK_API_USER', 'LISTMONK_API_TOKEN', 'LISTMONK_LIST_ID']
    .filter((k) => !env[k]);
  if (missing.length) { console.error(`live send needs: ${missing.join(', ')}`); process.exit(1); }
  if (!/^\d+$/.test(cfg.listId)) { console.error('LISTMONK_LIST_ID must be numeric'); process.exit(1); }
}

let marked = 0;
let failed = 0;
for (const file of files) {
  const rel = relative(ROOT, file);
  const { data } = parsePost(readFileSync(file, 'utf8'));
  const decision = sendDecision(data);
  // A dry run of a named post previews it whatever its flags say.
  const preview = dryRun && args.post;
  if (!decision.send && !preview) { console.log(`skip ${rel}: ${decision.reason}`); continue; }

  try {
    const r = await renderPost(file);
    if (dryRun) {
      mkdirSync(args.out, { recursive: true });
      const out = join(args.out, `${r.slug}.html`);
      writeFileSync(out, r.html);
      console.log(`dry run ${rel}: ${decision.send ? 'would send' : `would skip (${decision.reason})`}; ` +
        `subject ${JSON.stringify(r.subject)}, ${r.url}, wrote ${out}`);
      continue;
    }
    const result = await send(r);
    if (result === 'cancelled') {
      warn(`${rel}: Listmonk has a cancelled campaign "${r.campaignName}". Not sending; leaving email: pending for a person to resolve.`);
      continue;
    }
    if (result === 'already-sent') notice(`${rel}: campaign "${r.campaignName}" already exists in Listmonk; marking sent without sending.`);
    else notice(`${rel}: sent campaign "${r.campaignName}".`);
    writeFileSync(file, markSent(readFileSync(file, 'utf8')));
    marked++;
  } catch (err) {
    failed++;
    console.error(`${rel}: ${err.message}`);
  }
}

output('marked', marked > 0 ? '1' : '0');
if (!files.length || (!marked && !failed && !dryRun)) console.log('No posts due to send.');
process.exit(failed ? 1 : 0);
