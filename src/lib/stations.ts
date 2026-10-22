// The station catalog for the /mesonet/stations/ pages, fetched once per
// build. Every station page and the index read the same memoized promise, so
// a build makes one /stations/ request and one schedule.json request, not one
// per page.
//
// Static facts only: no readings and no health. Live readings arrive with a
// later island, and health comes from the mesonet-compliance summary (D5).

import { buildSnapshot, getStations, type Station } from './mesonet';

// The camera schedule on data2 (DECISIONS D6). Used here only to decide which
// stations get a Photo Explorer link.
const PHOTO_SCHEDULE_URL = 'https://data2.climate.umt.edu/mesonet/photos/schedule/schedule.json';
const TIMEOUT_MS = 28_000;

// Public camera directions (D7, D15). The Photo Explorer offers these and
// nothing else without ?internal=1.
const PUBLIC_VIEWS = ['N', 'E', 'S', 'W'];

/** The parts of schedule.json this file reads. */
interface PhotoSchedule {
  stations: Record<string, {
    first_month?: string | null;
    periods?: { views?: Record<string, { slots_local?: string[] }> }[];
  }>;
}

export interface Catalog {
  /** Every station from /stations/, sorted by name. */
  stations: Station[];
  /** Station ids the Photo Explorer opens with ?station=. */
  cameras: Set<string>;
  /** When /stations/ was fetched, epoch ms. */
  fetchedAt: number;
}

let catalog: Promise<Catalog> | undefined;

/** The build's station catalog. Fetched on first call, shared afterwards. */
export const getCatalog = (): Promise<Catalog> => (catalog ??= load());

/** Site path of a station's page, for url(). */
export const stationPath = (id: string): string => `mesonet/stations/${encodeURIComponent(id)}/`;

async function load(): Promise<Catalog> {
  const [stations, cameraIds] = await Promise.all([
    buildSnapshot('/stations/', () => getStations()),
    buildSnapshot('photos/schedule/schedule.json', loadCameraIds),
  ]);
  const rows = [...stations.rows].sort((a, b) => a.name.localeCompare(b.name, 'en'));
  // The Photo Explorer places only HydroMet stations that have a public view
  // in the schedule (mesonet-photo-explorer/docs/app.js, loadData); any other
  // ?station= is ignored there, so link only these.
  const scheduled = new Set(cameraIds.rows);
  const cameras = new Set(rows
    .filter((s) => s.sub_network === 'HydroMet' && scheduled.has(s.station))
    .map((s) => s.station));
  return { stations: rows, cameras, fetchedAt: stations.fetchedAt };
}

async function loadCameraIds(): Promise<string[]> {
  const res = await fetch(PHOTO_SCHEDULE_URL, {
    headers: { accept: 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`photos: HTTP ${res.status} from ${PHOTO_SCHEDULE_URL}`);
  const body = (await res.json()) as PhotoSchedule;
  return Object.entries(body.stations ?? {})
    .filter(([, st]) => st.first_month && (st.periods ?? []).some((p) =>
      PUBLIC_VIEWS.some((v) => (p.views?.[v]?.slots_local?.length ?? 0) > 0)))
    .map(([id]) => id);
}
