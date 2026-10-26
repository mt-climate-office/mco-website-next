// Homepage photo hero: progressive enhancement over the build-time photo.
//
// The hero shows one view, West, on the kit's default public schedule (most
// recent capture, first date 2026-10-22; DECISIONS D16, D22), one station at
// a time (D29). Its one control, "Next station", steps through the set west
// to east and wraps. Every other view, date and time is in the Photo
// Explorer.
//
// On load, and when the tab comes back into view, a newer West set than the
// one on screen replaces it once at least half its cameras are in, keeping
// the station on screen if it is in the new set. A photo swaps only once
// the next one has decoded. Any failure keeps what is on screen, with its
// stamp. The kit (mco-core.js, then mco-photos.js) are classic scripts that
// have run before this module.

import { count, isoTime, stampMT } from '../lib/format';
import { featuredIndex, HERO_VIEW, isIn, latestSet, type HeroSet, type HeroStation, type Mco } from '../lib/photo-hero';

declare const MCO: Mco;

/** [large URL, alt text, station name, thumbnail URL], as the component writes them. */
type Shot = [string, string, string, string];

const hero = document.getElementById('hero');
const photo = document.getElementById('hero-photo') as HTMLImageElement | null;
const thumb = document.getElementById('hero-thumb') as HTMLImageElement | null;
// Up to the kit's 750px breakpoint the <picture> shows the thumbnail (D29).
const small = document.getElementById('hero-photo-small') as HTMLSourceElement | null;
const phone = window.matchMedia('(max-width: 750px)');
/** The URL this screen draws for a shot: thumbnail on a phone, else large. */
const urlFor = (shot: Shot) => (phone.matches ? shot[3] : shot[0]);
if (hero && photo && thumb && typeof MCO !== 'undefined' && MCO.photos) init(hero, photo, thumb);

function init(hero: HTMLElement, photo: HTMLImageElement, thumb: HTMLImageElement) {
  const P = MCO.photos;
  const stations: HeroStation[] = (JSON.parse(hero.dataset.stations || '[]') as [string, string][])
    .map(([id, name]) => ({ id, name }));
  let shots: Shot[] = JSON.parse(hero.dataset.tiles || '[]');
  let index = Number(hero.dataset.index) || 0;
  let shownAt = Number(hero.dataset.slotAt);
  let busy = false;
  let step = 0; // the latest show(); an older one that decodes late is dropped

  const text = (key: string, value: string) =>
    document.querySelectorAll<HTMLElement>(`[data-hero="${key}"]`).forEach((el) => { el.textContent = value; });

  async function show(i: number) {
    const shot = shots[i];
    if (!shot) return;
    const mine = ++step;
    // The next station's thumbnail shows through while its photo loads.
    thumb.src = shot[3];
    photo.setAttribute('aria-busy', 'true');
    try {
      const next = new Image();
      next.src = urlFor(shot);
      await next.decode();
    } catch { /* show it anyway; the browser draws what arrives */ }
    if (mine !== step) return;
    index = i;
    if (small) small.srcset = shot[3];
    photo.src = shot[0];
    photo.alt = shot[1];
    text('station', shot[2]);
    photo.removeAttribute('aria-busy');
    preload((i + 1) % shots.length);
  }

  // The next station's photo, fetched while the visitor looks at this one.
  // Never during page load: a second 300 KB photo then competes with the
  // first for the connection (Lighthouse mobile fell from 90+ to 85).
  function preload(i: number) {
    const shot = shots[i];
    if (shot) new Image().src = urlFor(shot);
  }

  const next = document.getElementById('hero-next');
  if (next && shots.length > 1) {
    next.hidden = false;
    next.addEventListener('click', () => { void show((index + 1) % shots.length); });
    // First intent to press it: a pointer over it, or keyboard focus.
    const warm = () => preload((index + 1) % shots.length);
    next.addEventListener('pointerenter', warm, { once: true });
    next.addEventListener('focus', warm, { once: true });
  }

  async function probe() {
    if (busy) return;
    busy = true;
    try {
      const schedule = await P.load();
      const set = await latestSet(MCO, schedule, stations, HERO_VIEW, { after: shownAt });
      if (set && isIn(set) && set.slotAt > shownAt) {
        swapSet(set);
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

  function swapSet(set: HeroSet) {
    const current = shots[index]?.[2];
    shots = set.tiles.map((t) => [t.full, t.alt, t.stationName, t.src]);
    const same = shots.findIndex((s) => s[2] === current);
    void show(same >= 0 ? same : featuredIndex(set));
    text('direction', set.direction);
    text('facing', set.direction);
    text('ratio', `${count(set.reportedCount)} of ${count(set.cameraCount)}`);
    const time = document.querySelector<HTMLTimeElement>('[data-hero="time"]');
    if (time) { time.dateTime = isoTime(set.slotAt); time.textContent = stampMT(set.slotAt); }
  }
}
