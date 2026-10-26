// Props contracts for the homepage data components. The data layer (the typed
// API client in src/lib/, the mesonet-compliance summary, the data2 photo
// manifests) maps its responses onto these shapes; the components never fetch.
//
// Every component treats an absent prop as "no data": it renders a defined
// empty state, never a made-up figure. Times are epoch milliseconds, as the
// API returns them.

/** One public camera direction (DECISIONS D7: N/S/E/W only, default North). */
export type PhotoDirection = 'north' | 'south' | 'east' | 'west';

/** One station photo in the hero's set. */
export interface PhotoTile {
  /** Image URL (the manifest's thumbnail WebP on data2). */
  src: string;
  /** The same frame at the kit's large size, 1920 × 1080 (DECISIONS D29). */
  full: string;
  /** Alt text describing the photo, e.g. "Looking north from Lolo Lower". */
  alt: string;
  /** Station display name, e.g. "Lolo Lower". */
  stationName: string;
  /** Capture time, epoch ms. */
  capturedAt: number;
}

/** The most recent capture set, for the hero copy and stamp. */
export interface PhotoSet {
  /** Tiles to draw, already ordered (west to east reads best). */
  tiles: PhotoTile[];
  /** Scheduled slot time of the set, epoch ms. */
  slotAt: number;
  /** Stations with a public camera (from schedule.json, never prose). */
  cameraCount: number;
  /** Stations that delivered a photo for this slot and direction. */
  reportedCount: number;
}

/**
 * Headline network figures (DECISIONS D10), mapped from the mesonet-compliance
 * summary JSON on data2 (D5) by toNetworkSummary() in src/lib/compliance.ts.
 * No maintenance figure (D4, D15).
 */
export interface NetworkSummary {
  /** When the summary was computed, epoch ms. */
  generatedAt: number;
  /** Active public stations. */
  stations: number;
  /** Stations with a record inside the reporting window. */
  reporting: number;
  /** The reporting window the ruleset used, in hours. */
  reportingWindowHours: number;
  /** Health split. The three add up to `stations`. */
  health: {
    operational: number;
    partial: number;
    outage: number;
  };
}

/** One reading in the conditions card. `value: null` means no report. */
export interface Reading {
  /** Plain label, e.g. "Humidity", "Soil moisture, 10 cm". */
  label: string;
  value: number | null;
  /** Unit as displayed after the number, e.g. "°F", "%", " mph". */
  unit: string;
  /** Decimal places to show. Default 0. */
  digits?: number;
}

/** Latest conditions at one station. */
export interface StationConditions {
  station: { id: string; name: string };
  /** Time of the latest record, epoch ms. */
  observedAt: number;
  /** The API's `provisional` flag on that record. */
  provisional: boolean;
  /** The large reading, usually air temperature. */
  headline: Reading;
  /** Plain-language line from the kit's conditions summary (D9), when it exists. */
  summary?: string;
  /** Up to about three secondary readings. */
  readings: Reading[];
}
