// Stages dist/ under its base path in verify-root/, so root-absolute asset
// URLs resolve when the folder is served at /. Shared by verify.mjs and
// lighthouse.mjs; dist/ must have been built with the same BASE_PATH.
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const base = (process.env.BASE_PATH || '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
export const stage = resolve('verify-root');
export const site = join(stage, base);

export function stageDist() {
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  cpSync('dist', site, { recursive: true });
}
