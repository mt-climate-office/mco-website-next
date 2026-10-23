// Typed client for the Montana Mesonet API v2 on mesonet2. Plain fetch, so it
// runs in Node at build time (Astro frontmatter) and in the browser alike.
//
// Deliberately absent:
// - /stations/status/ is the AirTable build registry, not network health.
// - /photos/ is broken on mesonet2; photo times and frames come from data2
//   (DECISIONS D6).
// - Health, reporting % and compliance are never computed here. They come
//   from the mesonet-compliance summary JSON (D5).
//
// Request parameters are derived from the generated spec types (`npm run
// gen:api`). The spec types every 200 response as `{}`, so the row types
// below are written from live responses (22 Oct 2026).

import type { operations } from './mesonet.openapi';

export const API_ORIGIN = 'https://mesonet2.climate.umt.edu';
export const API_BASE = `${API_ORIGIN}/api/v2`;
export const OPENAPI_URL = `${API_ORIGIN}/api/openapi.json`;

// API Gateway ends a request at 30 s. Give up just before, so the caller sees
// a timeout of ours rather than a 504.
const TIMEOUT_MS = 28_000;

type Query<Op extends keyof operations> = NonNullable<operations[Op]['parameters']['query']>;

// Station ids come from data, and `elements` also takes partial names
// (`soil_vwc`), so the spec's enums are widened to strings.
type Ids = { stations?: readonly string[]; elements?: readonly string[] };

export type StationsParams = Omit<Query<'get_stations_stations__get'>, 'type'>;

// `type` and `wide` are fixed by the client; `simple_datetime` would turn
// `datetime` into a string.
export type LatestParams =
  Omit<Query<'read_latest_latest__get'>, 'type' | 'wide' | 'simple_datetime' | 'stations' | 'elements'> & Ids;

// `all=true` (the bulk per-station listing) is fixed by getElementsAll().
export type ElementsParams = Omit<Query<'read_elements_elements__get'>, 'type' | 'all' | 'grouped'>;

/** One row of `/stations/?type=json`. */
export interface Station {
  station: string;
  name: string;
  /** 'HydroMet' or 'AgriMet' as of Oct 2026; not an enum in the spec. */
  sub_network: string;
  latitude: number;
  longitude: number;
  /** Metres. */
  elevation: number;
  county: string;
  /** Epoch milliseconds. */
  date_installed: number;
  mesowest_id: string | null;
  gwic_id: number | null;
  nwsli_id: string | null;
  funded: boolean;
}

/**
 * One row of `/latest/?type=json&wide=true`. Every other key is an element
 * named as a display string with units, e.g. `"Air Temperature @ 2 m [°F]"`.
 * An element can be null, and absent altogether when a single-station
 * request has no value for it. Read them with `reading()`.
 */
export type LatestRow = {
  station: string;
  /** Epoch milliseconds of the station's most recent observation. */
  datetime: number;
  /** True until the next morning's QC pipeline has run. */
  provisional: boolean;
} & { [element: string]: string | number | boolean | null };

/** An element's value from a latest row, or null if it is missing. */
export const reading = (row: LatestRow, element: string): number | null => {
  const v = row[element];
  return typeof v === 'number' ? v : null;
};

/**
 * One row of `/elements/?all=true&type=json`: an element a station is
 * expected to report. The bulk listing repeats rows; the mesonet-compliance
 * ruleset dedupes them.
 */
export interface ElementRow {
  station: string;
  /** Element code, e.g. 'air_temp_0200'. */
  element: string;
  description: string;
  /** Matches the `/latest/` column name without its unit, e.g. 'Air Temperature @ 2 m'. */
  description_short: string;
  base_units: string | null;
  us_units: string | null;
  sort_order: number | null;
}

export const getStations = (params: StationsParams = {}, signal?: AbortSignal) =>
  get<Station>('stations/', params, signal);

export const getLatest = (params: LatestParams = {}, signal?: AbortSignal) =>
  get<LatestRow>('latest/', { ...params, wide: true }, signal);

/** The element catalog: one row per element the network reports, no station. */
export const getElements = (params: ElementsParams = {}, signal?: AbortSignal) =>
  get<Omit<ElementRow, 'station'>>('elements/', params, signal);

/** Expected elements for every active public station, in one response. */
export const getElementsAll = (params: ElementsParams = {}, signal?: AbortSignal) =>
  get<ElementRow>('elements/', { ...params, all: true }, signal);

async function get<Row>(path: string, params: object, signal?: AbortSignal): Promise<Row[]> {
  const url = new URL(path, API_BASE + '/');
  url.searchParams.set('type', 'json');
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(url, {
    headers: { accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`mesonet: HTTP ${res.status} from ${url}`);
  const body: unknown = await res.json();
  if (!Array.isArray(body)) throw new Error(`mesonet: expected an array from ${url}`);
  return body as Row[];
}

/**
 * Fetch at build time for a data island's fallback snapshot. A failed or
 * empty fetch fails the build, so the previous deploy (stale data, never an
 * error string) stays live instead.
 */
export async function buildSnapshot<Row>(
  what: string,
  load: () => Promise<Row[]>,
): Promise<{ rows: Row[]; fetchedAt: number }> {
  let rows: Row[];
  try {
    rows = await load();
  } catch (err) {
    throw new Error(`mesonet: build-time fetch of ${what} failed; not publishing a page without its snapshot`, { cause: err });
  }
  if (!rows.length) throw new Error(`mesonet: build-time fetch of ${what} returned no rows`);
  return { rows, fetchedAt: Date.now() };
}
