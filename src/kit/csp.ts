import { createHash } from 'node:crypto';
import { API_ORIGIN } from '../lib/mesonet';

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
   * The page shows the kit's photo controls (the homepage hero). Their time
   * menu is a <select>, which initPhotoControls requires, and WebKit draws a
   * <select> with inline style attributes in its shadow tree. Under
   * style-src 'self' those are refused (a CSP console error on every load)
   * and the control collapses to about 20px, under the 40px touch target.
   * `style-src-attr 'unsafe-inline'` allows style attributes only: no
   * <style> element and no stylesheet from anywhere else, and a style
   * attribute cannot run script. Checked in Playwright's WebKit, 22 Oct 2026.
   * The status page avoids <select> for this reason; this page cannot.
   */
  photos?: boolean;
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
   *     GeoJSON (fetched with integrity).
   * No terrain host: the homepage map draws no hillshade.
   */
  map?: boolean;
  /**
   * The page has the kit's place search (the homepage conditions card).
   * places/mco-places.js fetches its gazetteer, and a reservation's
   * boundary on the first reservation pick, from the pinned tag on jsDelivr,
   * with integrity (kit README § CSP notes): connect-src jsDelivr.
   */
  places?: boolean;
}

const UNPKG = 'https://unpkg.com';
const CARTO = 'https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com';

/** The policy for a page whose only inline scripts are `inlineScripts`. */
export function contentSecurityPolicy(
  inlineScripts: string[],
  { search = false, photos = false, map = false, places = false }: CspOptions = {},
): string {
  const hashes = inlineScripts.map(hash).join(' ');
  return [
    "default-src 'none'",
    `script-src 'self' ${JSDELIVR}${map ? ` ${UNPKG}` : ''} ${hashes}${search ? " 'wasm-unsafe-eval'" : ''}`,
    ...(map ? [`worker-src blob: ${UNPKG}`] : []),
    `style-src 'self' ${JSDELIVR}${map ? ` ${UNPKG}` : ''}`,
    ...(photos ? ["style-src-attr 'unsafe-inline'"] : []),
    `font-src ${JSDELIVR}`,
    // data: for the kit's CSS glyphs drawn from data: URI masks, such as the
    // .mco-search-icon magnifier. Status, Explorer and Photos allow it too.
    `img-src 'self' data:${map ? ' blob:' : ''} ${JSDELIVR} ${DATA2}`,
    `connect-src ${search ? "'self' " : ''}${API_ORIGIN} ${DATA2}${map ? ` ${CARTO}` : ''}${map || places ? ` ${JSDELIVR}` : ''}`,
    "base-uri 'none'",
    `form-action ${search ? "'self'" : "'none'"}`,
  ].join('; ');
}
