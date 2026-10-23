import type { APIRoute, GetStaticPaths } from 'astro';
import { bibtex, type Publication } from '../../../lib/cite';
import { getPublications } from '../../../lib/publications';

// One publication as BibTeX, beside its page: <slug>.bib.
export const getStaticPaths = (async () =>
  (await getPublications()).map((p) => ({ params: { slug: p.slug }, props: { p } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(bibtex((props as { p: Publication }).p), {
    headers: { 'Content-Type': 'application/x-bibtex; charset=utf-8' },
  });
