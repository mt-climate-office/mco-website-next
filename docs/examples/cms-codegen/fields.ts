/**
 * Single source of truth for content shape.
 *
 * Produces BOTH the Zod schema Astro validates against and the field config
 * Pages CMS renders. Do not hand-edit `.pages.yml` — run `npm run gen:cms`.
 *
 * Reference sketch for mco-website-next. Adapt; do not paste blindly.
 */

import { z } from 'astro:content';

/* ─── Field primitives ──────────────────────────────────────────────── */

export type CmsField = {
  name: string;
  type: string;
  label?: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  options?: { values?: string[]; multiple?: boolean };
};

export type Field = {
  zod: z.ZodTypeAny;
  cms: CmsField;
};

const f = (zod: z.ZodTypeAny, cms: CmsField): Field => ({ zod, cms });

export const text = (name: string, o: Partial<CmsField> = {}) =>
  f(o.required === false ? z.string().optional() : z.string(),
    { name, type: 'string', required: o.required ?? true, ...o });

export const longtext = (name: string, o: Partial<CmsField> = {}) =>
  f(o.required === false ? z.string().optional() : z.string(),
    { name, type: 'text', required: o.required ?? true, ...o });

export const date = (name: string, o: Partial<CmsField> = {}) =>
  f(z.coerce.date(), { name, type: 'date', required: true, ...o });

export const bool = (name: string, def = false, o: Partial<CmsField> = {}) =>
  f(z.boolean().default(def),
    { name, type: 'boolean', required: false, default: def, ...o });

export const select = (name: string, values: string[], o: Partial<CmsField> = {}) =>
  f(o.required === false
      ? z.enum(values as [string, ...string[]]).optional()
      : z.enum(values as [string, ...string[]]),
    { name, type: 'select', required: o.required ?? true,
      options: { values }, ...o });

export const image = (name: string, o: Partial<CmsField> = {}) =>
  f(z.string().optional(), { name, type: 'image', required: false, ...o });

/**
 * The Markdown body. Exists in the CMS, never in the Zod schema —
 * Astro keeps body separate from frontmatter.
 */
export const body = (o: Partial<CmsField> = {}): Field =>
  ({ zod: z.never().optional(),
     cms: { name: 'body', type: 'rich-text', required: false, ...o } });

const BODY = 'body';

/* ─── Assembly ──────────────────────────────────────────────────────── */

export type CollectionDef = {
  /** Path under src/content/ */
  path: string;
  label: string;
  /** Filename pattern shown in the CMS */
  filename?: string;
  fields: Field[];
  /** Cross-field rules Zod enforces and the CMS cannot. Documented, not generated. */
  refine?: (schema: z.ZodObject<z.ZodRawShape>) => z.ZodTypeAny;
  refineNote?: string;
};

/** Build the Zod object Astro validates frontmatter against. */
export function toZod(def: CollectionDef) {
  const shape: z.ZodRawShape = {};
  for (const { zod, cms } of def.fields) {
    if (cms.name === BODY) continue;        // body is not frontmatter
    shape[cms.name] = zod;
  }
  const obj = z.object(shape);
  return def.refine ? def.refine(obj) : obj;
}

/** Build the Pages CMS field list. */
export function toCms(def: CollectionDef): CmsField[] {
  return def.fields.map(({ cms }) => cms);
}

/* ─── The collections ───────────────────────────────────────────────── */

export const collectionDefs: Record<string, CollectionDef> = {
  news: {
    path: 'src/content/news',
    label: 'News and updates',
    filename: '{year}-{month}-{day}-{primary}.md',
    fields: [
      text('title'),
      date('date'),
      select('category',
        ['newsletter', 'announcement', 'event-report', 'research'],
        { label: 'Category' }),
      longtext('summary', { description: 'One or two sentences. Shown on cards.' }),
      image('image', { label: 'Header image' }),
      text('imageAlt', { required: false, label: 'Image alt text',
        description: 'Required whenever an image is set. Describe what the image shows.' }),
      bool('draft', false),
      body(),
    ],
    refine: (s) => s.refine(
      (d: any) => !d.image || !!d.imageAlt,
      { message: 'imageAlt is required when image is set', path: ['imageAlt'] }),
    refineNote:
      'imageAlt is required when image is set. Pages CMS cannot express this; ' +
      'the build enforces it.',
  },

  people: {
    path: 'src/content/people',
    label: 'Staff',
    fields: [
      text('name'),
      text('role'),
      text('email', { required: false }),
      image('photo'),
      text('photoAlt', { required: false }),
      bool('current', true, { label: 'Currently at MCO' }),
      body(),
    ],
    refine: (s) => s.refine(
      (d: any) => !d.photo || !!d.photoAlt,
      { message: 'photoAlt is required when photo is set', path: ['photoAlt'] }),
    refineNote: 'photoAlt is required when photo is set.',
  },

  pages: {
    path: 'src/content/pages',
    label: 'Pages',
    fields: [
      text('title'),
      longtext('description', { description: 'Used as the meta description.' }),
      bool('draft', false),
      body(),
    ],
  },

  projects: {
    path: 'src/content/projects',
    label: 'Projects',
    fields: [
      text('title'),
      longtext('summary'),
      text('url', { required: false, label: 'Project website' }),
      select('status', ['active', 'completed', 'proposed'], { required: false }),
      bool('draft', false),
      body(),
    ],
  },
};
