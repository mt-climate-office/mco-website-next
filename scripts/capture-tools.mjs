#!/usr/bin/env node
// Captures the tool screenshots that no tool publishes itself (the Mesonet
// Explorer, the Snowpack Explorer and D³ use the kit's generic social card),
// and writes them to src/assets/tools/ as WebP for src/lib/tool-shots.ts.
// Run by hand when one of those tools changes; commit the result. Needs
// network and Playwright's Chromium (npx playwright install chromium).
//
//   npm run screenshots:capture            all three
//   npm run screenshots:capture -- d3-drought
//
// Each view is fixed here so a re-capture frames the same place: Montana for
// the Explorer and Snowpack, the lower 48 for D³ (its default view; it has
// no URL state for the map). Light theme where the tool takes ?theme=.
import { chromium } from 'playwright';
import sharp from 'sharp';

const VIEWS = {
  'd3-drought': 'https://d3drought.org/',
  snowpack: 'https://snow.climate.umt.edu/?lat=46.9&lng=-109.6&zoom=5.6&theme=light',
  explorer: 'https://mesonet2.climate.umt.edu/explorer/?lat=46.9&lng=-109.6&zoom=5.9&theme=light',
};

const only = process.argv.slice(2);
const unknown = only.filter((k) => !(k in VIEWS));
if (unknown.length) {
  console.error(`capture-tools: no view named ${unknown.join(', ')} (have ${Object.keys(VIEWS).join(', ')})`);
  process.exit(2);
}

const browser = await chromium.launch();
let failed = 0;
for (const [key, url] of Object.entries(VIEWS)) {
  if (only.length && !only.includes(key)) continue;
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1.5,
    timezoneId: 'America/Denver', locale: 'en-US',
  });
  const page = await ctx.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
    if (!res || !res.ok()) throw new Error(`HTTP ${res ? res.status() : 'no response'}`);
    // Tiles and first-visit dialogs settle after network idle.
    await page.waitForTimeout(8000);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(1500);
    const png = await page.screenshot();
    const out = `src/assets/tools/${key}.webp`;
    const info = await sharp(png).resize({ width: 1600 }).webp({ quality: 78 }).toFile(out);
    console.log(`✓ ${key}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB → ${out}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${key}: ${e.message}`);
  }
  await ctx.close();
}
await browser.close();
console.log('Look at each image before committing it: a dialog or a half-drawn map is easy to miss.');
process.exit(failed ? 1 : 0);
