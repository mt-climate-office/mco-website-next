import type { APIRoute } from 'astro';

// Staging is unlinked and unindexed (DECISIONS D2). Crawlers only read
// robots.txt at a host's root, so under a project-pages base path this file
// does nothing and the noindex meta is what applies.
export const GET: APIRoute = () =>
  new Response(
    import.meta.env.MCO_INDEXABLE
      ? 'User-agent: *\nAllow: /\n'
      : 'User-agent: *\nDisallow: /\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
