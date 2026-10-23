// mco-web-style, consumed as published bytes: pinned jsDelivr tag, SRI and
// crossorigin on every script and stylesheet (DECISIONS D1, HOUSE-STYLE §1, §8).
//
// To bump the kit: change KIT_VERSION, copy the new hashes from the tag's
// snippets/head.html, re-vendor anti-flash.inline.js and public/mco-logo.png
// from the same tag, and run `npm run check:kit`. CI fails on any mismatch.

export const KIT_VERSION = '0.15.1';

const KIT_BASE = `https://cdn.jsdelivr.net/gh/mt-climate-office/mco-web-style@${KIT_VERSION}/`;

/** URL of a file in the pinned kit tag. */
export const kit = (path: string): string => KIT_BASE + path;

/**
 * sha384 SRI for the kit files this site loads, from the tag's snippets/head.html.
 * Theme and core are every page's; photos/mco-photos.js is the homepage hero's
 * (Base.astro `photos`), and the build evaluates core + photos in node:vm to
 * compute the hero's build-time set (src/lib/kit-node.ts) against these same
 * hashes.
 */
export const KIT_SRI = {
  'theme/mco-theme.css': 'sha384-s6MS3mtowaDBNrYl8BzVKW+tkporVrIEixS7kjvHZ67k4syUXk0rKKMCHO2pNjNu',
  'core/mco-core.js': 'sha384-0SiGncfP37X1rYs83vpTsUgtsQMruIVGkbWHdrWeF8fIr7IWYHM/+NSR/PDLIDhJ',
  'photos/mco-photos.js': 'sha384-VepbbKE6CKKljLPjOlw1TATvqOZH73WIWtFXmpSR5RAgYVEphm1rE2fkGa+vK17C',
} as const;

export type KitFile = keyof typeof KIT_SRI;
