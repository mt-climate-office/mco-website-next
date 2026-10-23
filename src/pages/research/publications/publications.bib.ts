import type { APIRoute } from 'astro';
import { bibtex } from '../../../lib/cite';
import { getPublications } from '../../../lib/publications';

// Every publication as BibTeX, newest first; keys are the page slugs. Built
// from the same records as the pages (rebuild plan §4.7).
export const GET: APIRoute = async () => {
  const pubs = await getPublications();
  return new Response(pubs.map(bibtex).join('\n'), {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
};
