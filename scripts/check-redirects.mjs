#!/usr/bin/env node
// Gates the redirect map (src/data/redirects.json) against the built site.
// Run after a build, with the same BASE_PATH:
//
//   - the map is well formed: unique `from` (also after decoding and
//     case-folding, since macOS checkouts and Pages disagree on case),
//     status 200 / 301 / 410, `to` null exactly when retired
//   - every old sitemap URL (src/data/legacy-sitemap.json) has an entry
//   - 200: a file is built at the old path, and it is a page, not a redirect
//   - 301: a redirect page sits at the old path and refreshes to `to`; an
//     internal `to` is a built page that is not itself a redirect (no chains,
//     no loops) and has the #fragment it names; an external `to` is on a
//     host from src/lib/tools.ts or the map's own externalHosts
//   - 410: nothing is built at the old path, so Pages answers 404
//
// Flags:
//   --strict  also fail while any entry carries a `todo` (run at cutover)
//   --live    also fetch the old site's sitemap.xml and require every URL in
//             it to be covered (useful until cutover; needs the network)
//
// Usage: BASE_PATH=/verify-base/ node scripts/check-redirects.mjs [dist]
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REDIRECTS, EXTERNAL_HOSTS, fileFor, isExternal } from '../src/lib/redirects.mjs';
import { TOOLS, DASHBOARD, PHOTO_EXPLORER } from '../src/lib/tools.ts';
import sitemap from '../src/data/legacy-sitemap.json' with { type: 'json' };

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const live = args.includes('--live');
const dist = args.find((a) => !a.startsWith('--')) || 'dist';
const base = (process.env.BASE_PATH || '/').replace(/\/?$/, '/');

const hosts = new Set([
  ...[...TOOLS.map((t) => t.href), DASHBOARD, PHOTO_EXPLORER].map((h) => new URL(h).host),
  ...EXTERNAL_HOSTS,
]);

const failures = [];
const fail = (msg) => failures.push(msg);

/** One spelling for comparing paths: decoded, `&amp;` undone. */
const norm = (p) => {
  try { return decodeURI(p.replace(/&amp;/g, '&')).replace(/%26/gi, '&'); } catch { return p; }
};

const read = (rel) => {
  const f = join(dist, rel);
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};
const refreshOf = (html) => html?.match(/<meta http-equiv="refresh" content="0; url=([^"]*)">/)?.[1] ?? null;

// ── The map itself ──────────────────────────────────────────────────────────
const seen = new Map();
for (const r of REDIRECTS) {
  const at = `redirects.json ${r.from}`;
  if (typeof r.from !== 'string' || !r.from.startsWith('/')) fail(`${at}: from must be a path starting with /`);
  if (/\s/.test(r.from)) fail(`${at}: write spaces as %20, as the old site served them`);
  const key = norm(r.from).toLowerCase();
  if (seen.has(key)) fail(`${at}: duplicates ${seen.get(key)}`);
  seen.set(key, r.from);
  if (![200, 301, 410].includes(r.status)) fail(`${at}: status ${r.status} is not 200, 301 or 410`);
  if ((r.status === 410) !== (r.to === null)) fail(`${at}: to must be null exactly when status is 410`);
  if (r.status === 200 && r.to !== r.from) fail(`${at}: status 200 means the same path; to is ${r.to}`);
  if (!r.reason || !r.source) fail(`${at}: reason and source are required`);
}

// ── Coverage of the old sitemap ─────────────────────────────────────────────
const covered = new Set(REDIRECTS.map((r) => norm(r.from)));
let oldPaths = sitemap.paths;
if (live) {
  const { CANONICAL_ORIGIN } = await import('../astro.config.mjs');
  const res = await fetch(new URL('sitemap.xml', CANONICAL_ORIGIN + '/'), { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) fail(`live sitemap: HTTP ${res.status}`);
  else {
    const livePaths = [...(await res.text()).matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1].replace(/&amp;/g, '&')).pathname);
    oldPaths = [...new Set([...oldPaths, ...livePaths])];
  }
}
const uncovered = oldPaths.filter((p) => !covered.has(norm(p)));
for (const p of uncovered) fail(`sitemap URL with no entry: ${p}`);

// ── Against the build ───────────────────────────────────────────────────────
if (!existsSync(dist)) fail(`no ${dist}: build first, with the same BASE_PATH`);
const redirectFroms = new Set(REDIRECTS.filter((r) => r.status === 301).map((r) => norm(r.from)));
const counts = { kept: 0, internal: 0, external: 0, retired: 0, todo: 0 };

for (const r of REDIRECTS) {
  const at = r.from;
  const file = fileFor(r.from);
  const html = read(file);
  if (r.todo) counts.todo++;

  if (r.status === 200) {
    counts.kept++;
    if (html === null) fail(`${at}: kept (200) but nothing is built at ${file}`);
    else if (refreshOf(html)) fail(`${at}: kept (200) but ${file} is a redirect page`);
    continue;
  }
  if (r.status === 410) {
    counts.retired++;
    if (html !== null) fail(`${at}: retired (410) but ${file} is built; Pages would answer 200`);
    continue;
  }

  // 301
  const refresh = refreshOf(html);
  if (html === null) { fail(`${at}: no redirect page at ${file}`); continue; }
  if (!refresh) { fail(`${at}: ${file} is a real page on the new site, not a redirect`); continue; }

  if (isExternal(r.to)) {
    counts.external++;
    const host = new URL(r.to).host;
    if (!hosts.has(host)) fail(`${at}: external host ${host} is not in tools.ts or externalHosts`);
    if (refresh !== r.to) fail(`${at}: refreshes to ${refresh}, map says ${r.to}`);
    continue;
  }

  counts.internal++;
  const [path, hash] = r.to.split('#');
  const expected = base + path.replace(/^\//, '') + (hash ? `#${hash}` : '');
  if (refresh !== expected) fail(`${at}: refreshes to ${refresh}, expected ${expected}`);
  if (redirectFroms.has(norm(path))) fail(`${at}: chain, ${path} is itself redirected`);
  if (norm(path) === norm(r.from)) fail(`${at}: redirects to itself`);
  const target = read(fileFor(path));
  if (target === null) fail(`${at}: target ${path} is not built (${fileFor(path)})`);
  else if (refreshOf(target)) fail(`${at}: target ${path} is a redirect page (chain)`);
  else if (hash && !new RegExp(`\\sid="${hash}"`).test(target)) fail(`${at}: target ${path} has no id="${hash}"`);
}

if (strict && counts.todo) {
  for (const r of REDIRECTS.filter((x) => x.todo)) fail(`todo (--strict): ${r.from}: ${r.todo}`);
}

const summary = `${REDIRECTS.length} entries: ${counts.kept} kept, ${counts.internal} redirected on this site, ` +
  `${counts.external} to other sites, ${counts.retired} retired; ${counts.todo} with a todo; ` +
  `${oldPaths.length - uncovered.length}/${oldPaths.length} sitemap URLs covered`;
if (failures.length) {
  console.error(`check-redirects: ${failures.length} problem(s)\n  ` + failures.join('\n  ') + `\n${summary}`);
  process.exit(1);
}
console.log(`check-redirects: ok (base ${base}). ${summary}`);
if (counts.todo && !strict) {
  console.log('  todo before cutover (fails with --strict):');
  for (const r of REDIRECTS.filter((x) => x.todo)) console.log(`    ${r.from}: ${r.todo}`);
}
