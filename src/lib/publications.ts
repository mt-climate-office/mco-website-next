// The publications portal's data (rebuild plan §4.7): each entry in the
// publications collection (a DOI plus what a person decided about it) joined
// to its cached registry record in src/data/publications.json, which
// scripts/publications-refresh.mjs writes from Crossref. The build never
// calls Crossref.
//
// A DOI with no cached record yet (added in the CMS since the last refresh)
// is left out with a build warning rather than failing the deploy;
// `npm run check:publications` fails on it.
import { getCollection } from 'astro:content';
import cache from '../data/publications.json';
import type { Author, Publication, PubType } from './cite';

export { TYPE_LABEL, authorList, licenseLabel, reference } from './cite';
export type { Publication } from './cite';

interface Cached {
  doi: string;
  source: 'crossref' | 'datacite';
  type: PubType;
  title: string;
  authors: Author[];
  issued: number[];
  container?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  articleNumber?: string;
  version?: string;
  issn?: string[];
  url: string;
  abstract?: string[];
  openAccess: 'yes' | 'unknown';
  license?: string;
  retrieved: string;
}

interface EntryData {
  doi: string;
  featured: boolean;
  projects: string[];
  topics: string[];
  pdf?: string;
  note?: string;
  slug?: string;
}

const CACHE = (cache as { items: Record<string, Cached> }).items;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Static files beside the item pages; no slug may take their names.
const RESERVED = new Set(['publications']);
const STOP = new Set(['a', 'an', 'the', 'of', 'and', 'for', 'on', 'in', 'to', 'from', 'across', 'with', 'at', 'by']);

/** ASCII, lowercase, hyphen-separated words. */
const slugWords = (s: string): string[] =>
  s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter(Boolean);

/** "hoylman-2022-drought-assessment": first author, year, two title words. */
function autoSlug(c: Cached): string {
  const first = c.authors[0];
  const who = first ? slugWords('literal' in first ? first.literal : first.family)[0] : undefined;
  const words = slugWords(c.title).filter((w) => !STOP.has(w)).slice(0, 2);
  return [who, c.issued[0], ...words].filter(Boolean).join('-');
}

/** A filter value in the URL: "Machine learning" → "machine-learning". */
export const facetValue = (s: string): string => slugWords(s).join('-');

let memo: Promise<Publication[]> | undefined;

/** Every publication with a cached record, newest first. */
export function getPublications(): Promise<Publication[]> {
  return (memo ??= load());
}

async function load(): Promise<Publication[]> {
  const entries = await getCollection('publications');
  const seenDoi = new Map<string, string>();
  const rows: { data: EntryData; c: Cached; file: string }[] = [];
  for (const e of entries) {
    const data = e.data as EntryData;
    const file = e.filePath ?? e.id;
    const k = data.doi.toLowerCase();
    if (seenDoi.has(k)) throw new Error(`publication DOI ${data.doi} is listed in both ${seenDoi.get(k)} and ${file}`);
    seenDoi.set(k, file);
    const c = CACHE[k];
    if (!c) {
      console.warn(`[publications] ${file}: no cached metadata for ${data.doi}; left out. Run npm run publications:refresh.`);
      continue;
    }
    rows.push({ data, c, file });
  }

  // Slugs: an explicit one wins; otherwise author-year-words, with -2, -3 …
  // on a clash, assigned in DOI order so adding a paper rarely moves another.
  rows.sort((a, b) => a.c.doi.localeCompare(b.c.doi));
  const taken = new Map<string, string>();
  for (const { data, file } of rows) {
    if (data.slug) {
      if (!SLUG.test(data.slug)) throw new Error(`${file}: slug "${data.slug}" must be lowercase letters, digits and single hyphens`);
      if (taken.has(data.slug)) throw new Error(`publication slug "${data.slug}" is set in both ${taken.get(data.slug)} and ${file}`);
      taken.set(data.slug, file);
    }
  }
  const pubs: Publication[] = rows.map(({ data, c, file }) => {
    let slug = data.slug;
    if (!slug) {
      const base = autoSlug(c);
      slug = base;
      for (let n = 2; taken.has(slug) || RESERVED.has(slug); n++) slug = `${base}-${n}`;
      taken.set(slug, file);
    }
    if (RESERVED.has(slug)) throw new Error(`${file}: slug "${slug}" is reserved`);
    return {
      slug,
      doi: c.doi,
      url: c.url,
      title: c.title,
      authors: c.authors,
      issued: c.issued,
      year: c.issued[0]!,
      type: c.type,
      container: c.container,
      publisher: c.publisher,
      volume: c.volume,
      issue: c.issue,
      page: c.page,
      articleNumber: c.articleNumber,
      version: c.version,
      issn: c.issn,
      abstract: c.abstract,
      openAccess: c.openAccess,
      license: c.license,
      source: c.source,
      retrieved: c.retrieved,
      featured: data.featured,
      projects: data.projects,
      // Topics typed in the CMS, de-duplicated without regard to case.
      topics: [...new Map(data.topics.map((t) => [facetValue(t), t])).values()],
      pdf: data.pdf,
      note: data.note,
    };
  });

  const date = (p: Publication) => [p.issued[0] ?? 0, p.issued[1] ?? 0, p.issued[2] ?? 0];
  return pubs.sort((a, b) => {
    const [ay, am, ad] = date(a);
    const [by, bm, bd] = date(b);
    return by! - ay! || bm! - am! || bd! - ad! || a.title.localeCompare(b.title);
  });
}

export const publicationPath = (slug: string): string => `research/publications/${slug}/`;
export const doiUrl = (doi: string): string => `https://doi.org/${doi}`;
