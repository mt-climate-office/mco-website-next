// Types for the parts of the mesonet-compliance ruleset this site calls. The
// package is one plain ES module with JSDoc and no .d.ts; these mirror its
// JSDoc at the pinned tag (package.json, v0.1.0). Re-check them on a bump.

declare module 'mesonet-compliance' {
  export const RULESET_VERSION: string;
  export const SCHEMA_VERSION: number;
  /** A station is reporting when its latest record is younger than this. */
  export const FRESH_MINUTES: number;

  export interface Element { code: string; label: string }

  /** One row of assessHealth(). */
  export interface HealthRow {
    station: string;
    sub_network: string | null;
    /** Epoch ms of the latest record, or null when there is none. */
    datetime: number | null;
    /** The Status app's names: fresh = reporting, null = no record. */
    status: 'fresh' | 'stale' | 'null';
    health: 'operational' | 'partial' | 'outage';
    /** Labels of expected sensors with no value in the latest record. */
    missing: string[];
    sensor_list_known: boolean;
  }

  /** Expected elements per station, or null when `rows` is not the bulk shape. */
  export function groupElements(rows: unknown): Map<string, Element[]> | null;

  export function assessHealth(p: {
    stations: readonly object[];
    latest: readonly object[];
    elements: Map<string, Element[]> | null;
    now: number;
  }): HealthRow[];
}
