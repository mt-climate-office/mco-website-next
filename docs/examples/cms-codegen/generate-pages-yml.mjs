#!/usr/bin/env node
/**
 * Generate .pages.yml from the shared field definitions.
 *
 *   npm run gen:cms           write .pages.yml
 *   npm run gen:cms -- --check   exit 1 if the committed file is stale (CI)
 *
 * The file stays committed — Pages CMS reads it from the repo — but it is
 * never hand-edited. Edit src/content/_fields.ts instead.
 *
 * Reference sketch for mco-website-next. Requires `yaml` and `tsx`
 * (or compile _fields.ts first). Adapt paths to the real project.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');            // adapt
const OUT = resolve(ROOT, '.pages.yml');

const BANNER = [
  'GENERATED FILE — DO NOT EDIT.',
  'Source: src/content/_fields.ts',
  'Regenerate: npm run gen:cms',
].join('\n');

/* Hand-maintained parts of .pages.yml that no schema describes. */
const STATIC_CONFIG = {
  settings: {
    content: {
      // DATA-LOSS GUARD — DO NOT REMOVE.
      // Without merge, Pages CMS writes back ONLY the fields listed in the
      // config, silently deleting everything else in the file on save.
      // A reported case lost 131 lines from one file in a single save.
      merge: true,
    },
  },
  media: {
    input: 'public/uploads',
    output: '/uploads',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'svg', 'pdf'],
  },
};

function toEntry(name, def) {
  const entry = {
    name,
    label: def.label,
    path: def.path,
    type: 'collection',
    format: 'yaml-frontmatter',
  };
  if (def.filename) entry.filename = def.filename;

  entry.fields = def.fields.map(({ cms }) => {
    const out = { name: cms.name, type: cms.type };
    if (cms.label) out.label = cms.label;
    if (cms.description) out.description = cms.description;
    if (cms.required) out.required = true;
    if (cms.default !== undefined) out.default = cms.default;
    if (cms.options) out.options = cms.options;
    return out;
  });

  // Rules Zod enforces that the CMS cannot express. Surfaced to editors
  // so a build failure is not a surprise.
  if (def.refineNote) {
    entry.description = def.refineNote;
  }
  return entry;
}

async function build() {
  const { collectionDefs } = await import(
    resolve(ROOT, 'src/content/_fields.ts')
  );

  const doc = {
    ...STATIC_CONFIG,
    content: Object.entries(collectionDefs).map(([n, d]) => toEntry(n, d)),
  };

  const yaml = YAML.stringify(doc, { lineWidth: 0 });
  return `# ${BANNER.split('\n').join('\n# ')}\n\n${yaml}`;
}

const text = await build();

if (process.argv.includes('--check')) {
  let existing = '';
  try { existing = readFileSync(OUT, 'utf8'); } catch { /* missing */ }
  if (existing !== text) {
    console.error(
      '.pages.yml is out of date with src/content/_fields.ts.\n' +
      'Run `npm run gen:cms` and commit the result.'
    );
    process.exit(1);
  }
  console.log('.pages.yml is up to date.');
} else {
  writeFileSync(OUT, text);
  console.log(`Wrote ${OUT}`);
}
