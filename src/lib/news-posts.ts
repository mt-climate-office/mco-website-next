// The news collection as pages use it: slugs from newsSlug() (the one
// definition of a post URL, shared with the newsletter), drafts left out,
// newest first. Astro-only; src/lib/news.ts stays importable from Node.
import { getCollection, type CollectionEntry } from 'astro:content';
import { join } from 'node:path';
import { NEWS_CATEGORY_LABELS, NEWS_CATEGORIES } from '../content/_fields.ts';
import { imageSize } from './image-size.mjs';
import { newsSlug } from './news';

/** Front matter after the schema in src/content/_fields.ts has parsed it. */
export interface NewsData {
  title: string;
  date: Date;
  category: (typeof NEWS_CATEGORIES)[number];
  summary: string;
  image?: string;
  imageAlt?: string;
  draft: boolean;
  email?: 'pending' | 'sent';
  slug?: string;
}

export interface NewsPost {
  entry: CollectionEntry<'news'>;
  data: NewsData;
  slug: string;
  category: string;
}

/**
 * Drafts are left out of every build unless NEWS_DRAFTS=1 is set, for a local
 * preview: `NEWS_DRAFTS=1 npm run dev`. Never set it in CI or a deploy.
 */
export const SHOW_DRAFTS = process.env.NEWS_DRAFTS === '1';

// A slug must survive newsPath() unencoded, so the route Astro builds and the
// URL the newsletter links to are the same string.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Every post the build should publish, newest first. */
export async function getNews(): Promise<NewsPost[]> {
  const all = (await getCollection('news')).map((entry) => {
    const data = entry.data as NewsData;
    const slug = newsSlug(entry.filePath ?? entry.id, data.slug);
    if (!SLUG.test(slug)) {
      throw new Error(`${entry.filePath}: slug "${slug}" must be lowercase letters, digits and single hyphens`);
    }
    return { entry, data, slug, category: NEWS_CATEGORY_LABELS[data.category] };
  });

  // Checked across drafts too, so a draft cannot later collide on publish.
  const seen = new Map<string, string | undefined>();
  for (const p of all) {
    if (seen.has(p.slug)) throw new Error(`news slug "${p.slug}" is used by both ${seen.get(p.slug)} and ${p.entry.filePath}`);
    seen.set(p.slug, p.entry.filePath);
  }

  return all
    .filter((p) => SHOW_DRAFTS || !p.data.draft)
    .sort((a, b) => b.data.date.getTime() - a.data.date.getTime() || a.slug.localeCompare(b.slug));
}

// Builds run from the project root; import.meta.url points into the bundle.
const PUBLIC = join(process.cwd(), 'public');

/** A header image's pixel size, read from public/. Fails the build if missing. */
export function headerImageSize(path: string): { width: number; height: number } | null {
  try {
    return imageSize(join(PUBLIC, decodeURI(path)));
  } catch {
    throw new Error(`news header image ${path} is not in public/`);
  }
}
