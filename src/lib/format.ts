// Build-time formatting for data the page renders statically. The kit's
// MCO.formatStampMT does this in the browser; these run in Astro's
// server render, where window.MCO does not exist. Both use Mountain time.

const TZ = 'America/Denver';

const STAMP = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

/** "Oct 21, 3:00 PM MDT" */
export const stampMT = (ms: number): string => STAMP.format(new Date(ms));

/** ISO string for a <time datetime>. */
export const isoTime = (ms: number): string => new Date(ms).toISOString();

const INT = new Intl.NumberFormat('en-US');

/** "1,234" */
export const count = (n: number): string => INT.format(n);

/** Whole-number percentage of `part` in `whole`, floored so 100 means all
    (DECISIONS D15), or null when `whole` is 0. */
export const percent = (part: number, whole: number): number | null =>
  whole > 0 ? Math.floor((part / whole) * 100) : null;

/** A reading's value with its unit, or "No report". */
export const formatReading = (value: number | null, unit: string, digits = 0): string =>
  value == null ? 'No report' : `${value.toFixed(digits)}${unit}`;

// /stations/ stores date_installed as a calendar date at 00:00 UTC (every
// row, checked 22 Oct 2026). Read in Mountain time it would fall on the day
// before, so it is formatted as the UTC calendar date it encodes.
const CAL_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
});

/** "Jun 2, 2021", for an API date stored at UTC midnight. */
export const calendarDate = (ms: number): string => CAL_DATE.format(new Date(ms));

/** "2021-06-02", for a <time datetime> of the same date. */
export const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

const FEET_PER_METRE = 1 / 0.3048;

/** Elevation in whole metres and feet: { m: "1,400", ft: "4,595" }. */
export const elevation = (metres: number): { m: string; ft: string } => ({
  m: count(Math.round(metres)),
  ft: count(Math.round(metres * FEET_PER_METRE)),
});

/** "45.56° N, 109.61° W", with the API's precision. */
export const latLon = (lat: number, lon: number): string =>
  `${Math.abs(lat)}° ${lat < 0 ? 'S' : 'N'}, ${Math.abs(lon)}° ${lon < 0 ? 'W' : 'E'}`;
