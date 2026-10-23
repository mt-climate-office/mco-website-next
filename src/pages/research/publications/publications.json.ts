import type { APIRoute } from 'astro';
import { csl } from '../../../lib/cite';
import { getPublications } from '../../../lib/publications';

// Every publication as a CSL-JSON array (csl-data.json), newest first; ids
// are the page slugs. Zotero, Pandoc and citeproc read it directly.
export const GET: APIRoute = async () => {
  const pubs = await getPublications();
  return new Response(JSON.stringify(pubs.map(csl), null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
