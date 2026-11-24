// The office's public tools. External hosts, so plain URLs (paths.ts is for
// this site's own routes). The Mesonet tools hang off one origin, as in
// every other app (HOUSE-STYLE §4); at the gateway cutover change it here.
// mesonet2 serves the current dashboard at /dash/ and keeps ?s= (checked
// 24 Nov 2026; on mesonet.climate.umt.edu /dash/ is still the legacy app).
//
// Descriptions are checked against each tool's own code and copy:
//   Explorer     mesonet-explorer/app.js REGISTRY, modes latest/hourly/daily
//   Photos       mesonet-photo-explorer/docs/app.js, public N/S/E/W views
//   Dashboard    mesonet-dashboard/web (NWS forecast, gridMET normals)
//   Status       mesonet-status/app.js, last report + silent sensors
//   Maintenance  mesonet-maintenance (Last visit column)
//   HydroMet     mesonet-hydromet-build, build stages by grid cell
//   Snowpack     mco-snowpack-explorer/index.html about panel
//   D³           mco-drought-dashboard/docs/index.html (BETA pill, indices)

export const MESONET_ORIGIN = 'https://mesonet2.climate.umt.edu';

export const DASHBOARD = `${MESONET_ORIGIN}/dash/`;
// Opens one station's photos with ?station=<id> (docs/app.js deep link).
export const PHOTO_EXPLORER = `${MESONET_ORIGIN}/photos/`;

export const TOOLS = [
  {
    name: 'Mesonet Explorer',
    href: `${MESONET_ORIGIN}/explorer/`,
    description: 'Every station on one map. Pick a variable, from air temperature to soil moisture, and see the latest reading or the hourly and daily values for any date.',
  },
  {
    name: 'Photo Explorer',
    href: PHOTO_EXPLORER,
    description: 'The station cameras on one map. Step back through the days and turn each camera north, south, east or west.',
  },
  {
    name: 'Station Dashboard',
    href: DASHBOARD,
    description: 'Everything about one station, with its recent readings set against the normal for the date and the National Weather Service forecast for that spot.',
  },
  {
    name: 'Station Status',
    href: `${MESONET_ORIGIN}/status/`,
    description: 'Which stations have reported in the last two hours, and at each one, any sensor that has gone quiet.',
  },
  {
    name: 'Station Maintenance',
    href: `${MESONET_ORIGIN}/maintenance/`,
    description: 'When our field crew last visited each station.',
  },
  {
    name: 'HydroMet Build Status',
    href: `${MESONET_ORIGIN}/build/`,
    description: 'Where the HydroMet network is still being built in the Upper Missouri River Basin, cell by cell. Cell assignments can still change.',
  },
  {
    name: 'Snowpack Explorer',
    href: 'https://snow.climate.umt.edu/',
    description: 'Today’s snowpack against the same date in every winter since 2003, for the lower 48 states.',
  },
  {
    name: 'D³ Drought Data Dashboard',
    href: 'https://d3drought.org/',
    description: 'Daily drought indices for the lower 48 states, by grid cell or by watershed.',
    status: 'beta',
  },
] as const satisfies readonly { name: string; href: string; description: string; status?: string }[];

type ToolName = (typeof TOOLS)[number]['name'];

/** One entry of TOOLS by name; a typo fails the build. */
export function tool(name: ToolName) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`tools: no tool named ${name}`);
  return t;
}

/** TOOLS entries by name, in the order given. */
export const tools = (...names: ToolName[]) => names.map(tool);
