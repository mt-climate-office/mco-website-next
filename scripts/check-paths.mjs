#!/usr/bin/env node
// Fails if source writes down a host or base path it must not (rebuild plan
// §2.1): the staging host, the project-pages host or base path, the
// production apex outside astro.config.mjs, or a root-relative link that
// bypasses the base path. Links go through src/lib/paths.ts instead.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SCAN = ['src', 'public', 'scripts', '.github'];
const SELF = 'scripts/check-paths.mjs';
const TEXT = /\.(astro|ts|mjs|js|css|md|mdx|json|ya?ml|html|txt)$/;

const RULES = [
  { re: /next\.climate\.umt\.edu/, why: 'staging host' },
  { re: /mt-climate-office\.github\.io/, why: 'project-pages host' },
  { re: /\/mco-website-next\b/, why: 'project-pages base path' },
  { re: /(?<![\w.-])climate\.umt\.edu/, why: 'production host (only astro.config.mjs names it)',
    allow: ['scripts/check-built.mjs'] },
  { re: /\b(?:href|src|action)=["']\/(?!\/)/, why: 'root-relative link bypasses the base path; use url() from src/lib/paths.ts' },
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (TEXT.test(name)) yield p;
  }
}

const failures = [];
for (const top of SCAN) {
  let files;
  try { files = [...walk(join(ROOT, top))]; } catch { continue; }
  for (const file of files) {
    const rel = relative(ROOT, file);
    if (rel === SELF) continue;
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      for (const { re, why, allow = [] } of RULES) {
        if (re.test(line) && !allow.includes(rel)) failures.push(`${rel}:${i + 1}: ${why}\n    ${line.trim()}`);
      }
    });
  }
}

if (failures.length) {
  console.error(`check-paths: ${failures.length} problem(s)\n` + failures.join('\n'));
  process.exit(1);
}
console.log('check-paths: no hosts or base paths in source');
