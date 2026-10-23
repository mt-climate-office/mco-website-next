// Build-time formatting for data the page renders statically. The kit's
// MCO.formatStampMT does this in the browser; these run in Astro's
// server render, where window.MCO does not exist. Both use Mountain time.

const TZ = 'America/Denver';

const STAMP = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
});

/** "Oct 21, 3:00 PM MDT", in every engine. Assembled from parts: WebKit's
    Intl writes "Oct 21 at 3:00 PM MDT" where Node and Chromium write a
    comma, so the same timestamp read differently after a client refresh. */
export const stampMT = (ms: number): string => {
  const p = Object.fromEntries(STAMP.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.month} ${p.day}, ${p.hour}:${p.minute} ${p.dayPeriod} ${p.timeZoneName}`;
};

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

// date_installed is a Mountain-time calendar date, which the API encodes as
// that date at 00:00 UTC (every row, checked 22 Oct 2026). Converting the
// instant to Mountain time would land on the day before, so the date parts
// are read in UTC: they are the Mountain-time date.
const CAL_DATE = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric',
});

/** "Jun 2, 2021": a Mountain-time calendar date the API stores at 00:00 UTC. */
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
