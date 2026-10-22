// The office's public tools. External hosts, so plain URLs (paths.ts is for
// this site's own routes). Dashboard links use the on-prem host until the
// gateway cutover: mesonet2 drops ?s= (phase-0-report §3.3).
//
// Descriptions are checked against each tool's own code and copy:
//   Explorer     mesonet-explorer/app.js REGISTRY, modes latest/hourly/daily
//   Photos       mesonet-photo-explorer/docs/app.js, public N/S/E/W views
//   Dashboard    mesonet-dashboard/web (NWS forecast, gridMET normals)
//   Status       mesonet-status/app.js, last report + silent sensors
//   Maintenance  mesonet-maintenance (Last visit column)
//   UMRB         mesonet-umrb-build, build stages by grid cell
//   Snowpack     mco-snowpack-explorer/index.html about panel
//   D³           mco-drought-dashboard/docs/index.html (BETA pill, indices)

export const DASHBOARD = 'https://mesonet.climate.umt.edu/dash/next/';

export const TOOLS = [
  {
    name: 'Mesonet Explorer',
    href: 'https://mesonet.climate.umt.edu/explorer/',
    description: 'Every station on one map, with latest, hourly and daily values for each variable.',
  },
  {
    name: 'Photo Explorer',
    href: 'https://mesonet.climate.umt.edu/photos/',
    description: 'Station camera photos on one map, by date, time and direction.',
  },
  {
    name: 'Station Dashboard',
    href: DASHBOARD,
    description: 'One station in detail, with the National Weather Service forecast for that spot.',
  },
  {
    name: 'Station Status',
    href: 'https://mesonet.climate.umt.edu/status/',
    description: 'When each station last reported, and which sensors are not reporting.',
  },
  {
    name: 'Station Maintenance',
    href: 'https://mesonet.climate.umt.edu/maintenance/',
    description: 'When each station was last visited.',
  },
  {
    name: 'UMRB Build Status',
    href: 'https://mesonet.climate.umt.edu/umrb/',
    description: 'Station build-out in the Upper Missouri River Basin, cell by cell. Cell assignments are provisional.',
  },
  {
    name: 'Snowpack Explorer',
    href: 'https://snow.climate.umt.edu/',
    description: 'Snow water equivalent percentiles for the contiguous US, from NOAA SNODAS.',
  },
  {
    name: 'D³ Drought Data Dashboard',
    href: 'https://d3drought.org/',
    description: 'Drought indices for the contiguous US, by grid cell or watershed.',
    status: 'beta',
  },
] as const satisfies readonly { name: string; href: string; description: string; status?: string }[];
