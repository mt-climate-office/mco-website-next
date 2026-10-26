import { createHash } from 'node:crypto';
import { API_ORIGIN } from '../lib/mesonet';
import { NEWS_LIST_ORIGIN } from '../lib/newsletter-list';

// A meta CSP, written here rather than by Astro's security.csp: the kit's
// verify gate (tools/verify/head.mjs) matches the exact
// `http-equiv="Content-Security-Policy"` spelling, and Astro emits it in
// lower case. With inlineStylesheets: 'never' and bundled module scripts,
// the only inline script on a page is the kit's anti-flash boot.

const hash = (body: string) =>
  `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

const JSDELIVR = 'https://cdn.jsdelivr.net';
// Photo schedules, archive listings and frames are read from data2 directly
// (DECISIONS D6): connect-src for the schedule and listings, img-src for the
// homepage hero's thumbnails.
const DATA2 = 'https://data2.climate.umt.edu';

export interface CspOptions {
  /**
   * The page runs site search (src/pages/search.astro). Only that page gets
   * these, so no other page grows its policy.
   *
   * Pagefind runs in a worker, <base>pagefind/pagefind-worker.js. With no
   * worker-src, script-src 'self' governs it. A worker from a URL takes its
   * policy from its own response, not this meta tag, so the fetches and the
   * wasm compile in it need nothing here. When the worker cannot start,
   * Pagefind falls back to this page's main thread, and that path needs the
   * two below (checked: without them the fallback finds nothing):
   *   - script-src 'wasm-unsafe-eval': compiles Pagefind's WebAssembly. It
   *     allows WebAssembly compilation only, not eval or new Function.
   *   - connect-src 'self': fetches the index, fragments and wasm from this
   *     site's own pagefind/ directory.
   * The rest:
   *   - form-action 'self': the search form submits to the search page
   *     (GET ?q=), so it works before the script loads.
   */
  search?: boolean;
  /**
   * The page has the station map (the homepage). MapLibre 6 per the kit
   * README's CSP notes and HOUSE-STYLE §7, plus the map's own data hosts:
   *   - script-src https://unpkg.com: the pinned MapLibre modules, imported
   *     by MCO.map.loadMapLibre(). The import map that carries their SRI is
   *     an inline script, hashed like any other (pass it in inlineScripts).
   *   - worker-src blob: https://unpkg.com: MapLibre starts its worker from
   *     a blob: URL that then imports its chunk from unpkg. Both, or the
   *     basemap draws and nothing else does ("Worker failed to load").
   *   - style-src https://unpkg.com: maplibre-gl.css, injected with SRI.
   *   - img-src blob:: MapLibre decodes sprite and tile images through blob:
   *     URLs where createImageBitmap is not used.
   *   - connect-src: CARTO's style JSON (basemaps.cartocdn.com) and its
   *     tiles, sprites and glyphs (tiles.basemaps.cartocdn.com), from the
   *     main thread and the worker; jsDelivr for the kit's Montana outline
   *     GeoJSON (fetched with integrity); and the kit's terrain tiles for
   *     MCO.map.addHillshade (MCO.map.TERRARIUM_DEM), limited to their
   *     bucket's path.
   */
  map?: boolean;
  /**
   * The page has the kit's place search (the homepage conditions card).
   * places/mco-places.js fetches its gazetteer, and a reservation's
   * boundary on the first reservation pick, from the pinned tag on jsDelivr,
   * with integrity (kit README § CSP notes): connect-src jsDelivr.
   */
  places?: boolean;
  /**
   * The page has the kit's conditions line (the homepage conditions card).
   * MCO.summary.forStation() reads the station's hourly rows and its
   * /derived/ppt/ row from mesonet2 (already in connect-src), and the NWS
   * forecast for its point from api.weather.gov: /points/{lat},{lon}, then
   * the forecast URL that answer names, which the kit fetches only when it
   * is on api.weather.gov (kit README § CSP notes). connect-src
   * api.weather.gov, nothing else.
   */
  summary?: boolean;
  /**
   * The build counts page views (production only; DECISIONS D26):
   * connect-src for GoatCounter's endpoint, which src/scripts/analytics.ts
   * reaches with navigator.sendBeacon. No script from it runs here.
   */
  count?: boolean;
  /**
   * The footer's newsletter form is on (src/lib/newsletter-list.ts has the
   * list's UUID): form-action for Listmonk's public endpoint, where it
   * posts. Every page has the footer, so every page gets it.
   */
  subscribe?: boolean;
}

const UNPKG = 'https://unpkg.com';
const CARTO = 'https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com';
const TERRAIN = 'https://s3.amazonaws.com/elevation-tiles-prod/';
const NWS = 'https://api.weather.gov';
const GOATCOUNTER = 'https://mt-climate-office.goatcounter.com';

/** The policy for a page whose only inline scripts are `inlineScripts`. */
export function contentSecurityPolicy(
  inlineScripts: string[],
  { search = false, map = false, places = false, summary = false, count = false, subscribe = false }: CspOptions = {},
): string {
  const hashes = inlineScripts.map(hash).join(' ');
  return [
    "default-src 'none'",
    `script-src 'self' ${JSDELIVR}${map ? ` ${UNPKG}` : ''} ${hashes}${search ? " 'wasm-unsafe-eval'" : ''}`,
    ...(map ? [`worker-src blob: ${UNPKG}`] : []),
    `style-src 'self' ${JSDELIVR}${map ? ` ${UNPKG}` : ''}`,
    `font-src ${JSDELIVR}`,
    // data: for the kit's CSS glyphs drawn from data: URI masks, such as the
    // .mco-search-icon magnifier. Status, Explorer and Photos allow it too.
    `img-src 'self' data:${map ? ' blob:' : ''} ${JSDELIVR} ${DATA2}`,
    `connect-src ${search ? "'self' " : ''}${API_ORIGIN} ${DATA2}${map ? ` ${CARTO} ${TERRAIN}` : ''}${map || places ? ` ${JSDELIVR}` : ''}${summary ? ` ${NWS}` : ''}${count ? ` ${GOATCOUNTER}` : ''}`,
    "base-uri 'none'",
    `form-action ${[search ? "'self'" : '', subscribe ? NEWS_LIST_ORIGIN : ''].filter(Boolean).join(' ') || "'none'"}`,
  ].join('; ');
}
