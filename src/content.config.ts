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

export const collections = { news };
