// Homepage photo hero: progressive enhancement over the build-time mosaic.
//
// The hero shows one view, West, on the kit's default public schedule (most
// recent capture, first date 2026-10-22; DECISIONS D16, D22). It has no
// controls: every other view, date and time is in the Photo Explorer.
//
// On load, and when the tab comes back into view, a newer West set than the
// one on screen replaces it once at least half its cameras are in. Tiles are
// swapped in place; the stamp and counts follow. Any failure keeps what is
// on screen, with its stamp. The kit (mco-core.js, then mco-photos.js) are
// classic scripts that have run before this module.

import { count, isoTime, stampMT } from '../lib/format';
import { HERO_VIEW, isIn, latestSet, mosaicLabel, spread, TILE_COUNT, type HeroSet, type HeroStation, type Mco } from '../lib/photo-hero';

declare const MCO: Mco;

const mosaic = document.getElementById('hero-mosaic');
if (mosaic && typeof MCO !== 'undefined' && MCO.photos) init(mosaic);

function init(mosaic: HTMLElement) {
  const P = MCO.photos;
  const stations: HeroStation[] = (JSON.parse(mosaic.dataset.stations || '[]') as [string, string][])
    .map(([id, name]) => ({ id, name }));
  let shownAt = Number(mosaic.dataset.slotAt);
  let busy = false;

  async function probe() {
    if (busy) return;
    busy = true;
    try {
      const schedule = await P.load();
      const set = await latestSet(MCO, schedule, stations, HERO_VIEW, { after: shownAt });
      if (set && isIn(set) && set.slotAt > shownAt) {
        render(set);
        shownAt = set.slotAt;
      }
    } catch { /* keep what is on screen */ } finally {
      busy = false;
    }
  }

  void probe();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void probe();
  });

  function render(set: HeroSet) {
    const tiles = spread(set.tiles, TILE_COUNT);
    [...mosaic.children].forEach((cell, i) => {
      const t = tiles[i];
      let img = cell.querySelector('img');
      if (!t) { img?.remove(); return; }
      if (!img) {
        img = document.createElement('img');
        img.width = 320;
        img.height = 180;
        img.decoding = 'async';
        img.alt = '';
        cell.append(img);
      }
      img.src = t.src;
    });
    mosaic.setAttribute('aria-label', mosaicLabel(set));
    const text = (key: string, value: string) =>
      document.querySelectorAll<HTMLElement>(`[data-hero="${key}"]`).forEach((el) => { el.textContent = value; });
    text('direction', set.direction);
    text('facing', set.direction);
    text('ratio', `${count(set.reportedCount)} of ${count(set.cameraCount)}`);
    const time = document.querySelector<HTMLTimeElement>('[data-hero="time"]');
    if (time) { time.dateTime = isoTime(set.slotAt); time.textContent = stampMT(set.slotAt); }
  }
}
