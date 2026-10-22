// /mesonet/status/: progressive enhancement over the build-time table.
//
//   - sort by any column (a button in each header, aria-sort on the header)
//   - filter by name, ID or county, network and health; state in the URL
//     (HOUSE-STYLE §4), count changes announced (§5.1)
//   - Download CSV writes exactly the rows shown, in the order shown
//   - one refresh after load, and again when the tab returns after 15
//     minutes: the summary from data2, the table from the API through the
//     mesonet-compliance ruleset. A failed refresh changes nothing: the page
//     keeps its snapshot and timestamp, and shows no error.
//
// Rows are DOM-built with textContent only (HOUSE-STYLE §7). The kit
// (mco-core.js) is a classic script that has run before this module.

import { getSummary, type ComplianceSummary } from '../lib/compliance';
import { count, isoTime, stampMT } from '../lib/format';
import {
  cellText, csvRecord, getStationHealth, HEALTH_RANK, stationHref, STATUS_RANK, toCsv,
  type Health, type ReportingStatus, type StationHealthRow,
} from '../lib/station-health';

declare const MCO: any;

type SortKey = 'name' | 'network' | 'status' | 'last' | 'health' | 'missing' | 'county';
type Dir = 'asc' | 'desc';

const SORTS: Record<SortKey, { label: string; asc: string; desc: string; cmp: (a: StationHealthRow, b: StationHealthRow) => number }> = {
  name: { label: 'Station', asc: 'A to Z', desc: 'Z to A', cmp: (a, b) => a.name.localeCompare(b.name) },
  network: { label: 'Network', asc: 'A to Z', desc: 'Z to A', cmp: (a, b) => a.network.localeCompare(b.network) },
  status: { label: 'Status', asc: 'reporting first', desc: 'not reporting first', cmp: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status] },
  last: { label: 'Last report', asc: 'oldest first', desc: 'newest first', cmp: (a, b) => (a.datetime ?? -Infinity) - (b.datetime ?? -Infinity) },
  health: { label: 'Health', asc: 'operational first', desc: 'total outage first', cmp: (a, b) => HEALTH_RANK[a.health] - HEALTH_RANK[b.health] },
  missing: { label: 'Sensors not reporting', asc: 'fewest first', desc: 'most first', cmp: (a, b) => a.missing.length - b.missing.length },
  county: { label: 'County', asc: 'A to Z', desc: 'Z to A', cmp: (a, b) => a.county.localeCompare(b.county) },
};
const isSortKey = (v: unknown): v is SortKey => typeof v === 'string' && v in SORTS;

const STALE_AFTER_MS = 15 * 60 * 1000;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;

const table = $<HTMLTableElement>('st-table');
if (table) init(table);

function init(table: HTMLTableElement) {
  const tbody = $<HTMLTableSectionElement>('st-rows')!;
  const caption = $('st-caption')!;
  const countEl = $('st-count')!;
  const empty = $('st-empty')!;
  const csv = $<HTMLAnchorElement>('st-csv')!;
  const q = $<HTMLInputElement>('st-q')!;
  const netChips = [...$('st-net')!.querySelectorAll<HTMLButtonElement>('.mco-chip')];
  const healthChips = [...$('st-health')!.querySelectorAll<HTMLButtonElement>('.mco-chip')];
  const tableAsOf = $<HTMLTimeElement>('st-asof')!;

  // ── Model, read back from the build-time rows ────────────────────────────
  let entries = [...tbody.rows].map((el) => ({ row: rowFromDataset(el), el }));

  // ── State: URL > default, every value validated (HOUSE-STYLE §4) ─────────
  // A chip param is a comma list of its group's values; unknown tokens drop.
  const chipSet = (chips: HTMLButtonElement[], raw: string | null) => {
    const known = new Set(chips.map((c) => c.dataset.value!));
    return new Set<string>((MCO.splitTokens(raw) ?? []).filter((v: string) => known.has(v)));
  };
  const params = MCO.urlParams();
  const sortParam = MCO.getParamLower('sort', params);
  const state = {
    q: (params.get('q') || '').trim().slice(0, 100),
    net: chipSet(netChips, params.get('net')),
    health: chipSet(healthChips, params.get('health')),
    sort: (isSortKey(sortParam) ? sortParam : 'name') as SortKey,
    dir: (MCO.getParamLower('dir', params) === 'desc' ? 'desc' : 'asc') as Dir,
  };
  q.value = state.q;

  function writeUrl() {
    const p = MCO.urlParams();
    const set = (k: string, v: string, dflt: string) => (v && v !== dflt ? p.set(k, v) : p.delete(k));
    set('q', state.q, '');
    set('net', [...state.net].join(','), '');
    set('health', [...state.health].join(','), '');
    set('sort', state.sort, 'name');
    set('dir', state.dir, 'asc');
    MCO.replaceUrlState(p, { keepHash: true });
  }

  // ── Sort buttons in the column headers ───────────────────────────────────
  const headers = [...table.tHead!.rows[0]!.cells].filter((th) => isSortKey(th.dataset.sort));
  for (const th of headers) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'st-sort';
    const label = document.createElement('span');
    label.textContent = th.textContent!.trim();
    const icon = document.createElement('span');
    icon.className = 'st-sort-icon';
    icon.setAttribute('aria-hidden', 'true');
    btn.append(label, icon);
    th.replaceChildren(btn);
    btn.addEventListener('click', () => {
      const key = th.dataset.sort as SortKey;
      state.dir = state.sort === key && state.dir === 'asc' ? 'desc' : 'asc';
      state.sort = key;
      render();
      writeUrl();
      MCO.announce(`Sorted by ${SORTS[key].label}, ${SORTS[key][state.dir]}`);
    });
  }

  // ── Filters ──────────────────────────────────────────────────────────────
  let typing: ReturnType<typeof setTimeout> | undefined;
  q.addEventListener('input', () => {
    state.q = q.value.trim().slice(0, 100);
    render();
    clearTimeout(typing);
    typing = setTimeout(() => { writeUrl(); announceCount(); }, 400);
  });
  // Chips toggle (aria-pressed drives their look, HOUSE-STYLE §5.7). None
  // pressed in a group means that group does not filter.
  for (const [chips, key] of [[netChips, 'net'], [healthChips, 'health']] as const) {
    for (const chip of chips) {
      chip.setAttribute('aria-pressed', String(state[key].has(chip.dataset.value!)));
      chip.addEventListener('click', () => {
        const v = chip.dataset.value!;
        if (state[key].has(v)) state[key].delete(v);
        else state[key].add(v);
        chip.setAttribute('aria-pressed', String(state[key].has(v)));
        render();
        writeUrl();
        announceCount();
      });
    }
  }

  const matches = (r: StationHealthRow) => {
    if (state.net.size && !state.net.has(r.network.toLowerCase())) return false;
    if (state.health.size && !state.health.has(r.health)) return false;
    if (!state.q) return true;
    const needle = state.q.toLowerCase();
    return [r.name, r.id, r.county].some((v) => v.toLowerCase().includes(needle));
  };

  let shown: StationHealthRow[] = [];
  function render() {
    const { cmp } = SORTS[state.sort];
    const sign = state.dir === 'asc' ? 1 : -1;
    entries.sort((a, b) => sign * cmp(a.row, b.row) || a.row.name.localeCompare(b.row.name));
    tbody.append(...entries.map((e) => e.el));
    shown = [];
    for (const e of entries) {
      const on = matches(e.row);
      e.el.hidden = !on;
      if (on) shown.push(e.row);
    }
    for (const th of headers) {
      const icon = th.querySelector('.st-sort-icon')!;
      if (th.dataset.sort === state.sort) {
        th.setAttribute('aria-sort', state.dir === 'asc' ? 'ascending' : 'descending');
        icon.textContent = state.dir === 'asc' ? '▲' : '▼';
      } else {
        th.removeAttribute('aria-sort');
        icon.textContent = '';
      }
    }
    const filtered = shown.length !== entries.length;
    caption.textContent = `Montana Mesonet stations, sorted by ${SORTS[state.sort].label}, ${SORTS[state.sort][state.dir]}` +
      (filtered ? ` (${count(shown.length)} of ${count(entries.length)} shown)` : '');
    countEl.textContent = countText();
    empty.hidden = shown.length > 0;
    csv.textContent = filtered ? `Download CSV (${count(shown.length)} station${shown.length === 1 ? '' : 's'})` : 'Download CSV';
  }
  const countText = () => shown.length === entries.length
    ? `${count(entries.length)} stations`
    : `${count(shown.length)} of ${count(entries.length)} stations shown`;
  const announceCount = () => MCO.announce(countText());

  // ── CSV of the rows shown ────────────────────────────────────────────────
  csv.addEventListener('click', (ev) => {
    ev.preventDefault();
    const blob = new Blob([toCsv(shown.map(csvRecord))], { type: 'text/csv;charset=utf-8' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = csv.getAttribute('download') || 'mesonet-station-status.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 0);
  });

  // ── Refresh ──────────────────────────────────────────────────────────────
  const timeOf = (el: HTMLTimeElement | null) => (el ? Date.parse(el.dateTime) || 0 : 0);
  let inflight = false;

  async function refresh() {
    if (inflight) return;
    inflight = true;
    const [sum, rows] = await Promise.allSettled([getSummary(), getStationHealth()]);
    inflight = false;
    let newest = 0;
    if (sum.status === 'fulfilled' && sum.value.generated_at > timeOf(document.querySelector('[data-sum="asof"]'))) {
      applySummary(sum.value);
      newest = sum.value.generated_at;
    }
    if (rows.status === 'fulfilled' && rows.value.fetchedAt > timeOf(tableAsOf)) {
      const focusedId = (document.activeElement?.closest('tr') as HTMLTableRowElement | null)?.dataset.id;
      entries = rows.value.rows.map((row) => ({ row, el: rowElement(row) }));
      tbody.replaceChildren(...entries.map((e) => e.el));
      setTime(tableAsOf, rows.value.fetchedAt);
      render();
      if (focusedId) tbody.querySelector<HTMLAnchorElement>(`tr[data-id="${CSS.escape(focusedId)}"] a`)?.focus();
      newest = Math.max(newest, rows.value.fetchedAt);
    }
    if (newest) MCO.announce(`Station figures updated, as of ${stampMT(newest)}`);
    for (const r of [sum, rows]) if (r.status === 'rejected') console.info('status: refresh skipped;', r.reason);
  }

  // ── Go ───────────────────────────────────────────────────────────────────
  $('st-controls')!.hidden = false;
  render();

  const later = (fn: () => void) =>
    'requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 1000);
  const start = () => later(() => void refresh());
  if (document.readyState === 'complete') start();
  else addEventListener('load', start, { once: true });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - timeOf(tableAsOf) > STALE_AFTER_MS) void refresh();
  });
}

function rowFromDataset(el: HTMLTableRowElement): StationHealthRow {
  const d = el.dataset;
  let missing: string[] = [];
  try { missing = JSON.parse(d.missing || '[]'); } catch { /* keep [] */ }
  return {
    id: d.id ?? '',
    name: d.name ?? '',
    network: d.network ?? '',
    county: d.county ?? '',
    status: d.status as ReportingStatus,
    datetime: d.ts ? Number(d.ts) : null,
    health: d.health as Health,
    missing,
  };
}

// The same markup as the build-time rows in src/pages/mesonet/status/index.astro.
function rowElement(r: StationHealthRow): HTMLTableRowElement {
  const t = cellText(r);
  const tr = document.createElement('tr');
  Object.assign(tr.dataset, {
    id: r.id, name: r.name, network: r.network, county: r.county,
    status: r.status, ts: r.datetime == null ? '' : String(r.datetime),
    health: r.health, missing: JSON.stringify(r.missing),
  });
  const th = document.createElement('th');
  th.scope = 'row';
  const a = document.createElement('a');
  a.href = stationHref(r.id);
  a.textContent = r.name;
  const id = document.createElement('span');
  id.className = 'st-id';
  id.textContent = r.id;
  th.append(a, ' ', id);
  const td = (text: string, className?: string) => {
    const c = document.createElement('td');
    if (className) c.className = className;
    c.textContent = text;
    return c;
  };
  const when = document.createElement('td');
  if (r.datetime == null) when.textContent = t.lastReport;
  else {
    const time = document.createElement('time');
    setTime(time, r.datetime);
    when.append(time);
  }
  tr.append(th, td(t.network), td(t.status), when, td(t.health, 'st-health'), td(t.missing, 'st-missing'), td(t.county));
  return tr;
}

function setTime(el: HTMLTimeElement, ms: number) {
  el.dateTime = isoTime(ms);
  el.textContent = stampMT(ms);
}

function applySummary(s: ComplianceSummary) {
  const hours = s.reporting.threshold_minutes / 60;
  const values: Record<string, string> = {
    total: count(s.stations.total),
    window: Number.isInteger(hours) ? `${hours} hour${hours === 1 ? '' : 's'}` : `${s.reporting.threshold_minutes} minutes`,
    reporting: count(s.reporting.reporting),
    'reporting-pct': `${s.reporting.pct}%`,
    operational: count(s.health.operational),
    'operational-pct': `${s.health.pct.operational}%`,
    partial: count(s.health.partial),
    'partial-pct': `${s.health.pct.partial}%`,
    outage: count(s.health.outage),
    'outage-pct': `${s.health.pct.outage}%`,
    ruleset: s.ruleset_version,
  };
  for (const el of document.querySelectorAll<HTMLElement>('[data-sum]')) {
    const key = el.dataset.sum!;
    if (key === 'asof') setTime(el as HTMLTimeElement, s.generated_at);
    else if (key in values) el.textContent = values[key]!;
  }
}
