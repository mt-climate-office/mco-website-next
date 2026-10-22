import type { APIRoute } from 'astro';
import { csvRecord, loadStationHealth, toCsv } from '../../../lib/station-health';

// The station table as CSV, from the same build-time snapshot as the page
// (one fetch per build). The page's Download CSV link points here, so the
// export works without JavaScript; with it, the page writes the rows shown
// instead.
export const GET: APIRoute = async () => {
  const { rows } = await loadStationHealth();
  return new Response(toCsv(rows.map(csvRecord)), {
    headers: { 'Content-Type': 'text/csv; charset=utf-8' },
  });
};
