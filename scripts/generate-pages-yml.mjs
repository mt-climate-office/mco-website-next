#!/usr/bin/env node
// Writes .pages.yml, the Pages CMS config, from src/content/_fields.ts
// (DECISIONS D13).
//
//   npm run gen:cms     write .pages.yml
//   npm run check:cms   exit 1 if the committed .pages.yml is stale (CI)
//
// .pages.yml stays committed because Pages CMS reads it from the repo, but it
// is never edited by hand. Edit src/content/_fields.ts and regenerate.
//
// Node imports _fields.ts directly with its built-in type stripping, as
// scripts/gen-api.mjs and the newsletter scripts import .ts files, so this
// needs no tsx or compile step and no new dependency.
import { readFileSync, writeFileSync } from 'node:fs';
import YAML from 'yaml';
import { collectionDefs } from '../src/content/_fields.ts';

const OUT = new URL('../.pages.yml', import.meta.url);

const BANNER = [
  'GENERATED FILE. DO NOT EDIT.',
  'Source: src/content/_fields.ts and scripts/generate-pages-yml.mjs',
  'Regenerate: npm run gen:cms (CI runs npm run check:cms)',
  'Pages CMS docs: https://pagescms.org/docs/configuration/',
];

// The parts of .pages.yml that no schema describes.
const STATIC_CONFIG = {
  settings: {
    content: {
      // DATA-LOSS GUARD. DO NOT REMOVE (DECISIONS D14).
      // Without merge, Pages CMS writes back only the fields this config
      // lists and silently deletes every other field in the file on save. A
      // reported case lost 131 lines in one save.
      merge: true,
    },
  },
  // Uploads land in public/, so the site serves them as they are and the
  // newsletter renderer can make their root-relative paths absolute
  // (docs/newsletter.md, Images). Migrated posts keep theirs under
  // public/images/news/<slug>/.
  media: {
    input: 'public/images/news',
    output: '/images/news',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
  },
};

function toField(cms) {
  const out = { name: cms.name, type: cms.type };
  if (cms.label) out.label = cms.label;
  if (cms.description) out.description = cms.description;
  if (cms.required) out.required = true;
  if (cms.default !== undefined) out.default = cms.default;
  if (cms.list) out.list = true;
  if (cms.options) out.options = cms.options;
  return out;
}

function toEntry(name, def) {
  const entry = {
    name,
    label: def.label,
    type: 'collection',
    path: def.path,
    format: 'yaml-frontmatter',
  };
  if (def.filename) entry.filename = def.filename;
  if (def.view || def.primary) {
    entry.view = {};
    if (def.view) entry.view.fields = def.view;
    if (def.primary) entry.view.primary = def.primary;
  }
  // What the collection is for, then the rules the build enforces and the
  // CMS cannot express, in words, so an editor who trips one is not
  // surprised by a failed build.
  const description = [def.description, def.refineNote].filter(Boolean).join(' ');
  if (description) entry.description = description;
  entry.fields = def.fields.map(({ cms }) => toField(cms));
  return entry;
}

export function render() {
  const doc = {
    ...STATIC_CONFIG,
    content: Object.entries(collectionDefs).map(([name, def]) => toEntry(name, def)),
  };
  const yaml = YAML.stringify(doc, { lineWidth: 0 });
  // Carry the guard's warning into the file a person might open.
  const GUARD = /^ {4}merge: true$/m;
  if (!GUARD.test(yaml)) throw new Error('gen-cms: settings.content.merge: true is missing (DECISIONS D14)');
  const guarded = yaml.replace(GUARD,
    '    merge: true # DO NOT REMOVE. Without it Pages CMS deletes unlisted fields on save (DECISIONS D14).');
  return BANNER.map((l) => `# ${l}`).join('\n') + '\n\n' + guarded;
}

const text = render();

if (process.argv.includes('--check')) {
  let existing = '';
  try { existing = readFileSync(OUT, 'utf8'); } catch { /* missing counts as stale */ }
  if (existing !== text) {
    console.error('check-cms: .pages.yml does not match src/content/_fields.ts.\n' +
      'Run `npm run gen:cms` and commit the result. Never edit .pages.yml by hand.');
    process.exit(1);
  }
  console.log('check-cms: .pages.yml matches src/content/_fields.ts');
} else {
  writeFileSync(OUT, text);
  console.log('gen-cms: wrote .pages.yml');
}
