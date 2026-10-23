import type { APIRoute, GetStaticPaths } from 'astro';
import { csl, type Publication } from '../../../lib/cite';
import { getPublications } from '../../../lib/publications';

// One publication as CSL-JSON, beside its page: <slug>.json. An array of one
// item, as csl-data.json expects, so whatever reads the full list reads this.
export const getStaticPaths = (async () =>
  (await getPublications()).map((p) => ({ params: { slug: p.slug }, props: { p } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(JSON.stringify([csl((props as { p: Publication }).p)], null, 2) + '\n', {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
