#!/usr/bin/env node
// Runs the kit's verify harness (mco-web-style tools/verify) against the
// built site. The tools are the kit's, at the pinned tag; Playwright and axe
// are this repo's pinned devDependencies, passed in through VERIFY_MODULES.
//
//   KIT_DIR=../mco-web-style-v0.18.0 BASE_PATH=/verify-base/ node scripts/verify.mjs
//
// KIT_DIR is a checkout of mco-web-style at the KIT_VERSION tag. dist/ must
// have been built with the same BASE_PATH.
//
// VERIFY_ENGINES picks the browsers (comma-separated, chromium and/or webkit).
// Default is both, the full set; pull requests narrow it to chromium (D17).
// The kit harness reads it as BROWSERS.
//
// VERIFY_SCENARIOS narrows the axe and keyboard pass to the named scenarios
// in verify.config.mjs (comma-separated), and head.mjs to the pages those
// scenarios open. Unset, everything runs: every scenario, every built page.
// Code pull requests use the core set (D17, amended); check:built still
// covers every page's head in the build job.
import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { site, stage, stageDist } from './stage.mjs';

const ENGINES = ['chromium', 'webkit'];
const engines = (process.env.VERIFY_ENGINES || ENGINES.join(',')).split(',').map((s) => s.trim()).filter(Boolean);
const unknown = engines.filter((e) => !ENGINES.includes(e));
if (!engines.length || unknown.length) {
  console.error(`verify: VERIFY_ENGINES must list ${ENGINES.join(' and/or ')}; got "${process.env.VERIFY_ENGINES}"`);
  process.exit(2);
}
console.log(`verify: engines ${engines.join(', ')}`);

const kitDir = process.env.KIT_DIR;
if (!kitDir) { console.error('verify: set KIT_DIR to a mco-web-style checkout at the pinned tag'); process.exit(2); }
const tools = join(resolve(kitDir), 'tools', 'verify');

const full = (await import(new URL('../verify.config.mjs', import.meta.url))).default;
const wanted = (process.env.VERIFY_SCENARIOS || '').split(',').map((s) => s.trim()).filter(Boolean);
const missing = wanted.filter((n) => !full.scenarios.some((s) => s.name === n));
if (missing.length) {
  console.error(`verify: VERIFY_SCENARIOS names no scenario in verify.config.mjs: ${missing.join(', ')}`);
  process.exit(2);
}
const scenarios = wanted.length ? full.scenarios.filter((s) => wanted.includes(s.name)) : full.scenarios;
console.log(wanted.length ? `verify: ${scenarios.length} of ${full.scenarios.length} scenarios (${wanted.join(', ')})` : `verify: all ${scenarios.length} scenarios`);
stageDist();

// lint-css reads stylesheets relative to a page, and the built CSS has lost
// its kit-override comments, so lint the source stylesheet through a stub.
const lint = join(stage, '__lint');
mkdirSync(lint);
cpSync('src/styles/site.css', join(lint, 'site.css'));
writeFileSync(join(lint, 'index.html'), '<!doctype html><link rel="stylesheet" href="site.css">\n');

// The config the harness loads: the repo's, or a stub that narrows it. The
// stub imports the repo config, so the ready functions are the same ones.
let configPath = 'verify.config.mjs';
if (wanted.length) {
  configPath = join(stage, '__verify.config.mjs');
  const from = new URL('../verify.config.mjs', import.meta.url).href;
  writeFileSync(configPath, `import full from ${JSON.stringify(from)};\nconst keep = ${JSON.stringify(wanted)};\nexport default { ...full, scenarios: full.scenarios.filter((s) => keep.includes(s.name)) };\n`);
}

const env = { ...process.env, VERIFY_MODULES: resolve('node_modules'), BROWSERS: engines.join(',') };
let failed = 0;
function run(script, ...args) {
  console.log(`\n▶ ${script} ${args.join(' ')}`);
  const r = spawnSync(process.execPath, [join(tools, script), ...args], { stdio: 'inherit', env });
  if (r.status !== 0) failed++;
}

function* pages(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* pages(p);
    else if (name.endsWith('.html')) yield p;
  }
}

const entry = relative(stage, join(site, 'index.html'));
// A scenario's page: its query without the search string, as a file.
const pageOf = (q) => { const path = q.split('?')[0]; return !path || path.endsWith('/') ? path + 'index.html' : path; };
const headPages = wanted.length ? [...new Set(scenarios.map((s) => join(site, pageOf(s.query))))] : [...pages(site)];
console.log(`verify: head.mjs on ${headPages.length} page(s)`);
for (const p of headPages) run('head.mjs', '--root', stage, '--page', relative(stage, p));
run('lint-css.mjs', '--root', stage, '--page', '__lint/index.html', '--strict', '--verbose');
run('axe-matrix.mjs', '--config', configPath, '--root', stage, '--page', entry);
run('keyboard.mjs', '--config', configPath, '--root', stage, '--page', entry);

if (failed) { console.error(`\nverify: ${failed} gate(s) failed`); process.exit(1); }
console.log('\nverify: all gates passed');
