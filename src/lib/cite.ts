// Citation formats for the publications portal (rebuild plan §4.7): a plain
// reference line, BibTeX and CSL-JSON, from one Publication record. Pure
// functions with no Astro imports, so Node can load this file directly.

export type PubType = 'article' | 'report' | 'dataset' | 'software' | 'thesis';

export type Author = { family: string; given?: string; orcid?: string } | { literal: string };

export interface Publication {
  /** URL segment under /research/publications/. */
  slug: string;
  doi: string;
  /** https://doi.org/<doi> */
  url: string;
  title: string;
  authors: Author[];
  /** [year, month?, day?] as the registry gives it. */
  issued: number[];
  year: number;
  type: PubType;
  container?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  page?: string;
  articleNumber?: string;
  version?: string;
  issn?: string[];
  abstract?: string[];
  openAccess: 'yes' | 'unknown';
  license?: string;
  source: 'crossref' | 'datacite';
  retrieved: string;
  // From the CMS entry.
  featured: boolean;
  projects: string[];
  topics: string[];
  pdf?: string;
  note?: string;
}

export const TYPE_LABEL: Record<PubType, string> = {
  article: 'Article',
  report: 'Report',
  dataset: 'Dataset',
  software: 'Software',
  thesis: 'Thesis',
};

/** "Zachary H. Hoylman" */
export const authorName = (a: Author): string =>
  'literal' in a ? a.literal : [a.given, a.family].filter(Boolean).join(' ');

/** "Ada P. Smith, Laurie Yung and Adam J. Snitker"; past `max`, "… and 10 others"
    (never "and 1 others": one name over is shown). */
export function authorList(authors: Author[], max = Infinity): string {
  const names = authors.map(authorName);
  if (names.length > max + 1) return `${names.slice(0, max).join(', ')} and ${names.length - max} others`;
  if (names.length < 2) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** "R. Kyle" → "R. K."; "Britt-Anne" → "B.-A."; a nickname in parentheses is dropped. */
const initials = (given: string): string =>
  given.replace(/\([^)]*\)/g, ' ').trim().split(/\s+/).filter(Boolean)
    .map((w) => w.split('-').map((p) => `${p.charAt(0).toUpperCase()}.`).join('-'))
    .join(' ');

const refName = (a: Author): string =>
  'literal' in a ? a.literal : a.given ? `${a.family}, ${initials(a.given)}` : a.family;

/** "CC BY 4.0" from a Creative Commons licence URL; undefined for anything else. */
export function licenseLabel(url?: string): string | undefined {
  if (!url) return undefined;
  if (/creativecommons\.org\/publicdomain\/zero\//i.test(url)) return 'CC0';
  const m = url.match(/creativecommons\.org\/licenses\/([a-z-]+)\/(\d+(?:\.\d+)?)/i);
  return m ? `CC ${m[1]!.toUpperCase()} ${m[2]}` : undefined;
}

/**
 * One reference line, in the author–date shape most journals in the field
 * use: "Hoylman, Z. H., Bocinsky, R. K., & Jencso, K. G. (2022). Title.
 * Journal, 13(1), 2715. https://doi.org/…". Plain text, no italics.
 */
export function reference(p: Publication): string {
  const names = p.authors.map(refName);
  const who = names.length < 2 ? (names[0] ?? '')
    : names.length === 2 ? `${names[0]}, & ${names[1]}`
    : `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;
  const title = /[.?!]$/.test(p.title) ? p.title : `${p.title}.`;
  let where = p.container ?? p.publisher ?? '';
  if (p.container) {
    if (p.volume) where += `, ${p.volume}${p.issue ? `(${p.issue})` : ''}`;
    const loc = p.articleNumber ?? p.page;
    if (loc) where += `, ${loc.replace(/-/g, '–')}`;
  } else if (p.version) {
    where += `${where ? ', ' : ''}version ${p.version}`;
  }
  return [who ? `${who.replace(/\.$/, '')}.` : '', `(${p.year}).`, title, where ? `${where}.` : '', p.url]
    .filter(Boolean).join(' ');
}

/* ─── BibTeX ────────────────────────────────────────────────────────── */

const BIB_TYPE: Record<PubType, string> = {
  article: 'article',
  report: 'techreport',
  dataset: 'misc',
  software: 'misc',
  thesis: 'misc',
};

/** Escapes BibTeX's special characters; Unicode stays (biber and bibtex8 read it). */
const bibEscape = (s: string): string =>
  s.replace(/\\/g, '\\textbackslash{}')
    .replace(/[{}]/g, '')
    .replace(/([&%$#_])/g, '\\$1')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');

const bibName = (a: Author): string =>
  'literal' in a ? `{${bibEscape(a.literal)}}` : a.given ? `${bibEscape(a.family)}, ${bibEscape(a.given)}` : bibEscape(a.family);

/** One BibTeX entry; the key is the page slug. */
export function bibtex(p: Publication): string {
  const fields: [string, string | undefined][] = [
    ['author', p.authors.map(bibName).join(' and ') || undefined],
    // Double braces keep the title's capitalization through bibliography styles.
    ['title', `{${bibEscape(p.title)}}`],
    [p.type === 'article' ? 'journal' : 'howpublished', p.container ? bibEscape(p.container) : undefined],
    [p.type === 'report' ? 'institution' : 'publisher', p.publisher ? bibEscape(p.publisher) : undefined],
    ['year', String(p.year)],
    ['volume', p.volume ? bibEscape(p.volume) : undefined],
    ['number', p.issue ? bibEscape(p.issue) : undefined],
    ['pages', (p.articleNumber ?? p.page)?.replace(/-/g, '--')],
    ['version', p.version ? bibEscape(p.version) : undefined],
    ['type', p.type === 'thesis' ? 'Thesis' : p.type === 'dataset' ? 'Dataset' : p.type === 'software' ? 'Software' : undefined],
    ['doi', bibEscape(p.doi)],
    ['url', p.url],
  ];
  const body = fields.filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`).join(',\n');
  return `@${BIB_TYPE[p.type]}{${p.slug},\n${body}\n}\n`;
}

/* ─── CSL-JSON ──────────────────────────────────────────────────────── */

const CSL_TYPE: Record<PubType, string> = {
  article: 'article-journal',
  report: 'report',
  dataset: 'dataset',
  software: 'software',
  thesis: 'thesis',
};

/** One CSL-JSON item (citation-style-language schema, csl-data.json). */
export function csl(p: Publication): Record<string, unknown> {
  const item: Record<string, unknown> = {
    id: p.slug,
    type: CSL_TYPE[p.type],
    title: p.title,
    author: p.authors.map((a) => ('literal' in a ? { literal: a.literal } : { family: a.family, ...(a.given ? { given: a.given } : {}) })),
    issued: { 'date-parts': [p.issued] },
    DOI: p.doi,
    URL: p.url,
  };
  if (p.container) item['container-title'] = p.container;
  if (p.publisher) item.publisher = p.publisher;
  if (p.volume) item.volume = p.volume;
  if (p.issue) item.issue = p.issue;
  if (p.page) item.page = p.page;
  if (p.articleNumber) item.number = p.articleNumber;
  if (p.version) item.version = p.version;
  if (p.issn?.length) item.ISSN = p.issn[0];
  if (p.abstract) item.abstract = p.abstract.join('\n\n');
  if (p.license) item.license = p.license;
  return item;
}
