// The homepage conditions card's data rules: which /latest/ keys it shows
// and how it words them. No DOM and no kit, so the same code can render at
// build time and in the browser (src/scripts/conditions-now.ts).
//
// Only keys the API returns are read, and only readings a station has are
// shown (a single-station /latest/ omits an element with no value). Keys,
// checked against every station's latest row on 22 Oct 2026:
//   - air temperature: "Air Temperature @ 2 m [°F]" (HydroMet), else
//     "Air Temperature @ 8 ft [°F]" (AgriMet), as the Explorer coalesces them
//     (src/lib/station-map.ts AIR_TEMP_KEYS); the label says which height;
//   - "Relative Humidity [%]";
//   - "Wind Speed @ 10 m [mi/h]" (HydroMet), else "Wind Speed @ 8 ft [mi/h]"
//     (AgriMet);
//   - the shallowest "Soil VWC @ -<d> cm [%]" with a value: 5 cm at most
//     HydroMet stations, 10 cm at AgriMet ones.
// Not shown: "Precipitation [in]" is the last reporting interval, not a
// 24-hour total, and /latest/ has no 24-hour sum.

import { reading, type LatestRow } from './mesonet';
import type { Reading, StationConditions } from '../components/data/types';

/** [key, height] in coalesce order. */
const AIR_TEMP: readonly (readonly [string, string])[] = [
  ['Air Temperature @ 2 m [°F]', '2 m'],
  ['Air Temperature @ 8 ft [°F]', '8 ft'],
];
const WIND: readonly (readonly [string, string])[] = [
  ['Wind Speed @ 10 m [mi/h]', '10 m'],
  ['Wind Speed @ 8 ft [mi/h]', '8 ft'],
];
const HUMIDITY = 'Relative Humidity [%]';
const SOIL_VWC = /^Soil VWC @ -?(\d+(?:\.\d+)?) cm \[%\]$/;

function first(row: LatestRow, keys: readonly (readonly [string, string])[]) {
  for (const [key, height] of keys) {
    const value = reading(row, key);
    if (value != null) return { value, height };
  }
  return null;
}

/** The shallowest soil moisture depth with a value, in cm. */
function shallowestSoil(row: LatestRow): { value: number; depth: number } | null {
  let best: { value: number; depth: number } | null = null;
  for (const key of Object.keys(row)) {
    const m = SOIL_VWC.exec(key);
    const value = m ? reading(row, key) : null;
    if (m && value != null) {
      const depth = Number(m[1]);
      if (!best || depth < best.depth) best = { value, depth };
    }
  }
  return best;
}

/** One station's latest row as the card shows it. */
export function toConditions(row: LatestRow, station: { id: string; name: string }): StationConditions {
  const air = first(row, AIR_TEMP);
  const wind = first(row, WIND);
  const humidity = reading(row, HUMIDITY);
  const soil = shallowestSoil(row);
  const readings: Reading[] = [
    ...(humidity != null ? [{ label: 'Relative humidity', value: humidity, unit: '%' }] : []),
    ...(wind ? [{ label: `Wind speed at ${wind.height}`, value: wind.value, unit: ' mph' }] : []),
    ...(soil ? [{ label: `Soil moisture at ${soil.depth} cm`, value: soil.value, unit: '%' }] : []),
  ];
  return {
    station,
    observedAt: row.datetime,
    provisional: row.provisional === true,
    headline: air
      ? { label: `Air temperature at ${air.height}`, value: air.value, unit: '°F' }
      : { label: 'Air temperature', value: null, unit: '°F' },
    readings,
  };
}

/** "Updated just now", "Updated 17 min ago", "Updated 3 h ago", or past two
    days, null (the caller shows the date). */
export function updatedAgo(observedAt: number, now = Date.now()): string | null {
  const min = Math.floor((now - observedAt) / 60_000);
  if (min < 1) return 'Updated just now';
  if (min < 60) return `Updated ${min} min ago`;
  const h = Math.floor(min / 60);
  return h < 48 ? `Updated ${h} h ago` : null;
}
