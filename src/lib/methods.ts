// The Mesonet method pages, migrated from the Jekyll site at their old paths
// (redirects.json keeps each one, status 200). The Station Dashboard's Ag
// tools link /mesonet/ag_tools/<slug>/ for their methods
// (mesonet-dashboard/web/src/core/ag/view/learnMore.ts), so the slugs are
// fixed. Descriptions say what each page defines; no figures that change.
import { url } from './paths';

export interface MethodPage {
  name: string;
  href: string;
  description: string;
}

/** The six agricultural method pages, in the old overview's order. */
export const AG_METHODS: readonly MethodPage[] = [
  {
    name: 'Reference evapotranspiration',
    href: url('mesonet/ag_tools/eto/'),
    description: 'The FAO Penman-Monteith equation for water lost from a reference grass surface.',
  },
  {
    name: 'Feels-like temperature',
    href: url('mesonet/ag_tools/feels_like/'),
    description: 'Wind chill below 50 °F, heat index above 80 °F, air temperature in between.',
  },
  {
    name: 'Crop growing degree days',
    href: url('mesonet/ag_tools/gdds/'),
    description: 'Temperature thresholds and growth stages for barley, canola, corn, hemp, sugarbeet, sunflower and wheat.',
  },
  {
    name: 'Soil profile plots',
    href: url('mesonet/ag_tools/soil_profile/'),
    description: 'Soil moisture, temperature, conductivity and water potential by depth through time.',
  },
  {
    name: 'Livestock risk index',
    href: url('mesonet/ag_tools/risk/'),
    description: 'The Comprehensive Climate Index of Mader et al. (2010) and its stress levels.',
  },
  {
    name: 'Soil water potential',
    href: url('mesonet/ag_tools/swp/'),
    description: 'Water potential from measured soil moisture, through lab-fitted Fredlund-Xing curves.',
  },
];

/** The method pages the Mesonet hub lists. */
export const MESONET_METHODS: readonly MethodPage[] = [
  {
    name: 'Variables measured',
    href: url('mesonet/variables/'),
    description: 'Every element the stations report, with its units and how often it is read.',
  },
  {
    name: 'Quality control',
    href: url('mesonet/qaqc/'),
    description: 'The range, step, persistence and shared-sensor tests, and their thresholds.',
  },
  {
    name: 'Agricultural tools',
    href: url('mesonet/ag_tools/'),
    description: 'How the Station Dashboard computes evapotranspiration, growing degree days, livestock risk and soil water potential.',
  },
  {
    name: 'OGC API for GIS',
    href: url('mesonet/wfs/'),
    description: 'Stream the latest observations into QGIS, ArcGIS, Python or R.',
  },
];
