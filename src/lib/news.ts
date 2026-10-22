// The one definition of a news post's URL. The Phase 4 news route
// (src/pages/news/[slug]/) and the newsletter renderer
// (scripts/newsletter/render.mjs) both call these, so the link in an email is
// the page the site builds.
//
// Pure and dependency-free on purpose: Node imports this file directly (type
// stripping), so it must not touch import.meta.env or use non-erasable
// TypeScript syntax. Resolve the result with url() for in-site links or
// against the canonical origin for links that leave the site.

/** Where news posts live, relative to the repo root (DECISIONS D13). */
export const NEWS_DIR = 'src/content/news';

const DATE_PREFIX = /^\d{4}-\d{2}-\d{2}-/;

/**
 * A post's slug: the file name without its extension or its
 * `YYYY-MM-DD-` prefix (the CMS names files `{year}-{month}-{day}-{primary}`),
 * unless front matter sets `slug`.
 */
export function newsSlug(fileName: string, frontMatterSlug?: string): string {
  if (frontMatterSlug && frontMatterSlug.trim()) return frontMatterSlug.trim();
  const base = fileName.replace(/^.*[\\/]/, '').replace(/\.(md|mdx)$/i, '');
  return base.replace(DATE_PREFIX, '');
}

/** A post's site path, without a base path: `news/<slug>/`. */
export function newsPath(slug: string): string {
  return `news/${encodeURIComponent(slug)}/`;
}
