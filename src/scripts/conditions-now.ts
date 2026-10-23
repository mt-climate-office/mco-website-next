// Homepage conditions card: the kit's place search over the Mesonet
// stations, filling ConditionsNow.astro from /latest/.
//
//   - One field, MCO.places.initPlaceSearch (kit 0.16 and later): stations first,
//     places (county, reservation, tribe, town, ZIP code) under them while
//     typing. The kit owns the combobox, its keys (Esc closes and restores,
//     then clears), the gazetteer and the result-count announcements.
//   - A picked station fills the card. A picked place or Near me fills it
//     with the nearest station (the kit's stationsFor / nearMe, first row)
//     and lists the others with their distances (HOUSE-STYLE §4: a place
//     answers with stations); pressing one moves the card to it.
//   - Near me asks for a position only on a press. A refusal or failure is
//     said in words beside the button, with the way forward.
//   - Under the temperature, the kit's conditions line (MCO.summary, kit
//     0.17.x): "Partly cloudy tonight, calm, no precipitation in 3 days."
//     It reuses the /latest/ row the card already has and adds the hourly
//     rows, /derived/ppt/ (HydroMet only) and the NWS forecast; any part
//     that fails is left out, and with nothing known the line is hidden.
//   - The card is announced once per fill (MCO.announce), with the line in
//     it when it arrives within SUMMARY_WAIT_MS; a later line is shown, not
//     announced. Focus stays where the visitor was: the field, or the
//     station button they pressed.
//   - URL state (HOUSE-STYLE §4): ?s=<id> is written on a pick, merged with
//     the page's other params, and read once at boot, validated against the
//     catalog; then mco-website-conditions in localStorage; else the empty
//     card. A boot restore is not announced and does not write the URL.
//
// Station rows come from /stations/ on first use (the field's focus, Near me,
// or a restore), not the page: the homepage HTML stays small. Any failure
// leaves the card as it was, with a message; never a made-up figure.

import { getLatest, getStations, type Station } from '../lib/mesonet';
import { toConditions, updatedAgo } from '../lib/conditions';
import { formatReading, isoTime, stampMT } from '../lib/format';
import type { StationConditions } from '../components/data/types';
import type { McoPlaces, NearStation, Place, PlaceSearch, PlaceStations } from '../types/mco-places';
import type { McoSummary } from '../types/mco-summary';

declare const MCO: any;

const STORAGE_KEY = 'mco-website-conditions';
const PARAM = 's';
/** Stations listed under a place or Near me, the picked one included. */
const LIST_MAX = 5;
const TICK_MS = 60_000;
/** How long the announcement waits for the conditions line. */
const SUMMARY_WAIT_MS = 4_000;
const ID_RE = /^[a-z0-9_]{1,32}$/;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

const card = $('cond');
const input = $<HTMLInputElement>('cond-q');
const listbox = $('cond-list');
const places: McoPlaces | undefined = typeof MCO !== 'undefined' ? MCO.places : undefined;
const summaries: McoSummary | undefined = typeof MCO !== 'undefined' ? MCO.summary : undefined;

if (card && input && listbox && places) init(card, input, listbox, places);
else $('cond-search')?.setAttribute('hidden', ''); // No kit place search: no dead field.

/** Where the card's station was found from: a place, or the visitor's position. */
interface From { place: Place | null; result: PlaceStations }

function init(card: HTMLElement, input: HTMLInputElement, listbox: HTMLElement, P: McoPlaces) {
  const el = {
    near: $<HTMLButtonElement>('cond-near')!,
    msg: $('cond-msg')!,
    empty: $('cond-empty')!,
    result: $('cond-result')!,
    station: $('cond-station')!,
    from: $('cond-from')!,
    label: $('cond-headline-label')!,
    summary: $('cond-summary')!,
    value: $('cond-headline-value')!,
    readings: $('cond-readings')!,
    stamp: $('cond-stamp')!,
    page: $<HTMLAnchorElement>('cond-page')!,
    dash: $<HTMLAnchorElement>('cond-dash')!,
    nearList: $('cond-near-list')!,
    nearTitle: $('cond-near-title')!,
    nearRows: $('cond-near-rows')!,
  };
  const stationHref = (id: string) => card.dataset.stationBase!.replace('__ID__', encodeURIComponent(id));
  const dashHref = (id: string) => `${card.dataset.dashboard}?s=${encodeURIComponent(id)}`;

  // ── The catalog ─────────────────────────────────────────────────────────
  let catalog: Station[] = [];
  const byId = new Map<string, Station>();
  let catalogP: Promise<Station[]> | null = null;
  const loadCatalog = (): Promise<Station[]> => (catalogP ??= getStations().then((rows) => {
    catalog = rows.filter((s) => Number.isFinite(s.latitude) && Number.isFinite(s.longitude))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    catalog.forEach((s) => byId.set(s.station, s));
    search.refresh();
    return catalog;
  }, (err) => { catalogP = null; throw err; }));

  // ── State ───────────────────────────────────────────────────────────────
  let current: string | null = null;
  let from: From | null = null;
  let shown: StationConditions | null = null;
  let seq = 0;
  let locating = 0;

  const say = (text: string, assertive = false) => MCO.announce(text, assertive ? { politeness: 'assertive' } : undefined);
  const message = (text: string | null) => {
    el.msg.textContent = text ?? '';
    el.msg.hidden = !text;
  };

  // ── The search ──────────────────────────────────────────────────────────
  const search: PlaceSearch = P.initPlaceSearch({
    input,
    listbox,
    label: 'Stations and places',
    items: () => catalog.map((s) => ({ id: s.station, label: s.name, meta: s.sub_network, keywords: [s.county] })),
    stations: () => catalog,
    value: () => current,
    onSelect: (id) => { message(null); void show(id, null, { announce: true, write: true }); },
    onPlace: (place, result) => {
      message(null);
      if (!result) { message(`Finding stations on the ${place.name}.`); return; }
      if (!result.rows.length) { message(`No stations found near ${place.name}.`); return; }
      void show(result.rows[0].station, { place, result }, { announce: true, write: true });
    },
  });
  // The field's first focus loads the stations (the kit loads the places).
  const want = () => { loadCatalog().catch(() => message('The station list could not be loaded. Try again in a minute.')); };
  input.addEventListener('focus', want);
  input.addEventListener('input', want);

  // ── Near me ─────────────────────────────────────────────────────────────
  if (!P.canLocate()) el.near.hidden = true;
  el.near.addEventListener('click', async () => {
    search.cancel();
    search.close();
    message('Finding your location.');
    const mine = ++locating;
    try {
      const stations = await loadCatalog();
      const r = await P.nearMe(stations, { n: LIST_MAX });
      if (mine !== locating) return;
      message(null);
      if (!r.rows.length) { message('No stations found near you.'); return; }
      await show(r.rows[0].station, { place: null, result: r }, { announce: true, write: true });
    } catch (err) {
      if (mine !== locating) return;
      const reason = (err as { reason?: string }).reason;
      const text = reason === 'denied'
        ? 'Location is turned off for this site. Search by town or ZIP code instead.'
        : reason === 'unsupported'
          ? 'This browser cannot share a location. Search by town or ZIP code instead.'
          : reason
            ? 'Your location could not be found. Search by town or ZIP code instead.'
            : 'The station list could not be loaded. Try again in a minute.';
      message(text);
      say(text);
    }
  });

  // ── The card ────────────────────────────────────────────────────────────

  /** "4.2 mi from Bozeman", "12 mi from the center of Gallatin County", "3.1 mi from you". */
  function distanceLine(row: NearStation, f: From): string {
    const mi = P.formatMiles(row.miles);
    const p = f.place;
    if (!p) return `${mi} from you`;
    if (p.at) return `${mi} from ${p.at}`;
    if (p.kind === 'zip') return `${mi} from the center of ZIP code ${p.name}`;
    if (p.kind === 'county' || p.kind === 'reservation') return `${mi} from the center of ${p.kind === 'reservation' ? 'the ' : ''}${p.name}`;
    return `${mi} from ${p.name}`;
  }

  function nearListTitle(f: From): string {
    const p = f.place;
    if (!p) return 'Stations near you';
    if (f.result.inside) return p.kind === 'reservation' ? `Stations on the ${p.name}` : `Stations in ${p.name}`;
    return `Stations near ${p.at ?? (p.kind === 'zip' ? `ZIP code ${p.name}` : p.name)}`;
  }

  function renderNearList() {
    const rows = from?.result.rows.slice(0, LIST_MAX) ?? [];
    el.nearList.hidden = rows.length < 2;
    if (rows.length < 2) { el.nearRows.textContent = ''; return; }
    el.nearTitle.textContent = nearListTitle(from!);
    // Rebuild only when the list changes, so a pressed button keeps focus.
    const key = rows.map((r) => r.station).join(',');
    if (el.nearRows.dataset.key !== key) {
      el.nearRows.dataset.key = key;
      el.nearRows.textContent = '';
      for (const r of rows) {
        const li = document.createElement('li');
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nav-btn';
        b.dataset.id = r.station;
        const name = document.createElement('span');
        name.textContent = r.name;
        const dist = document.createElement('span');
        dist.className = 'cond-dist';
        dist.textContent = P.formatMiles(r.miles);
        // Read as "Bozeman Airport, 4.2 mi", like the kit's search rows.
        const sep = document.createElement('span');
        sep.className = 'sr-only';
        sep.textContent = ', ';
        b.append(name, sep, dist);
        li.append(b);
        el.nearRows.append(li);
      }
    }
    for (const b of el.nearRows.querySelectorAll<HTMLButtonElement>('button')) {
      b.setAttribute('aria-pressed', String(b.dataset.id === current));
    }
  }
  el.nearRows.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-id]');
    if (b && b.dataset.id !== current) void show(b.dataset.id!, from, { announce: true, write: true });
  });

  function stampText(c: StationConditions): [string, string] {
    const ago = updatedAgo(c.observedAt) ?? `Updated ${stampMT(c.observedAt)}`;
    return [ago, c.provisional ? ' · Provisional' : ''];
  }
  function renderStamp() {
    if (!shown) return;
    const [ago, prov] = stampText(shown);
    const t = document.createElement('time');
    t.dateTime = isoTime(shown.observedAt);
    t.textContent = ago;
    el.stamp.replaceChildren(t, prov);
  }

  /** The card for `st`, before its readings arrive: name, distance, links. */
  function renderPending(st: Station) {
    el.empty.hidden = true;
    el.result.hidden = false;
    el.station.textContent = st.name;
    const row = from?.result.rows.find((r) => r.station === st.station);
    el.from.textContent = row && from ? distanceLine(row, from) : '';
    el.from.hidden = !el.from.textContent;
    el.label.textContent = 'Air temperature';
    el.value.textContent = '';
    el.readings.replaceChildren();
    // Held open (two empty lines) while the line is on its way.
    el.summary.textContent = '';
    el.summary.hidden = !summaries;
    el.stamp.textContent = 'Loading the latest readings.';
    el.page.href = stationHref(st.station);
    el.dash.href = dashHref(st.station);
    for (const n of card.querySelectorAll('.cond-link-name')) n.textContent = st.name;
    el.result.setAttribute('aria-busy', 'true');
    renderNearList();
  }

  function renderConditions(c: StationConditions) {
    el.label.textContent = c.headline.label;
    el.value.textContent = formatReading(c.headline.value, c.headline.unit, c.headline.digits);
    el.readings.replaceChildren(...c.readings.map((r) => {
      const div = document.createElement('div');
      const dt = document.createElement('dt');
      dt.textContent = r.label;
      const dd = document.createElement('dd');
      dd.textContent = formatReading(r.value, r.unit, r.digits);
      div.append(dt, dd);
      return div;
    }));
    shown = c;
    renderStamp();
    el.result.removeAttribute('aria-busy');
  }

  /** The conditions line ('' hides it). */
  function renderSummary(text: string) {
    el.summary.textContent = text;
    el.summary.hidden = !text;
  }

  /** The kit's conditions line for `st`, from the /latest/ row the card has; '' when nothing is known. */
  function summaryFor(st: Station, row: Record<string, unknown>): Promise<string> {
    if (!summaries) return Promise.resolve('');
    return summaries.forStation({
      station: st.station, lat: st.latitude, lon: st.longitude,
      derivedPpt: st.sub_network === 'HydroMet', latest: row, units: 'us',
    }).then((r) => r.text, () => '');
  }

  /** One sentence for the screen reader: the station, where, the headline, the line, the time. */
  function sentence(c: StationConditions, line: string | null): string {
    const where = el.from.textContent ? `, ${el.from.textContent}` : '';
    const temp = c.headline.value == null ? 'No air temperature in the latest report'
      : `${c.headline.label} ${formatReading(c.headline.value, c.headline.unit, c.headline.digits)}`;
    const [ago, prov] = stampText(c);
    return `${c.station.name}${where}. ${temp}. ${line ? `${line} ` : ''}${ago}${prov ? ', provisional' : ''}.`;
  }

  function writeState(id: string) {
    const p = MCO.urlParams();
    p.set(PARAM, id);
    MCO.replaceUrlState(p, { keepHash: true });
    MCO.lsSet(STORAGE_KEY, id);
  }

  async function show(id: string, f: From | null, { announce, write }: { announce: boolean; write: boolean }) {
    const mine = ++seq;
    let st = byId.get(id);
    if (!st) {
      try { await loadCatalog(); } catch { /* handled below */ }
      if (mine !== seq) return;
      st = byId.get(id);
      if (!st) {
        if (announce) message('The station list could not be loaded. Try again in a minute.');
        return;
      }
    }
    current = id;
    from = f && f.result.rows.some((r) => r.station === id) ? f : null;
    shown = null;
    renderPending(st);
    if (write) writeState(id);
    try {
      const rows = await getLatest({ stations: [id], units: 'us' });
      if (mine !== seq) return;
      const row = rows.find((r) => r.station === id);
      if (!row) throw new Error('no row');
      const c = toConditions(row, { id, name: st.name });
      renderConditions(c);
      const line = summaryFor(st, row as Record<string, unknown>);
      void line.then((text) => { if (mine === seq) renderSummary(text); });
      if (announce) {
        const early = await Promise.race([line, new Promise<null>((r) => setTimeout(() => r(null), SUMMARY_WAIT_MS))]);
        if (mine !== seq) return;
        say(sentence(c, early));
      }
    } catch {
      if (mine !== seq) return;
      el.result.removeAttribute('aria-busy');
      renderSummary('');
      el.stamp.textContent = 'The latest readings could not be loaded. They are on the Station Dashboard.';
      if (announce) say(`The latest readings for ${st.name} could not be loaded.`, true);
    }
  }

  // Keep "Updated N min ago" true while the page is open.
  setInterval(() => { if (document.visibilityState === 'visible') renderStamp(); }, TICK_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') renderStamp(); });

  // ── Boot: URL, then storage, else the empty card ────────────────────────
  const valid = (v: unknown): v is string => typeof v === 'string' && ID_RE.test(v);
  const fromUrl = (MCO.urlParams().get(PARAM) || '').trim().toLowerCase();
  const fromStore = MCO.lsGet(STORAGE_KEY);
  const boot = valid(fromUrl) ? fromUrl : valid(fromStore) ? fromStore : null;
  if (boot) void show(boot, null, { announce: false, write: false });
}
