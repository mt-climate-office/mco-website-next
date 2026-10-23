// The homepage station map's data rules, shared by the build (the snapshot
// table) and the browser (the refresh and the map island). No DOM, no kit.
//
// Conventions are the Mesonet Explorer's, so the two read the same
// (mesonet-explorer/app.js):
//   - air temperature coalesces the 2 m sensor before the 8 ft one: HydroMet
//     stations report "@ 2 m", AgriMet stations "@ 8 ft" (REGISTRY air_temp,
//     els ['air_temp_0200', 'air_temp_0244']);
//   - a station is stale after 3 h without a report, and stale stations are
//     hidden from the map with a line saying how many (STALE_MS, and the
//     legend's "N stations hidden (no report in 3 h)");
//   - the colour scale is ColorBrewer RdBu reversed (blue cold, red warm),
//     pivoting at 32 °F, over the 2nd–98th percentile of the values shown,
//     and using only the matching half of the ramp when every value is on one
//     side of freezing (makeScale, robustDomain).

import { reading, type LatestRow, type Station } from './mesonet';

/** Explicit, in coalesce order. AgriMet reports only the 8 ft sensor. */
export const AIR_TEMP_KEYS = ['Air Temperature @ 2 m [°F]', 'Air Temperature @ 8 ft [°F]'] as const;

/** The API elements to request: both heights, by partial match. */
export const AIR_TEMP_ELEMENTS = ['air_temp'];

/** No report in this long and a station is stale (the Explorer's STALE_MS). */
export const STALE_MS = 3 * 60 * 60 * 1000;

/** The scale's pivot: freezing, in °F (the Explorer's MID_FREEZE). */
export const FREEZING_F = 32;

export type Category = 'ok' | 'stale' | 'nodata';

/** One station as the map and its table twin know it. Coordinates are not
    here: the page does not carry them, and the island fetches them. */
export interface MapStation {
  id: string;
  name: string;
  network: string;
  /** Air temperature, °F, or null when the latest report has none. */
  value: number | null;
  /** Time of the latest report, epoch ms, or null when there is none. */
  at: number | null;
}

/** A latest row's air temperature, whichever height the station reports. */
export function airTemp(row: LatestRow): number | null {
  for (const key of AIR_TEMP_KEYS) {
    const v = reading(row, key);
    if (v != null) return v;
  }
  return null;
}

/** Every station with a location, by name, with its latest air temperature (if any). */
export function joinLatest(stations: Station[], latest: LatestRow[]): MapStation[] {
  const byId = new Map(latest.map((r) => [r.station, r]));
  return stations
    .filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
    .map((s) => {
      const row = byId.get(s.station);
      return {
        id: s.station,
        name: s.name,
        network: s.sub_network,
        value: row ? airTemp(row) : null,
        at: row && typeof row.datetime === 'number' ? row.datetime : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));
}

/** Apply a fresh /latest/ response to the stations already known. */
export function applyLatest(list: MapStation[], latest: LatestRow[]): MapStation[] {
  const byId = new Map(latest.map((r) => [r.station, r]));
  return list.map((s) => {
    const row = byId.get(s.id);
    return row
      ? { ...s, value: airTemp(row), at: typeof row.datetime === 'number' ? row.datetime : null }
      : { ...s, value: null, at: null };
  });
}

/**
 * Stale is measured from when the data was fetched, not from now: a
 * build-time snapshot shown a day later still maps every station that was
 * reporting when it was taken, under that snapshot's own time stamp.
 */
export function category(s: MapStation, fetchedAt: number): Category {
  if (s.at == null || fetchedAt - s.at > STALE_MS) return 'stale';
  return s.value == null ? 'nodata' : 'ok';
}

export interface Summary {
  /** Newest report among the stations on the map, epoch ms, or null. */
  latestAt: number | null;
  shown: number;
  stale: number;
  nodata: number;
}

export function summarize(list: MapStation[], fetchedAt: number): Summary {
  const out: Summary = { latestAt: null, shown: 0, stale: 0, nodata: 0 };
  for (const s of list) {
    const c = category(s, fetchedAt);
    if (c === 'ok') {
      out.shown++;
      if (out.latestAt == null || s.at! > out.latestAt) out.latestAt = s.at;
    } else out[c]++;
  }
  return out;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** The map's hidden-station lines, in the tools' words. Empty when none. */
export function hiddenLines(sum: Summary): string[] {
  return [
    ...(sum.stale ? [`${plural(sum.stale, 'station', 'stations')} hidden (no report in 3 h)`] : []),
    ...(sum.nodata ? [`${plural(sum.nodata, 'station', 'stations')} hidden (no air temperature in the latest report)`] : []),
  ];
}

/** "54°F", or "No report". */
export const formatTemp = (v: number | null): string => (v == null ? 'No report' : `${Math.round(v)}°F`);

// ── Colour scale ──────────────────────────────────────────────────────────

/** 2nd–98th percentile, or the plain extent under 12 values (robustDomain). */
export function robustDomain(values: number[]): [number, number] {
  const v = [...values].sort((a, b) => a - b);
  if (!v.length) return [FREEZING_F - 10, FREEZING_F + 10];
  if (v.length < 12) return [v[0], v[v.length - 1]];
  const q = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
  return [q(0.02), q(0.98)];
}

export interface Scale {
  domain: [number, number];
  /** The pivot inside the domain, or null when every value is on one side. */
  mid: number | null;
  /** Ramp stops in use, low to high (a half ramp when there is no pivot). */
  stops: string[];
  /** Value → position on the stops, 0–1 (clamped). */
  toT: (v: number) => number;
  /** Ticks to label, inside the domain, in °F. */
  ticks: number[];
}

/**
 * The Explorer's makeScale for air temperature, on stops the caller gives
 * (MCO.palette.reversed('RdBu') in the browser): an odd number of stops with
 * the neutral one in the middle.
 */
export function airTempScale(values: number[], stops: string[]): Scale {
  const [lo, hi] = robustDomain(values);
  let use = stops.slice();
  let mid: number | null = null;
  if (FREEZING_F > lo && FREEZING_F < hi) mid = FREEZING_F;
  else if (use.length % 2 === 1) {
    const c = (use.length - 1) / 2;
    use = FREEZING_F <= lo ? use.slice(c) : use.slice(0, c + 1);
  }
  const toT = (v: number) => {
    const x = Math.min(hi, Math.max(lo, v));
    if (hi <= lo) return 0.5;
    if (mid == null) return (x - lo) / (hi - lo);
    return x <= mid ? 0.5 * (x - lo) / (mid - lo) : 0.5 + 0.5 * (x - mid) / (hi - mid);
  };
  return { domain: [lo, hi], mid, stops: use, toT, ticks: ticks(lo, hi, mid) };
}

/** Round-number ticks across [lo, hi], with freezing when it is inside. */
function ticks(lo: number, hi: number, mid: number | null): number[] {
  const span = hi - lo;
  if (!(span > 0)) return [Math.round(lo)];
  const raw = span / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) out.push(Math.round(t));
  if (mid != null && !out.includes(mid)) out.push(mid);
  // Drop a tick that would crowd freezing (closer than a third of a step).
  return out
    .filter((t) => mid == null || t === mid || Math.abs(t - mid) >= step / 3)
    .sort((a, b) => a - b);
}
