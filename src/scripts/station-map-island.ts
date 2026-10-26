// Homepage station map, the heavy half: imported by station-map.ts only when
// the map nears the viewport. Its own chunk, so none of it, and none of
// MapLibre, is on the page before then.
//
// Kit conventions (HOUSE-STYLE §6, §7):
//   - MapLibre 6.11.2 through MCO.map.loadMapLibre(); its SRI is in the
//     page's import map (Base.astro `map`). The kit's palette and map files
//     and maplibre-gl.css are injected here with SRI and crossorigin.
//   - CARTO basemap (MCO.map.cartoStyleUrl) under MCO.map.watchBasemap; on
//     mco:themechange the style is reloaded and every layer re-added on
//     style.load, with paints re-read for the new theme.
//   - Network = shape + colour, value = fill: MCO.map.markerPaint draws
//     HydroMet as a filled circle and AgriMet as a hollow one with an
//     orange ring, each filled with the station's air temperature.
//   - Data colour from MCO.palette (RdBu reversed, the Explorer's air
//     temperature ramp; src/lib/station-map.ts), never brand tokens. The
//     value is also in the tooltip, the popup and the table twin.
//   - Popups are DOM-built (MCO.map.popupContent); every API string goes in
//     as text.
//   - Cooperative gestures: the map never captures page scroll.
//   - Terrain shading from the kit (MCO.map.addHillshade, AWS Terrain Tiles),
//     as on the Explorer.

import { kit, KIT_SRI, MAPLIBRE_CSS, type KitFile } from '../kit/kit';
import { stampMT } from '../lib/format';
import { getStations } from '../lib/mesonet';
import { url } from '../lib/paths';
import { stationPath } from '../lib/stations';
import { DASHBOARD } from '../lib/tools';
import {
  airTempScale, category, formatTemp, type MapStation, type Scale,
} from '../lib/station-map';
import type { StationStore } from './station-map';

// The kit's globals are untyped classic scripts.
declare const MCO: any;
type MapLibreMap = any;

const SRC = 'sm-stations';
const STATE = 'sm-state';
const NETS = ['agrimet', 'hydromet'] as const;
const HIT = 'sm-hit';
const SELECTED = 'sm-selected';
const RADIUS = ['interpolate', ['linear'], ['zoom'], 4, 4, 7, 5.5, 10, 7.5];

function loadScript(path: KitFile): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = kit(path);
    s.integrity = KIT_SRI[path];
    s.crossOrigin = 'anonymous';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`kit: ${path} failed to load`));
    document.body.append(s);
  });
}

function loadCss(): Promise<void> {
  return new Promise((resolve, reject) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = MAPLIBRE_CSS.href;
    l.integrity = MAPLIBRE_CSS.integrity;
    l.crossOrigin = 'anonymous';
    l.onload = () => resolve();
    l.onerror = () => reject(new Error('maplibre-gl.css failed to load'));
    // Before the kit's theme, as snippets/head.html orders them: the kit
    // repaints MapLibre's popup and controls from tokens at the same
    // specificity, so the vendor sheet must come first in the cascade.
    const theme = document.querySelector(`link[rel="stylesheet"][href="${kit('theme/mco-theme.css')}"]`);
    if (theme) theme.before(l);
    else document.head.append(l);
  });
}

async function loadState(): Promise<unknown | null> {
  try {
    const path: KitFile = 'map/data/mt_state_simple.geojson';
    const res = await fetch(kit(path), { integrity: KIT_SRI[path], mode: 'cors' });
    return res.ok ? await res.json() : null;
  } catch {
    return null; // The basemap's own borders still frame the state.
  }
}

const netKey = (network: string) => (network.toLowerCase() === 'agrimet' ? 'agrimet' : 'hydromet');

export async function mount(el: HTMLElement, store: StationStore): Promise<void> {
  const failed = () => document.getElementById('sm-failed')?.removeAttribute('hidden');
  let maplibregl: any;
  try {
    await Promise.all([loadScript('palette/mco-palette.js'), loadCss()]);
    await loadScript('map/mco-map.js');
    maplibregl = await MCO.map.loadMapLibre();
  } catch {
    failed();
    return;
  }
  const statePromise = loadState();
  // Coordinates are not in the page (station-map.ts reads the rest from the
  // table): one /stations/ request, made only when the map is drawn.
  let coords: Map<string, [number, number]>;
  try {
    coords = new Map((await getStations()).map((s) => [s.station, [s.longitude, s.latitude]]));
  } catch {
    failed();
    return;
  }

  el.setAttribute('role', 'application');
  el.setAttribute('aria-label',
    'Map of air temperature at Mesonet stations. Every reading is also in the table below the map.');
  el.setAttribute('aria-describedby', 'sm-stamp');

  let map: MapLibreMap;
  try {
    map = new maplibregl.Map({
      container: el,
      style: MCO.map.cartoStyleUrl(),
      bounds: MCO.map.MT_FIT_BOUNDS,
      fitBoundsOptions: MCO.map.FIT_OPTS,
      // Wheel scrolls the page unless Ctrl or ⌘ is held; one finger
      // scrolls the page on touch. MapLibre shows its own hint.
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
      attributionControl: { compact: true },
    });
  } catch {
    failed(); // No WebGL2, for one.
    return;
  }
  map.touchZoomRotate.disableRotation();
  map.keyboard.disableRotation();
  MCO.map.addNavigation(map);
  MCO.map.addFitControl(map);
  const floor = MCO.map.installZoomFloor(map);
  map.on('load', () => floor.refresh());
  MCO.map.watchBasemap(map, { container: el });

  let scale: Scale | null = null;
  let selected: string | null = null;
  let popup: any = null;
  let state: unknown | null = null;

  // ── Data ──────────────────────────────────────────────────────────────
  function features() {
    const fetchedAt = store.fetchedAt();
    const shown = store.stations().filter((s) => category(s, fetchedAt) === 'ok' && coords.has(s.id));
    const P = MCO.palette;
    scale = airTempScale(shown.map((s) => s.value!), [...P.reversed('RdBu')]);
    const sc = scale;
    return {
      type: 'FeatureCollection',
      features: shown.map((s) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords.get(s.id) },
        properties: {
          id: s.id,
          net: netKey(s.network),
          color: P.colorAt(sc.stops, sc.toT(s.value!)),
        },
      })),
    };
  }

  function addLayers() {
    // Themed terrain shading under the labels, as the Explorer draws it
    // (MCO.map.addHillshade; owner, 25 Oct 2026): valleys, ridges and the
    // reservoirs in them read at the zoom this map fits Montana at. Paints
    // follow the theme, so it is re-added with everything else on style.load.
    if (!map.getLayer('mco-hillshade')) MCO.map.addHillshade(map);
    if (!map.getSource(SRC)) map.addSource(SRC, { type: 'geojson', data: features() });
    if (state && !map.getSource(STATE)) map.addSource(STATE, { type: 'geojson', data: state });
    if (state && !map.getLayer('sm-state-line')) {
      map.addLayer({ id: 'sm-state-line', type: 'line', source: STATE, paint: MCO.map.overlayPaints().stateLine });
    }
    // AgriMet first, so a co-located HydroMet dot sits inside its ring.
    for (const net of NETS) {
      const id = `sm-${net}`;
      if (map.getLayer(id)) continue;
      map.addLayer({
        id, type: 'circle', source: SRC,
        filter: ['==', ['get', 'net'], net],
        paint: MCO.map.markerPaint(net, { radius: RADIUS, fill: ['get', 'color'] }),
      });
    }
    if (!map.getLayer(SELECTED)) {
      map.addLayer({
        id: SELECTED, type: 'circle', source: SRC,
        filter: ['==', ['get', 'id'], selected ?? ''],
        paint: MCO.map.selectionPaint(),
      });
    }
    if (!map.getLayer(HIT)) map.addLayer({ id: HIT, type: 'circle', source: SRC, paint: MCO.map.hitPaint() });
  }

  map.on('style.load', addLayers);
  statePromise.then((geo) => {
    state = geo;
    if (geo && map.isStyleLoaded()) addLayers();
  });

  store.subscribe(() => {
    map.getSource(SRC)?.setData(features());
    renderLegend();
  });

  // ── Theme ─────────────────────────────────────────────────────────────
  // A new style drops every source and layer; style.load re-adds them with
  // paints read for the new theme. The legend's network swatches follow.
  document.addEventListener('mco:themechange', () => {
    map.setStyle(MCO.map.cartoStyleUrl(), { diff: false });
    renderLegend();
  });

  // ── Hover and click ───────────────────────────────────────────────────
  const byId = (id: string) => store.stations().find((s) => s.id === id);
  MCO.map.initCursorTooltip(map, {
    layers: [HIT],
    render: (f: any) => {
      const s = byId(f.properties.id);
      return s ? { name: s.name, sub: s.network, line: formatTemp(s.value) } : null;
    },
  });

  function select(id: string | null) {
    selected = id;
    if (map.getLayer(SELECTED)) map.setFilter(SELECTED, ['==', ['get', 'id'], id ?? '']);
  }

  function stationBlock(s: MapStation): HTMLElement {
    const wrap = document.createElement('div');
    wrap.className = 'sm-popup';
    wrap.append(MCO.map.popupContent({
      title: s.name,
      subtitle: s.network,
      facts: [
        ['Air temperature', formatTemp(s.value)],
        ['Reported', s.at == null ? 'No report' : stampMT(s.at)],
      ],
    }));
    // Built here rather than as popupContent actions: those accept https
    // URLs only and open a new tab, and the station page is this site's own.
    const bar = document.createElement('div');
    bar.className = 'mco-popup-actions';
    const page = document.createElement('a');
    page.className = 'nav-btn is-primary';
    page.href = url(stationPath(s.id));
    page.textContent = 'Station page';
    const dash = document.createElement('a');
    dash.className = 'nav-btn';
    dash.href = `${DASHBOARD}?s=${encodeURIComponent(s.id)}`;
    dash.textContent = 'Station Dashboard';
    bar.append(page, dash);
    wrap.querySelector('.mco-popup')?.append(bar);
    return wrap;
  }

  map.on('click', (e: any) => {
    const hits = map.queryRenderedFeatures(e.point, { layers: [HIT] });
    const ids = [...new Set<string>(hits.map((f: any) => f.properties.id))].slice(0, 3);
    const list = ids.map(byId).filter((s): s is MapStation => !!s);
    popup?.remove();
    if (!list.length) { select(null); return; }
    const content = document.createElement('div');
    content.append(...list.map(stationBlock));
    select(list[0].id);
    popup = new maplibregl.Popup({ closeButton: true, maxWidth: '18rem', focusAfterOpen: false })
      .setLngLat(hits[0].geometry.coordinates)
      .setDOMContent(content)
      .addTo(map);
    popup.on('close', () => { select(null); popup = null; });
    MCO.announce?.(list.map((s) =>
      `${s.name}, ${s.network}, air temperature ${formatTemp(s.value)}${s.at == null ? '' : `, reported ${stampMT(s.at)}`}.`).join(' '));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup) popup.remove();
  });

  // ── Legend ────────────────────────────────────────────────────────────
  const legend = document.getElementById('sm-legend');
  function renderLegend() {
    if (!legend || !scale) return;
    const P = MCO.palette;
    const sc = scale;
    const n = 24;
    const stops = Array.from({ length: n + 1 }, (_, i) =>
      `${P.colorAt(sc.stops, i / n)} ${((i / n) * 100).toFixed(1)}%`);
    const [lo, hi] = sc.domain;
    const describe = sc.mid != null
      ? `Colour scale for air temperature: blue below freezing (32°F), red above, from ${Math.round(lo)}°F to ${Math.round(hi)}°F.`
      : `Colour scale for air temperature, ${Math.round(lo)}°F to ${Math.round(hi)}°F, ${hi <= 32 ? 'all at or below freezing' : 'all above freezing'}.`;

    const title = document.createElement('p');
    title.className = 'sm-legend-title';
    title.textContent = 'Air temperature (°F)';
    const ramp = document.createElement('div');
    ramp.className = 'sm-ramp';
    ramp.setAttribute('role', 'img');
    ramp.setAttribute('aria-label', describe);
    ramp.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
    const ticks = document.createElement('ul');
    ticks.className = 'sm-ticks';
    ticks.setAttribute('aria-hidden', 'true');
    for (const t of sc.ticks) {
      const pos = sc.toT(t) * 100;
      const li = document.createElement('li');
      li.textContent = `${t}°`;
      li.style.left = `${pos}%`;
      if (pos < 6) li.classList.add('is-start');
      else if (pos > 94) li.classList.add('is-end');
      ticks.append(li);
    }
    // Network swatches as the markers draw them: the same fill (a sample
    // value colour) inside each network's edge, the kit's legend shapes.
    const theme = document.documentElement.dataset.theme || 'dark';
    const sample = P.colorAt(sc.stops, 0.8);
    const nets = document.createElement('ul');
    nets.className = 'sm-nets';
    for (const key of ['hydromet', 'agrimet']) {
      const net = P.network(key, theme);
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'mco-legend-swatch';
      sw.dataset.shape = net.shape;
      sw.setAttribute('aria-hidden', 'true');
      if (net.shape === 'hollow') {
        sw.style.setProperty('--swatch', net.color);
        sw.style.background = sample;
      } else {
        sw.style.setProperty('--swatch', sample);
        sw.style.borderColor = 'var(--dot-stroke)';
      }
      li.append(sw, net.shape === 'hollow' ? `${net.label}, ringed` : net.label);
      nets.append(li);
    }
    legend.replaceChildren(title, ramp, ticks, nets);
    legend.hidden = false;
  }
  // features() sets the scale; the source is added on the first style.load.
  features();
  renderLegend();
}
