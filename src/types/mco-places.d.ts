// Types for the parts of the kit's place search this site calls:
// MCO.places (places/mco-places.js, mco-web-style 0.16.x) and the search box
// it rides on (MCO.initSearchBox, core). Hand-written from the modules'
// source comments, after the dashboard's web/src/types/mco-places.d.ts. The
// kit ships no types: when the pin moves, re-read the modules.

/** One row of the kit's search: a station, or a place (`place:` id prefix). */
export interface SearchItem {
  id: string;
  label: string;
  /** Heading for the no-query list (the network). */
  group?: string;
  /** Extra strings matched like the id. */
  keywords?: string[];
  /** Text beside the label (default: the id). */
  meta?: string;
  section?: string;
  queryOnly?: boolean;
}

export type PlaceKind = 'county' | 'reservation' | 'tribe' | 'city' | 'town' | 'community' | 'zip';

export interface Place {
  /** "c30031", "r1110", "p3008950", "z59715", "tlittleshell". */
  id: string;
  kind: PlaceKind;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
  /** A tribe with no Census reservation: the town it lists stations near. */
  at?: string;
}

/** A station in a place's or Near me's list, closest first. */
export interface NearStation {
  station: string;
  name: string;
  sub_network: string;
  km: number;
  miles: number;
}

export interface PlaceStations {
  /** "Gallatin County", "Near Bozeman", "Near 59715", "Near me". */
  title: string;
  /** The stations inside the area (a county or reservation); else the nearest. */
  inside: boolean;
  rows: NearStation[];
}

/** The /stations/ fields the module reads. */
export interface PlaceStationRow {
  station: string;
  name: string;
  sub_network: string;
  latitude: number;
  longitude: number;
  county?: string | null;
}

export type LocateReason = 'unsupported' | 'denied' | 'unavailable' | 'timeout';

export interface PlaceSearchOptions {
  input: HTMLInputElement;
  listbox: HTMLElement;
  /** The app's own items (stations); those without a section go in "Stations". */
  items: () => SearchItem[];
  /** Rows for distances and county / boundary membership. */
  stations: () => readonly PlaceStationRow[];
  /** A station was picked. */
  onSelect?: (id: string) => void;
  /** A place was picked: `result` null while a reservation's boundary loads. */
  onPlace?: (place: Place, result: PlaceStations | null) => void;
  onError?: (err: Error) => void;
  /** The current item, marked ✓. */
  value?: () => string | null;
  /** Names the listbox. */
  label?: string;
  limit?: number;
}

export interface PlaceSearch {
  open(): void;
  close(): void;
  refresh(): void;
  destroy(): void;
  places(): Place[] | null;
  pick(placeId: string): Promise<PlaceStations | null>;
  /** Drop a reservation pick still waiting on its boundary. */
  cancel(): void;
}

export interface McoPlaces {
  /** "County", "Reservation", "ZIP code", … by kind. */
  KINDS: Readonly<Record<PlaceKind, string>>;
  /** "0.4 mi" under 10 miles, else "23 mi". */
  formatMiles(mi: number): string;
  canLocate(): boolean;
  /** Rejects an Error with `reason` (LocateReason). Call only on a button press. */
  nearMe(stations: readonly PlaceStationRow[], opts?: { n?: number }): Promise<PlaceStations & { point: { lat: number; lon: number } }>;
  /** "5 stations near Bozeman"; with no place, "5 stations near you". */
  announcement(place: Place | null, result: PlaceStations): string;
  initPlaceSearch(opts: PlaceSearchOptions): PlaceSearch;
}
