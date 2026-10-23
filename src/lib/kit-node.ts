// The kit, evaluated at build time. Build-only: imports node:vm, so nothing
// a page ships may import this file.
//
// The homepage photo hero's build-time set is computed by the kit's own
// MCO.photos (DECISIONS D9, one copy), from the same pinned bytes the page
// loads: core/mco-core.js and photos/mco-photos.js at KIT_VERSION, each
// checked against its SRI in src/kit/kit.ts before it is evaluated. This is
// the kit README's "Testing against the kit in Node" recipe, as the
// dashboard's web/test/kit.ts runs it: fetch, verify, then evaluate core
// first as classic scripts in a node:vm context whose `window` is the
// context itself, with stubs for what core touches when it loads.
//
// Fetched bytes are cached under node_modules/.cache/mco-kit/<version>/ and
// re-verified on every read. A hash mismatch or a failed fetch fails the
// build, so the previous deploy stays live. One load per build, shared.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import vm from 'node:vm';
import { kit, KIT_SRI, KIT_VERSION, type KitFile } from '../kit/kit';
import type { Mco } from './photo-hero';

/** Load order: photos needs core. */
const FILES: KitFile[] = ['core/mco-core.js', 'photos/mco-photos.js'];

const CACHE = join(process.cwd(), 'node_modules', '.cache', 'mco-kit', KIT_VERSION);

const sri = (bytes: Buffer) => `sha384-${createHash('sha384').update(bytes).digest('base64')}`;

function verified(path: KitFile, bytes: Buffer): Buffer {
  const got = sri(bytes);
  if (got !== KIT_SRI[path]) {
    throw new Error(`kit: ${kit(path)} integrity mismatch (kit.ts pins ${KIT_SRI[path]}, got ${got})`);
  }
  return bytes;
}

// jsDelivr has returned "503 No healthy backends" for uncached files at a
// tag for a minute or two at a time (scripts/check-kit.mjs, 2026-10-22).
async function download(url: string): Promise<Buffer> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (res.ok) return Buffer.from(await res.arrayBuffer());
      if (attempt === 4) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt === 4) throw new Error(`kit: fetching ${url} failed`, { cause: err });
    }
    await new Promise((r) => setTimeout(r, 10_000 * attempt));
  }
}

async function source(path: KitFile): Promise<string> {
  const cached = join(CACHE, path);
  if (existsSync(cached)) return verified(path, readFileSync(cached)).toString('utf8');
  const bytes = verified(path, await download(kit(path)));
  mkdirSync(dirname(cached), { recursive: true });
  writeFileSync(cached, bytes);
  return bytes.toString('utf8');
}

/** A stub element: enough for mco-core.js to load (it wires listeners and reads attributes). */
function stubElement(tag: string) {
  return {
    tagName: tag.toUpperCase(),
    className: '',
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    children: [],
    setAttribute() {},
    getAttribute: () => null,
    removeAttribute() {},
    append() {},
    appendChild: (c: unknown) => c,
    addEventListener() {},
    removeEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    querySelector: () => null,
    querySelectorAll: () => [],
  };
}

async function load(): Promise<Mco> {
  const sources = await Promise.all(FILES.map(source));
  const matchMedia = () => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  });
  const sandbox: Record<string, unknown> = {
    console,
    setTimeout,
    clearTimeout,
    // The kit's fetchers run here at build time: data2 schedule and listings.
    fetch: (...a: Parameters<typeof fetch>) => fetch(...a),
    AbortSignal,
    URLSearchParams,
    matchMedia,
    location: { search: '', pathname: '/', hash: '', href: 'http://localhost/' },
    history: { state: null, replaceState() {}, pushState() {} },
    addEventListener() {},
    removeEventListener() {},
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    document: {
      documentElement: stubElement('html'),
      body: stubElement('body'),
      head: stubElement('head'),
      readyState: 'complete',
      createElement: stubElement,
      addEventListener() {},
      removeEventListener() {},
      querySelector: () => null,
      querySelectorAll: () => [],
    },
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  FILES.forEach((path, i) => vm.runInContext(sources[i], sandbox, { filename: kit(path) }));
  const MCO = sandbox.MCO as Mco | undefined;
  if (typeof MCO?.photos?.load !== 'function') throw new Error('kit: MCO.photos did not load');
  return MCO;
}

let loaded: Promise<Mco> | undefined;

/**
 * window.MCO from the pinned, SRI-checked core + photos, evaluated in
 * node:vm. Values cross a realm boundary: compare structurally.
 */
export const loadKitInNode = (): Promise<Mco> => (loaded ??= load());
