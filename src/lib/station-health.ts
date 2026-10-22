// Per-station reporting and health for the /mesonet/status/ table, from the
// mesonet-compliance ruleset (DECISIONS D5: clients needing per-station
// detail import the rules). The rules are not re-implemented here; this file
// fetches their three inputs, as the ruleset's own job does, and shapes the
// output for display. Runs at build time and in the browser.

import { assessHealth, groupElements } from 'mesonet-compliance';
import { getElementsAll, getLatest, getStations, type Station } from './mesonet';
import { stampMT } from './format';
import { DASHBOARD } from './tools';

export type ReportingStatus = 'reporting' | 'stale' | 'none';
export type Health = 'operational' | 'partial' | 'outage';

/** One table row. Labels are the text the page shows; colour carries nothing. */
export interface StationHealthRow {
  id: string;
  name: string;
  network: string;
  county: string;
  status: ReportingStatus;
  /** Epoch ms of the latest record, or null. */
  datetime: number | null;
  health: Health;
  /** Labels of expected sensors with no value in the latest record. */
  missing: string[];
}

export interface StationHealthSnapshot {
  rows: StationHealthRow[];
  /** When the inputs were read, epoch ms. Statuses are as of this time. */
  fetchedAt: number;
}

export const STATUS_LABEL: Record<ReportingStatus, string> = {
  reporting: 'Reporting',
  stale: 'Stale',
  none: 'No record',
};

// "Partial sensor outage" and "Total outage" as in D10; the Status app's
// legend says the same things.
export const HEALTH_LABEL: Record<Health, string> = {
  operational: 'Operational',
  partial: 'Partial sensor outage',
  outage: 'Total outage',
};

/** Sort order for the Status and Health columns: best first. */
export const STATUS_RANK: Record<ReportingStatus, number> = { reporting: 0, stale: 1, none: 2 };
export const HEALTH_RANK: Record<Health, number> = { operational: 0, partial: 1, outage: 2 };

const STATUS_FROM_RULES = { fresh: 'reporting', stale: 'stale', null: 'none' } as const;

/** The station's page in the Station Dashboard (on-prem host until the gateway cutover). */
export const stationHref = (id: string): string => `${DASHBOARD}?s=${encodeURIComponent(id)}`;

/** Display text for each column, shared by the build-time and browser renders. */
export const cellText = (r: StationHealthRow) => ({
  network: r.network,
  status: STATUS_LABEL[r.status],
  lastReport: r.datetime == null ? 'No record' : stampMT(r.datetime),
  health: HEALTH_LABEL[r.health],
  missing: r.missing.length ? r.missing.join(', ') : 'None',
  county: r.county,
});

/**
 * Fetch the ruleset's three inputs and assess every station. Throws if any
 * input fails or the element listing is not the bulk shape.
 */
export async function getStationHealth(signal?: AbortSignal): Promise<StationHealthSnapshot> {
  const now = Date.now();
  const [stations, latest, elementRows] = await Promise.all([
    getStations({}, signal),
    getLatest({}, signal),
    getElementsAll({}, signal),
  ]);
  if (!stations.length || !latest.length) throw new Error('station-health: empty stations or latest');
  if (typeof latest[0]!.datetime !== 'number') throw new Error('station-health: datetime is not epoch ms');
  const elements = groupElements(elementRows);
  if (!elements) throw new Error('station-health: /elements/?all=true is not the bulk shape');

  const byId = new Map<string, Station>(stations.map((s) => [s.station, s]));
  const rows = assessHealth({ stations, latest, elements, now }).map((h): StationHealthRow => {
    const s = byId.get(h.station)!;
    return {
      id: h.station,
      name: s.name,
      network: h.sub_network ?? '',
      county: s.county ?? '',
      status: STATUS_FROM_RULES[h.status],
      datetime: h.datetime,
      health: h.health,
      missing: h.missing,
    };
  });
  rows.sort((a, b) => a.name.localeCompare(b.name));
  return { rows, fetchedAt: now };
}

let snapshot: Promise<StationHealthSnapshot> | undefined;

/**
 * The build-time snapshot. A failed fetch fails the build, so the previous
 * deploy stays live (stale data with its timestamp, never an error string).
 * One fetch per build, shared by the page and its CSV.
 */
export function loadStationHealth(): Promise<StationHealthSnapshot> {
  snapshot ??= getStationHealth().catch((err: unknown) => {
    throw new Error('station-health: build-time fetch failed; not publishing a page without its snapshot', { cause: err });
  });
  return snapshot;
}

// ── CSV ─────────────────────────────────────────────────────────────────────

export const CSV_HEADER = [
  'Station', 'ID', 'Network', 'Status', 'Last report (Mountain Time)',
  'Last report (UTC)', 'Health', 'Sensors not reporting', 'County',
];

/** One CSV record per row; the same columns as the table, plus the UTC time. */
export const csvRecord = (r: StationHealthRow): string[] => {
  const t = cellText(r);
  return [
    r.name, r.id, t.network, t.status, t.lastReport,
    r.datetime == null ? '' : new Date(r.datetime).toISOString(),
    t.health, t.missing, t.county,
  ];
};

// Quote every field. A leading = + - @ would run as a formula in a
// spreadsheet, so it gets a ' in front (OWASP CSV injection).
const field = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;

/** RFC 4180 CSV with a header row and CRLF line ends. */
export const toCsv = (records: string[][]): string =>
  [CSV_HEADER, ...records].map((rec) => rec.map(field).join(',')).join('\r\n') + '\r\n';
