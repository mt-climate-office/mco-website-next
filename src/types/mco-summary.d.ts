// Types for the part of the kit's conditions line this site calls:
// MCO.summary (summary/mco-summary.js, mco-web-style 0.17.x). Hand-written
// from the module's source comments, after the dashboard's
// web/src/types/mco-summary.d.ts. The kit ships no types: when the pin moves,
// re-read the module.

export interface SummaryOptions {
  /** Station id; required for the Mesonet parts. */
  station: string;
  /** Decimal degrees; required for the NWS forecast. */
  lat?: number;
  lon?: number;
  /** False skips /derived/ppt/, which answers 422 for non-HydroMet stations. */
  derivedPpt?: boolean;
  /** The station's /latest/ row (US units) when the caller has it; not fetched again. */
  latest?: Record<string, unknown>;
  /** How the amounts print: 'us' (in, mph) or 'si' (mm, m/s). */
  units?: 'us' | 'si';
  /** Epoch ms, for the Mountain date (default Date.now()). */
  now?: number;
  timeoutMs?: number;
}

export interface McoSummary {
  /** The sentence, '' when nothing is known. Never rejects: a part that fails is left out. */
  forStation(opts: SummaryOptions): Promise<{ text: string }>;
}
