// mco-web-style, consumed as published bytes: pinned jsDelivr tag, SRI and
// crossorigin on every script and stylesheet (DECISIONS D1, HOUSE-STYLE §1, §8).
//
// To bump the kit: change KIT_VERSION, copy the new hashes from the tag's
// snippets/head.html, re-vendor anti-flash.inline.js and public/mco-logo.png
// from the same tag, and run `npm run check:kit`. CI fails on any mismatch.

export const KIT_VERSION = '0.13.1';

const KIT_BASE = `https://cdn.jsdelivr.net/gh/mt-climate-office/mco-web-style@${KIT_VERSION}/`;

/** URL of a file in the pinned kit tag. */
export const kit = (path: string): string => KIT_BASE + path;

/** sha384 SRI for the kit files this site loads, from the tag's snippets/head.html. */
export const KIT_SRI = {
  'theme/mco-theme.css': 'sha384-s6MS3mtowaDBNrYl8BzVKW+tkporVrIEixS7kjvHZ67k4syUXk0rKKMCHO2pNjNu',
  'core/mco-core.js': 'sha384-0SiGncfP37X1rYs83vpTsUgtsQMruIVGkbWHdrWeF8fIr7IWYHM/+NSR/PDLIDhJ',
} as const;

export type KitFile = keyof typeof KIT_SRI;
