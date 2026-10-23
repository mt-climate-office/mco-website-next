// Content collections (DECISIONS D13). Schemas come from src/content/_fields.ts,
// the same definitions that generate .pages.yml, so the build and the CMS
// cannot disagree about a field. Front matter that does not match fails the
// build.
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { collectionDefs, toZod } from './content/_fields.ts';

const news = defineCollection({
  // Files whose names start with "_" are ignored.
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/news' }),
  schema: toZod(collectionDefs.news),
});

// The publications portal's DOI list (rebuild plan §4.7). Each file holds a
// DOI and the fields only a person can supply; the metadata comes from the
// committed Crossref cache (src/data/publications.json, src/lib/publications.ts).
const publications = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/publications' }),
  schema: toZod(collectionDefs.publications),
});

// The team page, partners and projects (rebuild plan §4.6). References
// between them (publication → project, project → partner) are slugs, checked
// at build by src/lib/projects.ts.
const people = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/people' }),
  schema: toZod(collectionDefs.people),
});

const partners = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/partners' }),
  schema: toZod(collectionDefs.partners),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/projects' }),
  schema: toZod(collectionDefs.projects),
});

export const collections = { news, publications, people, partners, projects };
