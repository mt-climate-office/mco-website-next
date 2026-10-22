#!/usr/bin/env node
// Checks the kit pin against the published tag on jsDelivr (needs network):
//   - each SRI hash in src/kit/kit.ts matches the bytes jsDelivr serves
//   - src/kit/anti-flash.inline.js is the tag's anti-flash script, byte for byte
//   - public/mco-logo.png is the tag's navbar badge, byte for byte
// A kit bump that misses one of these fails here, not in a visitor's browser.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root));
const src = read('src/kit/kit.ts').toString();

const version = src.match(/KIT_VERSION = '([^']+)'/)?.[1];
const sri = Object.fromEntries([...src.matchAll(/'([\w/.-]+\.(?:css|js))': '(sha384-[^']+)'/g)].map((m) => [m[1], m[2]]));
const base = `https://cdn.jsdelivr.net/gh/mt-climate-office/mco-web-style@${version}/`;

// jsDelivr refuses to serve .html from GitHub, so the snippet comes from the
// tag itself. Kit tags are never re-pointed (kit AGENTS.md § Releasing).
const raw = `https://raw.githubusercontent.com/mt-climate-office/mco-web-style/v${version}/`;

// Retries: jsDelivr has returned "503 No healthy backends" for uncached
// files at a tag for a minute or two at a time (seen 2026-10-22).
async function get(path, from = base) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(from + path);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (attempt === 4) throw new Error(`${res.status} for ${from + path}`);
    await new Promise((r) => setTimeout(r, 15000 * attempt));
  }
}

const failures = [];
const check = (ok, label) => { console.log(`${ok ? '✓' : '✗'} ${label}`); if (!ok) failures.push(label); };

if (!version || !Object.keys(sri).length) {
  console.error('check-kit: could not read KIT_VERSION / KIT_SRI from src/kit/kit.ts');
  process.exit(2);
}
console.log(`check-kit: mco-web-style@${version}`);

for (const [path, expected] of Object.entries(sri)) {
  const actual = 'sha384-' + createHash('sha384').update(await get(path)).digest('base64');
  check(actual === expected, `SRI ${path}`);
}

const snippet = (await get('snippets/anti-flash.html', raw)).toString();
const body = snippet.match(/<script>([\s\S]*?)<\/script>/)?.[1];
check(body === read('src/kit/anti-flash.inline.js').toString(), 'anti-flash.inline.js matches snippets/anti-flash.html');

check((await get('assets/mco-logo.png')).equals(read('public/mco-logo.png')), 'public/mco-logo.png matches assets/mco-logo.png');

if (failures.length) process.exit(1);
