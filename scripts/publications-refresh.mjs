#!/usr/bin/env node
// Fetches the metadata for every DOI in src/content/publications/ and writes
// it to src/data/publications.json (rebuild plan §4.7, option 1). The site
// build reads only that committed file and never calls Crossref, so a build
// works offline and a Crossref outage cannot break a deploy.
//
//   npm run publications:refresh   fetch and write the cache
//   npm run check:publications     offline: exit 1 if a listed DOI has no
//                                  cached record (no network)
//
// Source per DOI: the Crossref REST API (api.crossref.org/works/{doi}). DOIs
// Crossref does not hold, such as the DataCite DOIs Zenodo issues for
// software and data, fall back to the DataCite REST API. Nothing is guessed:
// a field the registry does not supply is left out, open access is "yes"
// only when the registry records a Creative Commons licence on the version
// of record (otherwise "unknown"), and a type with no mapping below stops
// the script rather than being filed under a near miss.
//
// A record whose metadata has not changed keeps its old `retrieved` date, so
// a refresh that finds nothing new leaves the file byte-identical.
//
// Crossref etiquette: a User-Agent with a contact address and the mailto
// parameter put requests in the "polite" pool; requests go one at a time.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import { DOI, normalizeDoi } from '../src/content/_fields.ts';

const ROOT = new URL('..', import.meta.url).pathname;
const LIST_DIR = join(ROOT, 'src/content/publications');
const OUT = join(ROOT, 'src/data/publications.json');
const MAILTO = 'state.climatologist@umontana.edu';
const UA = `mco-website-next/1.0 (Montana Climate Office website; mailto:${MAILTO})`;

/* ─── The DOI list ──────────────────────────────────────────────────── */

/** Every DOI in src/content/publications/*.md front matter, in file order. */
export function listedDois() {
  const out = [];
  for (const name of readdirSync(LIST_DIR).sort()) {
    if (!name.endsWith('.md') || name.startsWith('_')) continue;
    const text = readFileSync(join(LIST_DIR, name), 'utf8');
    const fm = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
    const doi = normalizeDoi(String(YAML.parse(fm ?? '')?.doi ?? ''));
    if (!DOI.test(doi)) throw new Error(`${name}: no valid doi in front matter`);
    out.push({ file: name, doi });
  }
  return out;
}

const key = (doi) => doi.toLowerCase();

function readCache() {
  try { return JSON.parse(readFileSync(OUT, 'utf8')); } catch { return { items: {} }; }
}

/* ─── Offline check ─────────────────────────────────────────────────── */

if (process.argv.includes('--check')) {
  const { items = {} } = readCache();
  const missing = listedDois().filter(({ doi }) => !items[key(doi)]);
  if (missing.length) {
    console.error('check-publications: no cached metadata for\n  ' +
      missing.map((m) => `${m.doi} (${m.file})`).join('\n  ') +
      '\nRun `npm run publications:refresh` and commit src/data/publications.json.');
    process.exit(1);
  }
  console.log(`check-publications: all ${listedDois().length} listed DOIs are cached`);
  process.exit(0);
}

/* ─── Fetching ──────────────────────────────────────────────────────── */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** GET JSON; null on 404; one retry on 429/5xx or a network error. */
async function getJson(url) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (err) {
      if (attempt === 0) { await sleep(2000); continue; }
      throw err;
    }
    if (res.status === 404) return null;
    if (res.ok) return res.json();
    if (attempt === 0 && (res.status === 429 || res.status >= 500)) {
      await sleep(Number(res.headers.get('retry-after')) * 1000 || 2000);
      continue;
    }
    throw new Error(`${url}: HTTP ${res.status}`);
  }
}

/* ─── Normalizing ───────────────────────────────────────────────────── */

const CROSSREF_TYPES = {
  'journal-article': 'article',
  'proceedings-article': 'article',
  report: 'report',
  'report-component': 'report',
  'report-series': 'report',
  dataset: 'dataset',
  database: 'dataset',
  dissertation: 'thesis',
};
const DATACITE_TYPES = {
  JournalArticle: 'article',
  ConferencePaper: 'article',
  Report: 'report',
  Dataset: 'dataset',
  Software: 'software',
  ComputationalNotebook: 'software',
  Dissertation: 'thesis',
};

const CC = /^https?:\/\/creativecommons\.org\/(licenses|publicdomain)\//i;

/** Collapses whitespace and decodes the entities registries leave in text. */
function clean(s) {
  return String(s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '+': '⁺', '-': '⁻', '−': '⁻' };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '+': '₊', '-': '₋', '−': '₋' };

/** "km<sup>2</sup>" as "km²"; a script with no Unicode form as "^(…)". */
function scripts(s) {
  const conv = (map, mark) => (_, body) => {
    const t = body.replace(/<[^>]+>/g, '').trim();
    return [...t].every((c) => map[c]) ? [...t].map((c) => map[c]).join('') : `${mark}(${t})`;
  };
  return s
    .replace(/<(?:jats:)?sup>([\s\S]*?)<\/(?:jats:)?sup>/gi, conv(SUP, '^'))
    .replace(/<(?:jats:)?sub>([\s\S]*?)<\/(?:jats:)?sub>/gi, conv(SUB, '_'));
}

// Inline markup is dropped without a space, so "<i>in situ</i>" stays one
// phrase; any other tag becomes a space.
const INLINE = /<\/?(?:jats:)?(?:italic|bold|sc|underline|monospace|i|b|em|strong|span)\b[^>]*>/gi;

/** Plain-text paragraphs from a JATS (or HTML) abstract. */
function abstractParagraphs(xml) {
  if (!xml) return undefined;
  const parts = scripts(String(xml))
    .replace(/<jats:title>[\s\S]*?<\/jats:title>/gi, '')
    .split(/<\/(?:jats:)?p>/i)
    .map((p) => clean(p.replace(INLINE, '').replace(/<[^>]+>/g, ' ')).replace(/\s+([,.;:)])/g, '$1').replace(/\(\s+/g, '('))
    .filter(Boolean);
  // A lone leading "Abstract" heading written as text, not markup.
  if (/^abstract$/i.test(parts[0] ?? '')) parts.shift();
  return parts.length ? parts : undefined;
}

const datePartsOf = (d) => d?.['date-parts']?.[0]?.filter((n) => Number.isInteger(n));

function fromCrossref(m) {
  const type = CROSSREF_TYPES[m.type];
  if (!type) throw new Error(`${m.DOI}: Crossref type "${m.type}" has no mapping in CROSSREF_TYPES`);
  const issued = datePartsOf(m.issued) ?? datePartsOf(m['published-print']) ?? datePartsOf(m['published-online']);
  if (!issued?.[0]) throw new Error(`${m.DOI}: Crossref record has no issued year`);
  const now = Date.now();
  const licences = (m.license ?? []).map((l) => ({
    url: l.URL,
    version: l['content-version'],
    start: l.start?.['date-time'],
  }));
  const open = licences.find((l) => CC.test(l.url) && (l.version === 'vor' || l.version === 'unspecified') &&
    (!l.start || Date.parse(l.start) <= now));
  return {
    doi: m.DOI,
    source: 'crossref',
    crossrefType: m.type,
    type,
    title: clean([m.title?.[0], m.subtitle?.[0]].filter(Boolean).join(': ')),
    authors: (m.author ?? []).map((a) => a.family
      ? { family: clean(a.family), ...(a.given ? { given: clean(a.given) } : {}), ...(a.ORCID ? { orcid: a.ORCID.replace(/^https?:\/\/orcid\.org\//, '') } : {}) }
      : { literal: clean(a.name ?? '') }).filter((a) => a.family || a.literal),
    issued,
    ...(m['container-title']?.[0] ? { container: clean(m['container-title'][0]) } : {}),
    ...(m.publisher ? { publisher: clean(m.publisher) } : {}),
    ...(m.volume ? { volume: String(m.volume) } : {}),
    ...(m.issue ? { issue: String(m.issue) } : {}),
    ...(m.page ? { page: String(m.page) } : {}),
    ...(m['article-number'] ? { articleNumber: String(m['article-number']) } : {}),
    ...(m.ISSN?.length ? { issn: m.ISSN } : {}),
    url: `https://doi.org/${m.DOI}`,
    ...(abstractParagraphs(m.abstract) ? { abstract: abstractParagraphs(m.abstract) } : {}),
    openAccess: open ? 'yes' : 'unknown',
    ...(open ? { license: open.url } : {}),
  };
}

function fromDatacite(d) {
  const a = d.attributes;
  const general = a.types?.resourceTypeGeneral;
  const type = DATACITE_TYPES[general];
  if (!type) throw new Error(`${a.doi}: DataCite resourceTypeGeneral "${general}" has no mapping in DATACITE_TYPES`);
  if (!a.publicationYear) throw new Error(`${a.doi}: DataCite record has no publicationYear`);
  const open = (a.rightsList ?? []).find((r) => CC.test(r.rightsUri ?? ''));
  const abstract = (a.descriptions ?? []).find((x) => x.descriptionType === 'Abstract')?.description;
  return {
    doi: a.doi,
    source: 'datacite',
    dataciteType: general,
    type,
    title: clean(a.titles?.[0]?.title ?? ''),
    authors: (a.creators ?? []).map((c) => c.familyName
      ? { family: clean(c.familyName), ...(c.givenName ? { given: clean(c.givenName) } : {}) }
      : { literal: clean(c.name ?? '') }).filter((x) => x.family || x.literal),
    issued: [Number(a.publicationYear)],
    ...(a.publisher ? { publisher: clean(typeof a.publisher === 'string' ? a.publisher : a.publisher.name) } : {}),
    ...(a.version ? { version: String(a.version) } : {}),
    url: `https://doi.org/${a.doi}`,
    ...(abstractParagraphs(abstract) ? { abstract: abstractParagraphs(abstract) } : {}),
    openAccess: open ? 'yes' : 'unknown',
    ...(open ? { license: open.rightsUri } : {}),
  };
}

async function fetchRecord(doi) {
  const q = `mailto=${encodeURIComponent(MAILTO)}`;
  const cr = await getJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}?${q}`);
  if (cr?.message) return fromCrossref(cr.message);
  const dc = await getJson(`https://api.datacite.org/dois/${encodeURIComponent(doi)}`);
  if (dc?.data) return fromDatacite(dc.data);
  throw new Error(`${doi}: neither Crossref nor DataCite has this DOI`);
}

/* ─── Main ──────────────────────────────────────────────────────────── */

const listed = listedDois();
const old = readCache().items ?? {};
const today = new Date().toISOString().slice(0, 10);
const items = {};
const failed = [];
const counts = { fetched: 0, changed: 0, kept: 0 };

for (const { doi, file } of listed) {
  const k = key(doi);
  if (items[k]) throw new Error(`${file}: DOI ${doi} is listed twice`);
  try {
    const rec = await fetchRecord(doi);
    counts.fetched++;
    const prev = old[k];
    const { retrieved: _r, ...prevBody } = prev ?? {};
    const same = prev && JSON.stringify(prevBody) === JSON.stringify(rec);
    if (!same) counts.changed++;
    items[k] = { ...rec, retrieved: same ? prev.retrieved : today };
    console.log(`  ok   ${doi}  ${rec.source}  ${rec.type}  ${rec.issued[0]}  abstract:${rec.abstract ? 'yes' : 'no'}  open:${rec.openAccess}${same ? '' : '  (updated)'}`);
  } catch (err) {
    // Keep the last good record rather than dropping a publication from the
    // site because a registry hiccupped.
    if (old[k]) { items[k] = old[k]; counts.kept++; }
    failed.push(`${doi} (${file}): ${err.message}${old[k] ? ' — kept the cached record' : ''}`);
    console.log(`  FAIL ${doi}  ${err.message}`);
  }
  await sleep(250);
}

const sorted = Object.fromEntries(Object.keys(items).sort().map((k) => [k, items[k]]));
const doc = {
  $comment: 'GENERATED by scripts/publications-refresh.mjs from Crossref and DataCite. Do not edit; edit src/content/publications/ and refresh.',
  items: sorted,
};
writeFileSync(OUT, JSON.stringify(doc, null, 2) + '\n');
console.log(`publications-refresh: ${listed.length} listed, ${counts.fetched} fetched, ${counts.changed} new or changed, ` +
  `${Object.keys(sorted).length} written to src/data/publications.json`);
if (failed.length) {
  console.error(`publications-refresh: ${failed.length} failed\n  ${failed.join('\n  ')}`);
  process.exit(1);
}
