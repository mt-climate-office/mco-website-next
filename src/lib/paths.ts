// Every internal link and asset goes through these, so the site builds
// unchanged at `/` on a custom domain and under a project-pages base path.
// Never write a host or base path into a template (rebuild plan §2.1);
// scripts/check-paths.mjs fails the build if one appears.

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');

/** A site path ('about/', '/about/', '') resolved against the base path. */
export const url = (path = ''): string => BASE + path.replace(/^\//, '');

/** The page's path with the base removed, e.g. 'about/' or ''. */
export const sitePath = (pathname: string): string =>
  pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '');

/** The production URL for a page, whatever host this build is deployed to. */
export const canonicalUrl = (pathname: string): string =>
  new URL(sitePath(pathname), import.meta.env.MCO_CANONICAL_ORIGIN + '/').href;
