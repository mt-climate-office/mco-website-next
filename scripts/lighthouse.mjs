#!/usr/bin/env node
// Lighthouse budgets from the rebuild plan, Part 5, run on mobile settings
// against the built site:
//   - accessibility 100 on every page (fail on any regression)
//   - performance ≥ 90 (median of RUNS runs, to damp simulation noise)
//   - homepage JavaScript under 150 KB transferred, excluding a lazy map
//     island (none exists yet)
//
//   BASE_PATH=/verify-base/ node scripts/lighthouse.mjs
//
// LH_PAGES narrows the pages (comma-separated names from PAGES, or "all") and
// LH_RUNS sets the runs per page. Defaults are the full set: every page, 3
// runs. Pull requests use LH_PAGES=home LH_RUNS=1 (D17); budgets are the same.
//
// Uses Playwright's pinned Chromium, so CI downloads one browser, not two.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';
import { base, stage, stageDist } from './stage.mjs';

const ALL_PAGES = [
  { name: 'home', path: '', jsBudgetKB: 150 },
  { name: 'not-found', path: '404.html' },
  { name: 'stations', path: 'mesonet/stations/' },
  { name: 'station', path: 'mesonet/stations/aceabsar/' },
  { name: 'status', path: 'mesonet/status/' },
  { name: 'search', path: 'search/' },
  { name: 'drought', path: 'drought/' },
  { name: 'accessibility', path: 'accessibility/' },
  { name: 'news', path: 'news/' },
];
const MIN = { accessibility: 1, performance: 0.9 };

const want = (process.env.LH_PAGES || 'all').split(',').map((s) => s.trim()).filter(Boolean);
const PAGES = want.includes('all') ? ALL_PAGES : ALL_PAGES.filter((p) => want.includes(p.name));
const missing = want.filter((n) => n !== 'all' && !ALL_PAGES.some((p) => p.name === n));
const RUNS = Number(process.env.LH_RUNS || 3);
if (!PAGES.length || missing.length || !Number.isInteger(RUNS) || RUNS < 1) {
  console.error(`lighthouse: LH_PAGES takes "all" or names from ${ALL_PAGES.map((p) => p.name).join(', ')}; LH_RUNS a whole number ≥ 1. Got LH_PAGES="${process.env.LH_PAGES ?? ''}" LH_RUNS="${process.env.LH_RUNS ?? ''}"`);
  process.exit(2);
}
console.log(`lighthouse: ${PAGES.map((p) => p.name).join(', ')} × ${RUNS} run(s)`);

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
};

stageDist();
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(stage, p));
    if (!f.startsWith(stage)) { res.writeHead(403).end(); return; }
    const body = await readFile(f);
    res.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const chrome = await chromeLauncher.launch({
  chromePath: chromium.executablePath(),
  chromeFlags: ['--headless=new', '--no-sandbox'],
});

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const failures = [];
try {
  for (const page of PAGES) {
    const url = origin + base + page.path;
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const { lhr } = await lighthouse(url, {
        port: chrome.port, output: 'json', logLevel: 'error',
        onlyCategories: ['accessibility', 'performance'],
      });
      runs.push(lhr);
    }
    const a11y = Math.min(...runs.map((r) => r.categories.accessibility.score));
    const perf = median(runs.map((r) => r.categories.performance.score));
    const scriptKB = median(runs.map((r) => r.audits['network-requests'].details.items
      .filter((it) => it.resourceType === 'Script')
      .reduce((sum, it) => sum + (it.transferSize || 0), 0))) / 1024;

    console.log(`${page.name}: accessibility ${Math.round(a11y * 100)}, performance ${Math.round(perf * 100)} (median of ${RUNS}), JS ${scriptKB.toFixed(1)} KB`);
    if (a11y < MIN.accessibility) {
      const failed = Object.values(runs[0].audits)
        .filter((a) => runs[0].categories.accessibility.auditRefs.some((ref) => ref.id === a.id) && a.score === 0)
        .map((a) => a.id);
      failures.push(`${page.name}: accessibility ${Math.round(a11y * 100)} < 100 (${failed.join(', ')})`);
    }
    if (perf < MIN.performance) failures.push(`${page.name}: performance ${Math.round(perf * 100)} < ${MIN.performance * 100}`);
    if (page.jsBudgetKB && scriptKB > page.jsBudgetKB) failures.push(`${page.name}: JS ${scriptKB.toFixed(1)} KB > ${page.jsBudgetKB} KB`);
  }
} finally {
  chrome.kill();
  server.close();
}

if (failures.length) {
  console.error(`lighthouse: ${failures.length} budget(s) missed\n  ` + failures.join('\n  '));
  process.exit(1);
}
console.log('lighthouse: all budgets met');
