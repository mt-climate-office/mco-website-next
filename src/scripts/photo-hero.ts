// Homepage photo hero: progressive enhancement over the build-time mosaic.
//
//   - MCO.photos.initPhotoControls under the hero (date, time, direction),
//     on the kit's default public schedule: North, the most recent capture,
//     first date 2026-10-22 (DECISIONS D16). No `since`, no `fullHistory`.
//   - A change swaps the tiles in place and is announced once
//     (MCO.announce), with any move the visitor did not ask for in the same
//     sentence.
//   - URL state per HOUSE-STYLE §4: this page writes the URL, merging the
//     controls' params() (the kit elides the default direction; date and
//     time are kept because "latest" moves). Written on a visitor's change
//     only, so a plain visit leaves the homepage URL clean.
//   - On load with no date or time in the URL, a newer slot than the
//     build's replaces the snapshot when at least half its cameras are in.
//
// Any failure keeps what is on screen: the build-time set, or the last set
// shown, with its stamp. The kit (mco-core.js, then mco-photos.js) are
// classic scripts that have run before this module.

import { count, isoTime, stampMT } from '../lib/format';
import {
  isIn, latestSet, loadSet, spread, TILE_COUNT,
  type HeroSet, type HeroStation, type Mco, type PhotoControls, type PhotoSchedule, type Roll,
} from '../lib/photo-hero';

declare const MCO: Mco;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const bar = $('photo-controls');
const mosaic = $<HTMLUListElement>('hero-mosaic');
if (bar && mosaic && typeof MCO !== 'undefined' && MCO.photos) void init(bar, mosaic);
else if (bar) bar.hidden = true; // No kit photo module: drop the reserved space.

async function init(bar: HTMLElement, mosaic: HTMLUListElement) {
  const P = MCO.photos;
  const stations: HeroStation[] = (JSON.parse(bar.dataset.stations || '[]') as [string, string][])
    .map(([id, name]) => ({ id, name }));
  const built = { date: bar.dataset.date!, time: bar.dataset.time!, view: bar.dataset.view! };
  let shown = { ...built };

  let schedule: PhotoSchedule;
  try {
    schedule = await P.load();
  } catch {
    bar.hidden = true; // The build-time set stays; the controls go.
    return;
  }

  let controls: PhotoControls | null = null;
  let initRolls: Roll[] = [];
  let seq = 0;

  const writeUrl = () => {
    if (!controls) return;
    const p = MCO.urlParams();
    ['date', 'time', 'dir'].forEach((k) => p.delete(k));
    for (const [k, v] of Object.entries(controls.params())) p.set(k, v);
    MCO.replaceUrlState(p, { keepHash: true });
  };

  // One sentence per change: what moved on its own, then what is shown.
  const describe = (set: HeroSet, rolls: Roll[]) => [
    ...rolls.map((r) => P.rollMessage(r)),
    set.reportedCount
      ? `${count(set.reportedCount)} of ${count(set.cameraCount)} cameras, facing ${set.direction}, ${P.stampLabel(set.slotAt)}.`
      : `No photos facing ${set.direction} at ${P.stampLabel(set.slotAt)}.`,
  ].join(' ');

  async function show(rolls: Roll[], { announce = true, write = true } = {}) {
    const st = controls!.state();
    const id = ++seq;
    if (!st.date || !st.time || !st.view) {
      if (announce && rolls.length) MCO.announce(rolls.map((r) => P.rollMessage(r)).join(' '));
      return;
    }
    mosaic.setAttribute('aria-busy', 'true');
    try {
      const set = await loadSet(MCO, schedule, stations, { date: st.date, time: st.time }, st.view);
      if (id !== seq) return; // A later change superseded this one.
      render(set);
      shown = { date: st.date, time: st.time, view: st.view };
      if (write) writeUrl();
      if (announce) MCO.announce(describe(set, rolls));
    } catch {
      if (id !== seq) return;
      // Put the controls back on what the mosaic still shows.
      controls!.set(shown, { silent: true });
      MCO.announce('The photos could not be loaded. Still showing the previous set.', { politeness: 'assertive' });
    } finally {
      if (id === seq) mosaic.removeAttribute('aria-busy');
    }
  }

  controls = P.initPhotoControls({
    schedule,
    date: $('pc-date'),
    time: $('pc-time'),
    steppers: [{ prev: $('pc-prev'), next: $('pc-next') }],
    views: { group: $('pc-views'), select: $('pc-view') },
    // Rolls go into the one announcement per change, not a second one.
    onRoll: false,
    onChange(_state: unknown, change: { source: string; rolls: Roll[] }) {
      if (change.source === 'init') { initRolls = change.rolls; return; }
      void show(change.rolls);
    },
  });
  bar.classList.remove('is-pending');

  const st = controls.state();
  const same = st.date === built.date && st.time === built.time && st.view === built.view;
  if (controls.pinned) {
    // A linked slot: show it as asked, and say so if the kit had to move it.
    if (!same) void show(initRolls, { announce: initRolls.length > 0, write: false });
  } else if (!same) {
    // The landing probe: a newer slot than the build's, once it is in.
    const builtMs = P.toUtcMs(built.date, built.time);
    try {
      const set = await latestSet(MCO, schedule, stations, st.view!,
        st.view === built.view ? { after: builtMs } : {});
      if (set && (isIn(set) || st.view !== built.view)) {
        render(set);
        shown = { date: set.slot.date, time: set.slot.time, view: set.view };
      }
    } catch { /* keep the snapshot */ }
    controls.set(shown, { silent: true });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') controls!.refresh();
  });

  function render(set: HeroSet) {
    const tiles = spread(set.tiles, TILE_COUNT);
    [...mosaic.children].forEach((li, i) => {
      const t = tiles[i];
      let img = li.querySelector('img');
      if (!t) { img?.remove(); return; }
      if (!img) {
        img = document.createElement('img');
        img.width = 320;
        img.height = 180;
        img.decoding = 'async';
        li.append(img);
      }
      img.alt = t.alt;
      img.src = t.src;
    });
    mosaic.setAttribute('aria-label', `Station photos, west to east, facing ${set.direction}`);
    const text = (key: string, value: string) =>
      document.querySelectorAll<HTMLElement>(`[data-hero="${key}"]`).forEach((el) => { el.textContent = value; });
    text('direction', set.direction);
    text('facing', set.direction);
    text('cameras', count(set.cameraCount));
    text('reported', count(set.reportedCount));
    text('ratio', `${count(set.reportedCount)} of ${count(set.cameraCount)}`);
    const time = document.querySelector<HTMLTimeElement>('[data-hero="time"]');
    if (time) { time.dateTime = isoTime(set.slotAt); time.textContent = stampMT(set.slotAt); }
  }
}
