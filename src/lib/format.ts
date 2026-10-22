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
