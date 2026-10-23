// Homepage station map, the light half: keeps the snapshot current and loads
// the map island when the map nears the viewport.
//
//   - The stations and their readings are read from the build-time table
//     (src/components/data/StationMap.astro), which stays the source the
//     page shows and the map's accessible twin.
//   - /latest/ is fetched once after the page's load event, then every
//     REFRESH_MS while the page is visible. A refresh rewrites the table's
//     value and time cells, the stamp and the hidden-station lines in place.
//     A failed refresh changes nothing: the last data stays with its time.
//   - The island (MapLibre, the kit's map and palette files) is imported
//     only when the map frame reaches the viewport (ISLAND_MARGIN),
//     watched from the load event on: before it, the photo controls and
//     late images are still moving the band down the page.
//
// Nothing here is announced on a plain load. A refresh that moves the stamp
// is announced once, and only while focus is inside the readings band, so a
// background update never talks over what someone is reading elsewhere.

import { getLatest } from '../lib/mesonet';
import { isoTime, stampMT } from '../lib/format';
import {
  AIR_TEMP_ELEMENTS, applyLatest, formatTemp, hiddenLines, summarize, type MapStation,
} from '../lib/station-map';

declare const MCO: { announce?: (text: string) => void } | undefined;

const REFRESH_MS = 12 * 60 * 1000;
const ISLAND_MARGIN = '0px';

/** What the island subscribes to. */
export interface StationStore {
  stations(): MapStation[];
  fetchedAt(): number;
  subscribe(fn: () => void): void;
}

const root = document.getElementById('sm');
const table = document.getElementById('sm-table') as HTMLTableElement | null;
if (root && table) init(root, table);

function init(root: HTMLElement, table: HTMLTableElement) {
  // The snapshot, read back from the table (StationMap.astro writes each
  // row as name, network, "54°F" or "No report", then the report time, with
  // its epoch ms in data-at). Values are whole degrees until the first
  // refresh. Coordinates are the island's to fetch.
  const rows = new Map<string, HTMLTableRowElement>();
  let stations: MapStation[] = [...table.tBodies[0].rows].map((tr) => {
    rows.set(tr.dataset.id!, tr);
    const value = Number.parseFloat(tr.cells[2].textContent || '');
    const at = Number(tr.dataset.at || Number.NaN);
    return {
      id: tr.dataset.id!,
      name: tr.cells[0].textContent!.trim(),
      network: tr.cells[1].textContent!.trim(),
      value: Number.isFinite(value) ? value : null,
      at: Number.isFinite(at) ? at : null,
    };
  });
  let fetchedAt = Number(root.dataset.fetchedAt) || 0;
  const listeners: (() => void)[] = [];
  let lastStamp = stampAt();

  function stampAt() {
    return summarize(stations, fetchedAt).latestAt ?? fetchedAt;
  }

  function render() {
    for (const s of stations) {
      const tr = rows.get(s.id);
      if (!tr) continue;
      tr.cells[2].textContent = formatTemp(s.value);
      tr.cells[3].textContent = s.at == null ? 'No report' : stampMT(s.at);
      if (s.at == null) delete tr.dataset.at;
      else tr.dataset.at = String(s.at);
    }
    const at = stampAt();
    const stamp = document.querySelector('#sm-stamp time') as HTMLTimeElement | null;
    if (stamp) { stamp.dateTime = isoTime(at); stamp.textContent = stampMT(at); }
    const cap = document.querySelector('#sm-caption time') as HTMLTimeElement | null;
    if (cap) { cap.dateTime = isoTime(at); cap.textContent = stampMT(at); }
    const hidden = document.getElementById('sm-hidden');
    hidden?.replaceChildren(...hiddenLines(summarize(stations, fetchedAt)).map((line) => {
      const span = document.createElement('span');
      span.textContent = line;
      return span;
    }));
  }

  let inFlight = false;
  let lastTry = 0;
  async function refresh() {
    if (inFlight) return;
    inFlight = true;
    lastTry = Date.now();
    try {
      const latest = await getLatest({ elements: AIR_TEMP_ELEMENTS, units: 'us' });
      if (!latest.length) return;
      stations = applyLatest(stations, latest);
      fetchedAt = Date.now();
    } catch {
      return; // Keep the last data and its time.
    } finally {
      inFlight = false;
    }
    render();
    listeners.forEach((fn) => fn());
    const at = stampAt();
    if (at !== lastStamp) {
      lastStamp = at;
      const band = document.getElementById('readings');
      if (band?.contains(document.activeElement) && typeof MCO !== 'undefined') {
        const sum = summarize(stations, fetchedAt);
        MCO.announce?.(`Air temperature updated, ${stampMT(at)}. ${sum.shown} stations on the map.`);
      }
    }
  }

  const due = () => document.visibilityState === 'visible' && Date.now() - lastTry >= REFRESH_MS;
  const start = () => {
    watchMap();
    void refresh();
    setInterval(() => { if (due()) void refresh(); }, 60 * 1000);
    document.addEventListener('visibilitychange', () => { if (due()) void refresh(); });
  };

  const store: StationStore = {
    stations: () => stations,
    fetchedAt: () => fetchedAt,
    subscribe: (fn) => { listeners.push(fn); },
  };

  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });

  function watchMap() {
    const frame = document.getElementById('sm-map');
    if (!frame || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import('./station-map-island')
        .then((m) => m.mount(frame, store))
        .catch(() => { document.getElementById('sm-failed')?.removeAttribute('hidden'); });
    }, { rootMargin: ISLAND_MARGIN });
    io.observe(frame);
  }
}
