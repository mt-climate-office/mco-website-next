// The homepage photo hero's set: one slot, one direction, every station
// camera that delivered a photo for it, ordered west to east.
//
// Runs in both realms with the same code: at build time against the kit
// evaluated in node:vm (src/lib/kit-node.ts), and in the browser against
// window.MCO (src/scripts/photo-hero.ts). Every rule about photos (audience,
// slots, the 2026-10-22 public start, frame URLs, labels) is the kit's
// MCO.photos; this file only decides which stations to ask and how to lay
// out the answer. The hero uses the kit's default audience: no `since`, no
// `fullHistory` (DECISIONS D16).

import type { PhotoDirection, PhotoSet, PhotoTile } from '../components/data/types';

// ── The parts of MCO.photos this site calls (mco-web-style v0.15+) ────────

export interface PhotoFrame {
  token: string;
  label: string;
  /** The slot's UTC instant, epoch ms. */
  slotUtcMs: number;
  webpUrl: string;
  thumbUrl: string;
}
/** A parsed schedule (opaque here except for what the site reads). */
export interface PhotoSchedule {
  stations: Map<string, { station: string; name: string }>;
  minDate: string | null;
}
export interface Slot { date: string; time: string }
export interface ControlState { date: string | null; time: string | null; view: string | null; ms: number | null }
export interface Roll { kind: 'time' | 'date' | 'view'; reason?: string; from: string; to: string; date?: string }
export interface PhotoControls {
  state(): ControlState;
  set(next: Partial<Slot & { view: string }>, o?: { silent?: boolean }): ControlState;
  refresh(): void;
  params(): Record<string, string>;
  pinned: boolean;
}
export interface McoPhotos {
  DEFAULT_VIEW: string;
  load(opts?: object): Promise<PhotoSchedule>;
  hasCamera(schedule: PhotoSchedule, station: string): boolean;
  isShotAt(schedule: PhotoSchedule, station: string, token: string, date: string, hhmm: string): boolean;
  latestSlot(schedule: PhotoSchedule, opts?: { now?: number }): Slot | null;
  previousSlot(schedule: PhotoSchedule, date: string, time: string): Slot | null;
  listDay(schedule: PhotoSchedule, station: string, token: string, ymdUtc: string): Promise<PhotoFrame[]>;
  toUtcMs(ymd: string, hhmm: string): number;
  toWallClock(ms: number): { date: string; time: string };
  utcYmd(ms: number): string;
  label(token: string): string;
  stampLabel(ms: number): string;
  rollMessage(r: Roll): string;
  initPhotoControls(opts: object): PhotoControls;
}
export interface Mco {
  photos: McoPhotos;
  [helper: string]: any;
}

// ── The set ─────────────────────────────────────────────────────────────────

/** A station the hero may show: from /stations/, ordered west to east. */
export interface HeroStation { id: string; name: string }

/** Tiles the mosaic draws: ten columns of three on wide screens. */
export const TILE_COUNT = 30;

/** 'N' → 'north', in the kit's own words. */
export const directionOf = (P: McoPhotos, token: string): PhotoDirection =>
  P.label(token).toLowerCase() as PhotoDirection;

/** Alt text for one tile: "Looking north from Lolo Lower". */
export const tileAlt = (P: McoPhotos, token: string, stationName: string): string =>
  `Looking ${P.label(token).toLowerCase()} from ${stationName}`;

/** `n` items spread evenly across `xs`, keeping their order. */
export function spread<T>(xs: readonly T[], n: number): T[] {
  if (xs.length <= n) return [...xs];
  return Array.from({ length: n }, (_, i) => xs[Math.floor((i * xs.length) / n)]);
}

/** The stations, in order, that have a camera in this schedule's audience. */
export const cameraStations = (P: McoPhotos, schedule: PhotoSchedule, stations: readonly HeroStation[]): HeroStation[] =>
  stations.filter((s) => P.hasCamera(schedule, s.id));

// At most this many archive listings in flight. One per scheduled camera per
// change, each a few hundred bytes.
const CONCURRENCY = 16;

async function pool<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
  return out;
}

export interface HeroSet extends PhotoSet {
  /** The slot, Mountain wall clock. */
  slot: Slot;
  /** Kit view token, e.g. 'N'. */
  view: string;
  /** The view in words, e.g. 'north'. */
  direction: PhotoDirection;
  /** Cameras scheduled to shoot this slot and view. */
  scheduled: number;
}

/**
 * The set for one slot and view: every camera station scheduled for it is
 * looked up in the archive (MCO.photos.listDay, one UTC day per station), and
 * the ones whose frame for that slot exists become tiles, west to east.
 * `cameraCount` is every station with a camera in the audience;
 * `reportedCount` is the frames found. Any failed listing rejects, so a
 * caller never shows a count that undercounts because a request failed.
 */
export async function loadSet(
  MCO: Mco, schedule: PhotoSchedule, stations: readonly HeroStation[], slot: Slot, view: string,
): Promise<HeroSet> {
  const P = MCO.photos;
  const ms = P.toUtcMs(slot.date, slot.time);
  const day = P.utcYmd(ms);
  const cams = cameraStations(P, schedule, stations);
  const shot = cams.filter((s) => P.isShotAt(schedule, s.id, view, slot.date, slot.time));
  const found = await pool(shot, async (s) => {
    const frames = await P.listDay(schedule, s.id, view, day);
    return frames.find((f) => f.slotUtcMs === ms) ?? null;
  });
  const tiles: PhotoTile[] = [];
  found.forEach((f, i) => {
    if (!f) return;
    const name = shot[i].name;
    tiles.push({ src: f.thumbUrl, alt: tileAlt(P, view, name), stationName: name, capturedAt: f.slotUtcMs });
  });
  return {
    tiles, slotAt: ms, cameraCount: cams.length, reportedCount: tiles.length,
    slot, view, direction: directionOf(P, view), scheduled: shot.length,
  };
}

/** Half the scheduled cameras have delivered: the slot is in. */
export const isIn = (s: HeroSet): boolean => s.scheduled > 0 && s.reportedCount * 2 >= s.scheduled;

/**
 * The most recent set that is in, for a view: the kit's latest slot (its
 * processing lag already applied), stepping back a slot at a time while
 * fewer than half the scheduled cameras have delivered. At most `tries`
 * slots; past that, the fullest one seen. null when the schedule has no slot.
 */
export async function latestSet(
  MCO: Mco, schedule: PhotoSchedule, stations: readonly HeroStation[], view: string,
  { now, tries = 3, after }: { now?: number; tries?: number; after?: number } = {},
): Promise<HeroSet | null> {
  const P = MCO.photos;
  let slot = P.latestSlot(schedule, { now });
  let best: HeroSet | null = null;
  for (let i = 0; slot && i < tries; i++) {
    if (after != null && P.toUtcMs(slot.date, slot.time) <= after) break;
    const set = await loadSet(MCO, schedule, stations, slot, view);
    if (isIn(set)) return set;
    if (!best || set.reportedCount > best.reportedCount) best = set;
    slot = P.previousSlot(schedule, slot.date, slot.time);
  }
  return best;
}
