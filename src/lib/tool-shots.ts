// Screenshots of the office's tools, for the hubs and the homepage.
//
// Four tools publish a social image that their own nightly job redraws from
// the live app (the preview workflows in mesonet-photo-explorer,
// mesonet-status and mesonet-umrb-build, and the dashboard's og-card.png).
// The build fetches each of those, so the nightly rebuild shows that day's
// map. Station Maintenance has one too and is left out on purpose: its
// legend prints the visited and overdue counts, and no compliance figure is
// published on this site (DECISIONS D4, D10). The Explorer, Snowpack and D³
// publish only
// the kit's generic card, so theirs are captured by hand
// (scripts/capture-tools.mjs) and committed.
//
// Every image is also committed under src/assets/tools/, and a failed or
// odd fetch falls back to it with a warning: an old screenshot is better
// than a failed deploy. The images are served from this site
// (src/pages/images/tools/[file].ts), resized to WebP, so the 2–4 MB PNGs
// never reach a visitor and the CSP needs no new host.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

export const SHOT_WIDTHS = [800, 1600] as const;
export type ShotWidth = (typeof SHOT_WIDTHS)[number];

export interface ToolShot {
  /** File stem, under src/assets/tools/ and /images/tools/. */
  key: string;
  /** The tool's nightly social image, or null for a committed capture. */
  live: string | null;
  /** What the screenshot shows. No counts: the image changes nightly. */
  alt: string;
}

export const TOOL_SHOTS = {
  'd3-drought': {
    key: 'd3-drought',
    live: null,
    alt: 'The D³ Drought Data Dashboard: a map of the contiguous United States coloured by the 30-day Standardized Precipitation Index, wet areas in blue and dry areas in orange and red, with the layer and timescale controls down the left.',
  },
  snowpack: {
    key: 'snowpack',
    live: null,
    alt: 'The Snowpack Explorer zoomed to Montana: snow water equivalent percentiles on a 1 km grid, the mountains coloured from drought reds to wet blues, with the legend of percentile classes at the left.',
  },
  explorer: {
    key: 'explorer',
    live: null,
    alt: 'The Mesonet Explorer: a map of Montana with every station marked and labelled with its latest air temperature, and the network, time and variable controls in a sidebar.',
  },
  photos: {
    key: 'photos',
    live: 'https://mesonet2.climate.umt.edu/photos/preview.png',
    alt: 'The Photo Explorer: the latest west-facing photo from each station camera, tiled across a map of Montana near its station, mostly open prairie under a wide sky.',
  },
  dashboard: {
    key: 'dashboard',
    live: 'https://mesonet2.climate.umt.edu/dash/og-card.png',
    alt: 'The Station Dashboard’s start page: a search box for a station, town, county or ZIP code above a map of Montana with HydroMet and AgriMet stations marked.',
  },
  status: {
    key: 'status',
    live: 'https://mesonet2.climate.umt.edu/status/assets/og-card.png',
    alt: 'Station Status: a map of Montana with each station marked by whether it has reported in the last two hours, and the reporting-status legend at the lower left.',
  },
  build: {
    key: 'build',
    live: 'https://mesonet2.climate.umt.edu/build/assets/og-card.png',
    alt: 'HydroMet Build Status: eastern and central Montana divided into grid cells, each coloured by whether its station is operational, due to be installed in 2027 or still available, with a dot at every station.',
  },
} as const satisfies Record<string, ToolShot>;

export type ShotKey = keyof typeof TOOL_SHOTS;

// From the project root: the build bundles this module elsewhere, so
// import.meta.url does not point into src/.
const fallback = (key: string) => resolve('src/assets/tools', `${key}.webp`);

// A real screenshot is an image of some size; anything else (an HTML error
// page, an empty body) is not one.
const MIN_BYTES = 20_000;

async function fetchLive(url: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      const type = res.headers.get('content-type') || '';
      const body = Buffer.from(await res.arrayBuffer());
      if (res.ok && type.startsWith('image/') && body.length >= MIN_BYTES) return body;
      console.warn(`tool-shots: ${url} gave ${res.status} ${type} ${body.length} B`);
    } catch (e) {
      console.warn(`tool-shots: ${url} failed (${(e as Error).message})`);
    }
  }
  return null;
}

const sources = new Map<string, Promise<Buffer>>();

/** The screenshot's source bytes: today's live image, else the committed one. */
function source(key: ShotKey): Promise<Buffer> {
  let p = sources.get(key);
  if (!p) {
    const shot: ToolShot = TOOL_SHOTS[key];
    p = (async () => {
      const live = shot.live ? await fetchLive(shot.live) : null;
      if (shot.live && !live) console.warn(`tool-shots: ${key} uses the committed copy`);
      return live ?? readFile(fallback(key));
    })();
    sources.set(key, p);
  }
  return p;
}

const renders = new Map<string, Promise<{ data: Buffer; width: number; height: number }>>();

/** The screenshot as WebP at `width` (never enlarged). */
export function render(key: ShotKey, width: ShotWidth) {
  const id = `${key}-${width}`;
  let p = renders.get(id);
  if (!p) {
    p = source(key).then(async (buf) => {
      const { data, info } = await sharp(buf)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    });
    renders.set(id, p);
  }
  return p;
}
