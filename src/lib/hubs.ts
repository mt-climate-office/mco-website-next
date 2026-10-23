// Content for the section hubs (rebuild plan §4.2, Phase 3 item 7). Each hub
// leads with the questions its tools answer (VOICE: every page says what the
// reader can do next). Copy follows docs/VOICE.md; every claim carries its
// source beside it, as src/lib/tools.ts does.
//
// Where a tool's TOOLS description already answers the question, the card
// reuses it rather than restating it. The four homepage question bodies are
// repeated here word for word (src/pages/index.astro QUESTIONS), with their
// sources; the homepage can import them from here once nobody else is
// editing it.
import { DASHBOARD, TOOLS } from './tools';

type ToolName = (typeof TOOLS)[number]['name'];

/** One entry of TOOLS by name; a typo fails the build. */
export function tool(name: ToolName) {
  const t = TOOLS.find((x) => x.name === name);
  if (!t) throw new Error(`hubs: no tool named ${name}`);
  return t;
}

/** TOOLS entries by name, in the order given. */
export const tools = (...names: ToolName[]) => names.map(tool);

export interface Question {
  question: string;
  body: string;
  tool: string;
  href: string;
  status?: string;
}

/** A question answered by one of TOOLS, using its own description. */
const ask = (question: string, name: ToolName): Question => {
  const t = tool(name);
  return { question, body: t.description, tool: t.name, href: t.href, ...('status' in t ? { status: t.status } : {}) };
};

// ── Shared with the homepage (index.astro QUESTIONS, same sources) ─────────

// mco-drought-dashboard/docs/index.html:175-178 (indices), :836 (15 d to
// 730 d, plus water year and year to date); methods.html:373-375 (gridMET,
// daily). BETA is the tool's own navbar pill.
const HOW_DRY: Question = {
  question: 'How dry is it?',
  body: 'SPI, SPEI, EDDI and SVPDI for the contiguous US, computed daily from gridMET. Timescales run from 15 days to two years.',
  tool: 'D³ Drought Data Dashboard',
  href: tool('D³ Drought Data Dashboard').href,
  status: 'beta',
};

// mco-snowpack-explorer/index.html About panel: SNODAS from 30 Sep 2003,
// same calendar day, ~1 km grid, HUC 2-8.
const SNOW: Question = {
  question: 'Is the snow where it should be?',
  body: 'Snow water equivalent compared with the same day in every year since 2003, from NOAA SNODAS. Mapped on a grid of about 1 km or by watershed.',
  tool: 'Snowpack Explorer',
  href: tool('Snowpack Explorer').href,
};

// mesonet-explorer/app.js REGISTRY: soil moisture shallow / mid / deep,
// GDD and reference ET. Not "four depths": the Explorer groups them in three.
const SOIL: Question = {
  question: 'How wet is the soil?',
  body: 'Shallow, mid-depth and deep soil moisture at each Mesonet station, with growing degree days and reference ET.',
  tool: 'Mesonet Explorer',
  href: tool('Mesonet Explorer').href,
};

// mesonet-dashboard/web/src/ui/charts/resources.ts:63 (gridMET normals),
// NWS points/forecast.
const NORMAL: Question = {
  question: 'Is this normal for the time of year?',
  body: 'Daily values at one station plotted against gridMET normals, with the National Weather Service forecast for that spot.',
  tool: 'Station Dashboard',
  href: DASHBOARD,
};

// ── Conditions ─────────────────────────────────────────────────────────────

export const CONDITIONS_QUESTIONS: Question[] = [
  ask('What are the stations reading now?', 'Mesonet Explorer'),
  SOIL,
  ask('What does it look like out there?', 'Photo Explorer'),
  NORMAL,
];

// ── Drought (rebuild plan §4.8: lead with what each tool answers) ──────────
//
// Not here: the UMRB drought indicators dashboard. drought.climate.umt.edu
// now redirects to d3drought.org ("The Montana Climate Office drought
// dashboard is now at d3drought.org", fetched 22 Oct 2026), so D³ is the
// answer to "how dry is it" for the basin too.

// LFP Explorer: its own <meta name="description"> and <title>
// ("LFP Explorer · Sustainable FSA"), fetched 22 Oct 2026 from
// https://sustainable-fsa.com/lfp-explorer/. No beta marker on the page.
// The year range it covers changes, so it is left out.
const LFP: Question = {
  question: 'Did this county qualify for livestock forage assistance?',
  body: 'A county map of USDA Livestock Forage Disaster Program drought eligibility, with the FSA normal grazing periods and weekly U.S. Drought Monitor record behind it. From the Sustainable FSA project.',
  tool: 'LFP Explorer',
  href: 'https://sustainable-fsa.com/lfp-explorer/',
};

export const DROUGHT_QUESTIONS: Question[] = [HOW_DRY, SNOW, LFP, SOIL];
