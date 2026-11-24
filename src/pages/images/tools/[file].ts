// /images/tools/<key>-<width>.webp: each tool screenshot at each width,
// written at build time from src/lib/tool-shots.ts.
import type { APIRoute, GetStaticPaths } from 'astro';
import { render, SHOT_WIDTHS, TOOL_SHOTS, type ShotKey, type ShotWidth } from '../../../lib/tool-shots';

export const getStaticPaths = (() =>
  Object.keys(TOOL_SHOTS).flatMap((key) =>
    SHOT_WIDTHS.map((width) => ({ params: { file: `${key}-${width}.webp` }, props: { key, width } })),
  )) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { data } = await render(props.key as ShotKey, props.width as ShotWidth);
  return new Response(new Uint8Array(data), { headers: { 'Content-Type': 'image/webp' } });
};
