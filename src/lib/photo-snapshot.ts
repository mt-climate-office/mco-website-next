// The homepage photo hero's build-time snapshot. Build-only (it loads the
// kit in node:vm). The set is computed by the kit's MCO.photos through
// src/lib/photo-hero.ts, the same code the page runs when it looks for a
// newer set.
//
// A failed fetch, a hash mismatch or an empty set fails the build, as
// buildSnapshot does, so the previous deploy (an older set with its stamp,
// never an error string) stays live. One load per build.

import { loadKitInNode } from './kit-node';
import { HERO_VIEW, latestSet, type HeroSet, type HeroStation } from './photo-hero';
import { getCatalog } from './stations';

export interface HeroSnapshot {
  set: HeroSet;
  /** Every station with a public camera, west to east: the page's lookup table. */
  stations: HeroStation[];
}

let snapshot: Promise<HeroSnapshot> | undefined;

/** The build's hero set. Loaded on first call, shared afterwards. */
export const loadHeroSnapshot = (): Promise<HeroSnapshot> => (snapshot ??= load().catch((err: unknown) => {
  throw new Error('photos: build-time photo set failed; not publishing a page without its snapshot', { cause: err });
}));

async function load(): Promise<HeroSnapshot> {
  const [MCO, catalog] = await Promise.all([loadKitInNode(), getCatalog()]);
  const P = MCO.photos;
  // The kit's default audience (DECISIONS D16): no since, no fullHistory.
  const schedule = await P.load();
  const stations: HeroStation[] = [...catalog.stations]
    .sort((a, b) => a.longitude - b.longitude)
    .map((s) => ({ id: s.station, name: s.name }))
    .filter((s) => P.hasCamera(schedule, s.id));
  const set = await latestSet(MCO, schedule, stations, HERO_VIEW);
  if (!set) throw new Error('photos: the schedule offers no slot');
  if (!set.tiles.length) throw new Error(`photos: no frames for ${set.slot.date} ${set.slot.time} ${set.view}`);
  // Plain data out of the vm realm.
  return JSON.parse(JSON.stringify({ set, stations })) as HeroSnapshot;
}
