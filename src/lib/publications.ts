// Publications listed on /research/ until the publications portal (rebuild
// plan §4.7) replaces this file with a collection built from the DOIs.
//
// Sources:
//   entries and authors  mco-website/_data/publications.yml (the nine entries
//                        the current /research/ page lists), markup stripped
//   title, venue, year   Crossref /works/{doi}, read 22 Oct 2026, so titles
//                        and journal names match the published record
// Newest first.

export interface Publication {
  title: string;
  authors: string;
  venue: string;
  year: number;
  doi: string;
}

export const PUBLICATIONS: readonly Publication[] = [
  {
    title: 'Drought assessment has been outpaced by climate change: empirical arguments for a paradigm shift',
    authors: 'Zachary Hoylman, R. Kyle Bocinsky, Kelsey Jencso',
    venue: 'Nature Communications',
    year: 2022,
    doi: '10.1038/s41467-022-30316-5',
  },
  {
    title: 'DroughtCast: A Machine Learning Forecast of the United States Drought Monitor',
    authors: 'Colin Brust, John S. Kimball, Marco P. Maneta, Kelsey Jencso, Rolf H. Reichle',
    venue: 'Frontiers in Big Data',
    year: 2021,
    doi: '10.3389/fdata.2021.773478',
  },
  {
    title: 'The influence of hydroclimate and management on forest regrowth across the western U.S',
    authors: 'Zachary H. Hoylman, Kelsey Jencso, Vince Archer, James (Andy) Efta, Zachary A. Holden, Ashley P. Ballantyne, Marie Johnson',
    venue: 'Environmental Research Letters',
    year: 2021,
    doi: '10.1088/1748-9326/abec03',
  },
  {
    title: 'Scalar Mismatches and Underlying Factors for Underutilization of Climate Information: Perspectives From Farmers and Ranchers',
    authors: 'Ada P. Smith, Laurie Yung, Adam J. Snitker, R. Kyle Bocinsky, Elizabeth Covelli Metcalf, Kelsey Jencso',
    venue: 'Frontiers in Climate',
    year: 2021,
    doi: '10.3389/fclim.2021.663071',
  },
  {
    title: 'Lessons Learned from the 2017 Flash Drought across the U.S. Northern Great Plains and Canadian Prairies',
    authors: 'Andrew Hoell, Britt-Anne Parker, Michael Downey, Natalie Umphlett, Kelsey Jencso, F. Adnan Akyuz, Dannele Peck, Trevor Hadwen, Brian Fuchs, Doug Kluck, Laura Edwards, Judith Perlwitz, Jon Eischeid, Veva Deheza, Roger Pulwarty, Kathryn Bevington',
    venue: 'Bulletin of the American Meteorological Society',
    year: 2020,
    doi: '10.1175/BAMS-D-19-0272.1',
  },
  {
    title: 'IrrMapper: A Machine Learning Approach for High Resolution Mapping of Irrigated Agriculture Across the Western U.S.',
    authors: 'David Ketchum, Kelsey Jencso, Marco Maneta, Forrest Melton, Matthew Jones, Justin Huntington',
    venue: 'Remote Sensing',
    year: 2020,
    doi: '10.3390/rs12142328',
  },
  {
    title: 'A numerical investigation of bedrock groundwater recharge and exfiltration on soil mantled hillslopes',
    authors: 'W. Payton Gardner, Kelsey Jencso, Zachary Hoylman, Robert Livesay, Marco Maneta',
    venue: 'Hydrological Processes',
    year: 2020,
    doi: '10.1002/hyp.13799',
  },
  {
    title: 'The Topographic Signature of Ecosystem Climate Sensitivity in the Western United States',
    authors: 'Zachary H. Hoylman, Kelsey Jencso, Jia Hu, Zachary A. Holden, Brady Allred, Solomon Dobrowski, Nathaniel Robinson, Justin T. Martin, David Affleck, Carl Seielstad',
    venue: 'Geophysical Research Letters',
    year: 2019,
    doi: '10.1029/2019GL085546',
  },
  {
    title: 'TOPOFIRE: A Topographically Resolved Wildfire Danger and Drought Monitoring System for the Conterminous United States',
    authors: 'Zachary A. Holden, Matt Jolly, Alan Swanson, Dyer A. Warren, Kelsey Jencso, Marco Maneta, Mitchell Burgard, Chris Gibson, Zachary Hoylman, Erin L. Landguth',
    venue: 'Bulletin of the American Meteorological Society',
    year: 2019,
    doi: '10.1175/BAMS-D-18-0178.1',
  },
];

export const doiUrl = (doi: string): string => `https://doi.org/${doi}`;
