// The one definition of each content collection's shape (DECISIONS D13).
//
// Each field primitive carries both its Zod type and its Pages CMS
// presentation. toZod() builds what src/content.config.ts validates front
// matter against; toCms() builds what scripts/generate-pages-yml.mjs writes
// into .pages.yml. Edit this file, then run `npm run gen:cms`. Never edit
// .pages.yml by hand: CI runs `npm run check:cms` and fails if it is stale.
//
// Node imports this file directly (type stripping) when it generates
// .pages.yml, so: Zod comes from 'astro/zod', not the 'astro:content' virtual
// module, and only erasable TypeScript syntax is allowed (no enums, no
// parameter properties, no namespaces).
//
// Content versus data (CLAUDE.md, rebuild plan §4.6): a field belongs here
// only if a person decides its value. Anything the network knows (station or
// camera counts, percentages, schedules) is rendered by a component and must
// never be typeable in the CMS.
import { z } from 'astro/zod';

/* ─── Field primitives ──────────────────────────────────────────────── */

/** One entry in a Pages CMS `fields:` list. */
export interface CmsField {
  name: string;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  /** A repeatable field: the CMS edits a list of values. */
  list?: boolean;
  options?: {
    values?: string[];
    multiple?: boolean;
    /** image: the named media source uploads go to (STATIC_CONFIG.media). */
    media?: string;
    /** reference: the collection, and templates for what is stored and shown. */
    collection?: string;
    value?: string;
    label?: string;
    search?: string;
  };
}

export interface Field {
  zod: z.ZodType;
  cms: CmsField;
}

type Opts = Partial<Omit<CmsField, 'name' | 'type'>>;

const field = (zod: z.ZodType, cms: CmsField): Field => ({ zod, cms });
const optional = (o: Opts) => o.required === false;

/** One line of text. */
export const text = (name: string, o: Opts = {}): Field =>
  field(optional(o) ? z.string().optional() : z.string().min(1),
    { name, type: 'string', required: !optional(o), ...o });

/** A paragraph of plain text (a textarea in the CMS). */
export const longtext = (name: string, o: Opts = {}): Field =>
  field(optional(o) ? z.string().optional() : z.string().min(1),
    { name, type: 'text', required: !optional(o), ...o });

/**
 * A calendar date. Front matter dates are YYYY-MM-DD strings (Pages CMS's
 * default format); YAML parses them to a Date at 00:00 UTC, so a page shows
 * them with calendar-date formatting, not as an instant (src/lib/news.ts).
 */
export const date = (name: string, o: Opts = {}): Field =>
  field(z.coerce.date(), { name, type: 'date', required: true, ...o });

export const bool = (name: string, def: boolean, o: Opts = {}): Field =>
  field(z.boolean().default(def),
    { name, type: 'boolean', required: false, default: def, ...o });

/** One value from a fixed list. The only clean one-to-one Zod/CMS mapping. */
export const select = (name: string, values: readonly [string, ...string[]], o: Opts = {}): Field =>
  field(optional(o) ? z.enum(values).optional() : z.enum(values),
    { name, type: 'select', required: !optional(o), options: { values: [...values] }, ...o });

/** Several values from a fixed list (a multi-select in the CMS). */
export const multiselect = (name: string, values: readonly [string, ...string[]], o: Opts = {}): Field =>
  field(z.array(z.enum(values)).default([]),
    { name, type: 'select', required: false, options: { values: [...values], multiple: true }, ...o });

/** A list of short free-text values, such as tags. */
export const textList = (name: string, o: Opts = {}): Field =>
  field(z.array(z.string().trim().min(1)).default([]),
    { name, type: 'string', required: false, list: true, ...o });

/** An optional https:// address. */
export const link = (name: string, o: Opts = {}): Field =>
  field(z.string().regex(/^https:\/\/\S+$/, 'must be a full https:// address').optional(),
    { name, type: 'string', required: false, ...o });

/**
 * An image in public/, written as a root-relative path such as
 * /images/news/2026-10-dillon.jpg. The newsletter renderer resolves that
 * against the production origin, and the site's Markdown pipeline against
 * the base path (docs/newsletter.md, Images). Relative paths are refused.
 */
export const image = (name: string, o: Opts = {}): Field =>
  field(z.string().regex(/^\/(?!\/)\S+$/, 'must be a root-relative path in public/, such as /images/news/photo.jpg').optional(),
    { name, type: 'image', required: false, ...o });

/** Cross-field rule: alt text whenever the image is set. */
const altRequired = (img: string, alt: string) =>
  (s: z.ZodObject<z.ZodRawShape>) => s.refine(
    (d: Record<string, unknown>) => !d[img] || !!d[alt],
    { message: `${alt} is required when ${img} is set`, path: [alt] });

/** A whole number, such as a sort position. */
export const int = (name: string, def: number, o: Opts = {}): Field =>
  field(z.number().int().default(def),
    { name, type: 'number', required: false, default: def, ...o });

/** An optional email address. */
export const email = (name: string, o: Opts = {}): Field =>
  field(z.string().trim().pipe(z.email('must be an email address such as name@umontana.edu')).optional(),
    { name, type: 'string', required: false, ...o });

/** Lowercase letters, digits and single hyphens: one segment of a URL. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A URL slug that other entries refer to. Required, and fixed once
 * published: pages and references use it, so changing it breaks links.
 */
export const slug = (name: string, o: Opts = {}): Field =>
  field(z.string().trim().regex(SLUG, 'must be lowercase letters, digits and single hyphens, such as ngp-ridr'),
    { name, type: 'string', required: true, ...o });

/**
 * Entries of another collection, chosen by name in the CMS and stored as
 * that entry's `slug` (Pages CMS reference field). The build checks that each
 * slug exists (src/lib/projects.ts); Zod only checks the shape.
 */
export const references = (name: string, collection: string, o: Opts = {}): Field =>
  field(z.array(z.string().trim().regex(SLUG, 'must be the slug of an entry')).default([]),
    {
      name, type: 'reference', required: false,
      options: { collection, multiple: true, value: '{fields.slug}', label: '{fields.name}', search: 'name,slug' },
      ...o,
    });

/**
 * The Markdown body. In the CMS, never in the Zod schema: Astro keeps the
 * body separate from front matter.
 */
export const body = (o: Opts = {}): Field =>
  ({ zod: z.never().optional(), cms: { name: 'body', type: 'rich-text', required: false, ...o } });

const BODY = 'body';

/* ─── Assembly ──────────────────────────────────────────────────────── */

export interface CollectionDef {
  /** Directory, relative to the repo root. */
  path: string;
  label: string;
  /** File name pattern for new entries in the CMS. */
  filename?: string;
  /** Columns in the CMS's list of entries. */
  view?: string[];
  /** The field the CMS names an entry by, and uses for {primary} in
      `filename`. Pages CMS's default is `title`. */
  primary?: string;
  /** What the collection is for, shown above its entries in the CMS. */
  description?: string;
  fields: Field[];
  /** Cross-field rules Zod enforces and the CMS cannot express. */
  refine?: (schema: z.ZodObject<z.ZodRawShape>) => z.ZodType;
  /** The same rules in words, written into the CMS entry's description. */
  refineNote?: string;
}

/** The Zod schema Astro validates front matter against. */
export function toZod(def: CollectionDef): z.ZodType {
  const shape: Record<string, z.ZodType> = {};
  for (const { zod, cms } of def.fields) {
    if (cms.name !== BODY) shape[cms.name] = zod;
  }
  const obj = z.object(shape);
  return def.refine ? def.refine(obj) : obj;
}

/** The Pages CMS field list. */
export function toCms(def: CollectionDef): CmsField[] {
  return def.fields.map(({ cms }) => cms);
}

/* ─── The collections ───────────────────────────────────────────────── */

/** A DOI as Crossref and doi.org write it: prefix 10.<registrant>/suffix. */
export const DOI = /^10\.\d{4,9}\/\S+$/;

/** Strips what people paste around a DOI: a doi.org link or a "doi:" prefix. */
export const normalizeDoi = (s: string): string =>
  s.trim().replace(/^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)/i, '');

/** Team page groups, in page order. Labels are the page's headings. */
export const PEOPLE_GROUPS = ['staff', 'students', 'affiliates'] as const;
export const PEOPLE_GROUP_LABELS: Record<(typeof PEOPLE_GROUPS)[number], string> = {
  staff: 'Staff',
  students: 'Students',
  affiliates: 'Affiliates',
};

/** Where a partner is listed on /about/partnerships/. */
export const PARTNER_ROLES = ['partner', 'sponsor'] as const;

export const PROJECT_STATUSES = ['active', 'completed'] as const;

/** News categories. Labels are what the site shows. */
export const NEWS_CATEGORIES = ['newsletter', 'announcement', 'event-report', 'research'] as const;
export const NEWS_CATEGORY_LABELS: Record<(typeof NEWS_CATEGORIES)[number], string> = {
  newsletter: 'Newsletter',
  announcement: 'Announcement',
  'event-report': 'Event report',
  research: 'Research',
};

export const collectionDefs: Record<string, CollectionDef> = {
  // Front matter the newsletter needs is fixed by docs/newsletter.md:
  // title, date, summary, image, imageAlt, draft, email, slug. Renaming any
  // of them breaks scripts/newsletter/.
  news: {
    path: 'src/content/news',
    label: 'News',
    // newsSlug() in src/lib/news.ts strips this date prefix to make the URL.
    filename: '{year}-{month}-{day}-{primary}.md',
    view: ['title', 'date', 'category', 'draft', 'email'],
    fields: [
      text('title'),
      date('date', {
        description: 'Publication date. A post dated in the future is not emailed until that day.',
      }),
      select('category', NEWS_CATEGORIES, { label: 'Category' }),
      longtext('summary', {
        description: 'One or two sentences. Shown in the news list, search results and link previews, and as the email preview line.',
      }),
      image('image', {
        label: 'Header image',
        description: 'Optional. Shown above the post and as the email banner.',
        options: { media: 'news' },
      }),
      text('imageAlt', {
        required: false,
        label: 'Header image alt text',
        description: 'Required whenever a header image is set. Say what the image shows.',
      }),
      bool('draft', false, {
        description: 'A draft is left out of the site and never emailed.',
      }),
      select('email', ['pending', 'sent'], {
        required: false,
        label: 'Email to subscribers',
        description: 'Choose "pending" to email this post to the MCO News list once it is published and not a draft. ' +
          'The newsletter workflow changes it to "sent" after sending. Never choose "sent" yourself. ' +
          'Leave it empty for a post that should not be emailed.',
      }),
      text('slug', {
        required: false,
        label: 'URL slug',
        description: 'Optional. Overrides the address taken from the file name. Changing it on a published post breaks links to it.',
      }),
      body(),
    ],
    refine: altRequired('image', 'imageAlt'),
    refineNote:
      'Header image alt text is required whenever a header image is set. ' +
      'The CMS cannot check this; the site build fails without it.',
  },

  // The publications portal (rebuild plan §4.7). One file per publication,
  // holding its DOI and what only a person can say about it. Title, authors,
  // venue, year, type, abstract and licence are Crossref's (or DataCite's),
  // fetched by scripts/publications-refresh.mjs into
  // src/data/publications.json. They are data, so they are not typeable here.
  publications: {
    path: 'src/content/publications',
    label: 'Publications',
    description:
      'One entry per publication. Paste its DOI; the title, authors, journal, year and abstract come from ' +
      'Crossref when the publication list is refreshed, so they are not typed here. A new DOI appears on the ' +
      'site after the next refresh (npm run publications:refresh).',
    // Pages CMS slugifies {primary}, so a new entry's file is named after its DOI.
    filename: '{primary}.md',
    primary: 'doi',
    view: ['doi', 'featured', 'projects'],
    fields: [
      field(
        z.string().trim().transform(normalizeDoi).pipe(z.string().regex(DOI, 'must be a DOI such as 10.1038/s41467-022-30316-5')),
        {
          name: 'doi',
          type: 'string',
          label: 'DOI',
          required: true,
          description: 'Such as 10.1038/s41467-022-30316-5. A doi.org link works too.',
        }),
      bool('featured', false, {
        description: 'Featured publications are listed on the Research page as well as the publications list.',
      }),
      // One source for the list of projects: the projects collection. The
      // CMS offers its entries by name and stores each one's slug.
      references('projects', 'projects', {
        label: 'Projects',
        description: 'Office projects this publication came out of. Leave empty if none. ' +
          'The publication is then listed on each project\'s page.',
      }),
      textList('topics', {
        label: 'Topics',
        description: 'Short subject terms for the topic filter, such as Drought or Soil moisture. Reuse a term ' +
          'already in use where one fits, so the filter stays short.',
      }),
      link('pdf', {
        label: 'PDF address',
        description: 'Optional. A full https:// address of a PDF anyone can read, such as an open-access copy.',
      }),
      longtext('note', {
        required: false,
        label: 'Note',
        description: 'Optional. One or two sentences shown on the publication page, such as what data it uses.',
      }),
      text('slug', {
        required: false,
        label: 'URL slug',
        description: 'Optional. Overrides the address made from the first author, year and title. ' +
          'Changing it on a published entry breaks links to it.',
      }),
    ],
  },

  // The team page, /about/team/ (rebuild plan §4.6). One file per person,
  // migrated from mco-website/_data/team.yml. The bio is the Markdown body,
  // in the person's own words.
  people: {
    path: 'src/content/people',
    label: 'People',
    description:
      'One entry per person on the team page (/about/team/). The bio is the body text. ' +
      'Untick "Current" when someone leaves; the page lists current people only.',
    filename: '{primary}.md',
    primary: 'name',
    view: ['name', 'role', 'group', 'current', 'order'],
    fields: [
      text('name'),
      text('role', { label: 'Position or title' }),
      select('group', PEOPLE_GROUPS, {
        label: 'Group',
        description: 'The heading the person is listed under on the team page.',
      }),
      int('order', 100, {
        label: 'Order',
        description: 'Position within the group: lower numbers come first.',
      }),
      bool('current', true, {
        label: 'Current',
        description: 'Untick when the person leaves. Former people are not listed.',
      }),
      image('photo', {
        label: 'Photo',
        description: 'Optional. A square crop, at least 320 pixels wide.',
        options: { media: 'people' },
      }),
      text('photoAlt', {
        required: false,
        label: 'Photo alt text',
        description: 'Required whenever a photo is set, such as "Portrait of Jane Doe".',
      }),
      email('email', { label: 'Email' }),
      field(z.string().trim().regex(/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/, 'must be an ORCID iD such as 0000-0002-1825-0097').optional(), {
        name: 'orcid',
        type: 'string',
        required: false,
        label: 'ORCID iD',
        description: 'Optional. The 16-character iD only, such as 0000-0002-1825-0097.',
      }),
      link('github', { label: 'GitHub profile', description: 'Optional. A full https://github.com/ address.' }),
      link('website', { label: 'Website', description: 'Optional. A full https:// address.' }),
      body({ label: 'Bio' }),
    ],
    refine: altRequired('photo', 'photoAlt'),
    refineNote:
      'Photo alt text is required whenever a photo is set. ' +
      'The CMS cannot check this; the site build fails without it.',
  },

  // Partners, sponsors and project partners (rebuild plan §4.6). The old
  // site's /about/partnerships/ and /about/sponsors/ pages, and the
  // organizations each project names on its own site. One file each.
  partners: {
    path: 'src/content/partners',
    label: 'Partners',
    description:
      'Organizations the office works with or is funded by. "Listed as" puts one on the Partners page ' +
      '(/about/partnerships/); a project lists the partners it names whether or not they are listed there.',
    filename: '{primary}.md',
    primary: 'name',
    view: ['name', 'roles', 'slug'],
    fields: [
      text('name'),
      slug('slug', {
        label: 'Slug',
        description: 'Short lowercase id that projects use to refer to this partner, such as noaa. ' +
          'Do not change it once projects use it.',
      }),
      link('url', { label: 'Website', description: 'Optional. A full https:// address.' }),
      multiselect('roles', PARTNER_ROLES, {
        label: 'Listed as',
        description: 'Partner, sponsor, both, or neither (named on project pages only).',
      }),
      image('logo', {
        label: 'Logo',
        description: 'Optional. Always shown beside the printed name, so it carries no alt text of its own.',
        options: { media: 'partners' },
      }),
      longtext('note', {
        required: false,
        label: 'Note',
        description: 'Optional. One or two sentences on what the partnership is. Shown on the Partners page.',
      }),
    ],
  },

  // Projects at /projects/ and /projects/<slug>/ (rebuild plan §4.2, §4.6).
  // A project page lists the publications whose `projects` name it (§4.7).
  projects: {
    path: 'src/content/projects',
    label: 'Projects',
    description:
      'One entry per project. The page is /projects/<slug>/. Describe the project, not the office (docs/VOICE.md). ' +
      'Publications are listed on the page from the Publications collection, not typed here.',
    filename: '{primary}.md',
    primary: 'name',
    view: ['name', 'status', 'slug'],
    fields: [
      text('name', { description: 'The full name, such as Northern Great Plains Regional Incubator for Drought Resiliency.' }),
      text('shortName', {
        required: false,
        label: 'Short name',
        description: 'Optional. Used in lists and filters, such as NGP RIDR.',
      }),
      slug('slug', {
        label: 'Slug',
        description: 'The page address, /projects/<slug>/, and the id publications use. ' +
          'Changing it on a published project breaks links to it.',
      }),
      longtext('summary', {
        description: 'One or two sentences. Shown in the project list and link previews.',
      }),
      select('status', PROJECT_STATUSES, { label: 'Status' }),
      link('url', { label: 'Project website', description: 'Optional. A full https:// address.' }),
      references('partners', 'partners', {
        label: 'Partners and funders',
        description: 'Organizations from the Partners collection, listed on the project page.',
      }),
      image('image', {
        label: 'Image',
        description: 'Optional. Shown at the top of the project page.',
        options: { media: 'projects' },
      }),
      text('imageAlt', {
        required: false,
        label: 'Image alt text',
        description: 'Required whenever an image is set. Say what the image shows.',
      }),
      textList('sources', {
        label: 'Sources',
        description: 'Where the facts on the page come from: a web address or a file. Not shown on the site; ' +
          'for reviewers. Every claim should have one (docs/VOICE.md, Claims).',
      }),
      body(),
    ],
    refine: altRequired('image', 'imageAlt'),
    refineNote:
      'Image alt text is required whenever an image is set. ' +
      'The CMS cannot check this; the site build fails without it.',
  },
};
