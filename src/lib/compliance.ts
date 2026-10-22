// The mesonet-compliance summary: headline network figures, computed every
// 15 minutes by the published ruleset and written to data2 (DECISIONS D5).
// Headline numbers come from here and are never computed on this site.
//
// Schema v1 has no maintenance section (D15), so there is nothing here that
// could put a maintenance figure on a page. Percentages are floored (D15).
//
// Plain fetch, so it runs at build time and in the browser alike.

import type { NetworkSummary } from '../components/data/types';

export const SUMMARY_URL = 'https://data2.climate.umt.edu/mesonet/compliance/v1/summary.json';

const TIMEOUT_MS = 15_000;

/** summary.json, schema_version 1 (mesonet-compliance README, "The summary file"). */
export interface ComplianceSummary {
  schema_version: 1;
  /** Ruleset version that produced the numbers. */
  ruleset_version: string;
  /** When the inputs were read, epoch ms. */
  generated_at: number;
  /** Newest `datetime` in /latest/, epoch ms. */
  latest_newest: number | null;
  stations: {
    total: number;
    by_network: Record<string, number>;
    colocated_sites: number;
    colocated_stations: number;
  };
  reporting: {
    /** A station is reporting when its latest record is younger than this. */
    threshold_minutes: number;
    reporting: number;
    stale: number;
    no_record: number;
    /** Whole percent of stations.total, floored. */
    pct: number;
  };
  health: {
    operational: number;
    partial: number;
    outage: number;
    unknown_sensor_list: number;
    /** Whole percent of stations.total, floored; may sum to under 100. */
    pct: { operational: number; partial: number; outage: number };
  };
}

const isCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Throws unless `body` is a v1 summary with the fields the site reads. */
export function parseSummary(body: unknown): ComplianceSummary {
  const s = body as ComplianceSummary;
  const ok = s != null && typeof s === 'object' &&
    s.schema_version === 1 &&
    typeof s.generated_at === 'number' &&
    isCount(s.stations?.total) && s.stations.total > 0 &&
    isCount(s.reporting?.reporting) && isCount(s.reporting?.threshold_minutes) &&
    isCount(s.reporting?.pct) &&
    isCount(s.health?.operational) && isCount(s.health?.partial) && isCount(s.health?.outage) &&
    isCount(s.health?.pct?.operational) && isCount(s.health?.pct?.partial) && isCount(s.health?.pct?.outage);
  if (!ok) throw new Error('compliance: summary.json is not schema v1');
  return s;
}

/** Fetch and validate the live summary. Throws on any failure. */
export async function getSummary(signal?: AbortSignal): Promise<ComplianceSummary> {
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(SUMMARY_URL, {
    headers: { accept: 'application/json' },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  if (!res.ok) throw new Error(`compliance: HTTP ${res.status} from ${SUMMARY_URL}`);
  return parseSummary(await res.json());
}

let snapshot: Promise<ComplianceSummary> | undefined;

/**
 * The summary for a page's build-time snapshot. A failed or malformed fetch
 * fails the build, so the previous deploy (stale figures with their
 * timestamp, never an error string) stays live. One fetch per build, shared
 * by every page that calls it.
 */
export function loadSummary(): Promise<ComplianceSummary> {
  snapshot ??= getSummary().catch((err: unknown) => {
    throw new Error('compliance: build-time fetch of summary.json failed; not publishing a page without its snapshot', { cause: err });
  });
  return snapshot;
}

/** The homepage NetworkStatusBar's props from a summary. */
export const toNetworkSummary = (s: ComplianceSummary): NetworkSummary => ({
  generatedAt: s.generated_at,
  stations: s.stations.total,
  reporting: s.reporting.reporting,
  reportingWindowHours: s.reporting.threshold_minutes / 60,
  health: {
    operational: s.health.operational,
    partial: s.health.partial,
    outage: s.health.outage,
  },
});
