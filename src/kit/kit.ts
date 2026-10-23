// mco-web-style, consumed as published bytes: pinned jsDelivr tag, SRI and
// crossorigin on every script and stylesheet (DECISIONS D1, HOUSE-STYLE §1, §8).
//
// To bump the kit: change KIT_VERSION, copy the new hashes from the tag's
// snippets/head.html, re-vendor anti-flash.inline.js and public/mco-logo.png
// from the same tag, and run `npm run check:kit`. CI fails on any mismatch.

export const KIT_VERSION = '0.17.0';

const KIT_BASE = `https://cdn.jsdelivr.net/gh/mt-climate-office/mco-web-style@${KIT_VERSION}/`;

/** URL of a file in the pinned kit tag. */
export const kit = (path: string): string => KIT_BASE + path;

/**
 * sha384 SRI for the kit files this site loads, from the tag's snippets/head.html.
 * Theme and core are every page's; photos/mco-photos.js is the homepage hero's
 * (Base.astro `photos`), and the build evaluates core + photos in node:vm to
 * compute the hero's build-time set (src/lib/kit-node.ts) against these same
 * hashes. places/mco-places.js is the homepage conditions card's place
 * search (Base.astro `places`); it fetches its gazetteer from the same tag
 * with an integrity hash it carries, so its own SRI pins the data too.
 * summary/mco-summary.js is the same card's plain-language line (Base.astro
 * `summary`); it fetches from mesonet2 and api.weather.gov, not the tag.
 * Palette and map are the homepage station map's, injected only when
 * the map nears the viewport (src/scripts/station-map-island.ts); the state
 * outline is fetched with `integrity` by the same island. The tag's head.html
 * lists no hash for the GeoJSON, so check:kit computes it from the bytes
 * jsDelivr serves, like the others.
 */
export const KIT_SRI = {
  'theme/mco-theme.css': 'sha384-s6MS3mtowaDBNrYl8BzVKW+tkporVrIEixS7kjvHZ67k4syUXk0rKKMCHO2pNjNu',
  'core/mco-core.js': 'sha384-5LuIiruVjXsc4aJP9psEF1MLhfwow4XrNztT4Sn1OSCbbY7wkqTpgWbX+ucBlUlC',
  'photos/mco-photos.js': 'sha384-VepbbKE6CKKljLPjOlw1TATvqOZH73WIWtFXmpSR5RAgYVEphm1rE2fkGa+vK17C',
  'places/mco-places.js': 'sha384-4Amo71pLoRONH4SjB2I+Ai9FpSNqDDGGqQVxq4z0Yu/0c7GtGgLUYtNX/wQDUHVg',
  'summary/mco-summary.js': 'sha384-9qE6iFiGkwK/CB8QUbb3Ue7Dd8n8XeXgyVkoBs9TJFcCIO3d+XlfpHfRvnnMplcj',
  'palette/mco-palette.js': 'sha384-nmQlqM0DO86ApUoiACDt0cl/bUjemVhSUytRow9vdP1ydxnXGamD81mumft3n41L',
  'map/mco-map.js': 'sha384-BmAbWT508YkXfTenCpVne4+ONoA0HyPeR6qLIt1KxVFXTD+jWtHSWnysuInSQx8t',
  'map/data/mt_state_simple.geojson': 'sha384-iAefAIf1SkdKze/Jw3NMj5mtk3smh6cr7LGf1gdnEEsij/hJPGEU7BYUUwFArq/o',
} as const;

export type KitFile = keyof typeof KIT_SRI;

/**
 * MapLibre, as the tag's snippets/head.html pins it (HOUSE-STYLE §7). The
 * import map is copied from the snippet byte for byte and kept on one line,
 * so its CSP sha256 is the kit README's; check:kit compares both against the
 * tag. It goes in the homepage <head> (Base.astro `map`) and carries the SRI
 * that MCO.map.loadMapLibre()'s import() cannot. No modulepreload: nothing
 * of MapLibre downloads until the map nears the viewport.
 */
export const MAPLIBRE_IMPORT_MAP = '{"integrity":{"https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.mjs":"sha384-KQzExYlfg1SnYNpLaXHTnaCTjr5wmiZ6X3sasvPb94caZfH+3+T1Sl4eJziXUtmN","https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl-shared.mjs":"sha384-V59ofCEPEqpSk5Mswc19DtDYbZWJtne210dFzS328Il6O31eLwTV7v57+Z3NjW/7"}}';

/** MapLibre's stylesheet, injected with the map (same pin as the import map). */
export const MAPLIBRE_CSS = {
  href: 'https://unpkg.com/maplibre-gl@6.11.2/dist/maplibre-gl.css',
  integrity: 'sha384-ntw3zEt6rcVML7jDK0ULmHa5hxLB23afsPqzqfY+gLgMfAkbFCnCgPpkZvV5mmZX',
} as const;
