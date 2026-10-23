// An image a content entry names by its root-relative path in public/ (a
// person's photo, a project's image, a partner's logo): its URL under the
// base path and its pixel size, so the page does not shift as it loads.
// Fails the build when the file is missing, as the Markdown pipeline does
// (src/lib/markdown-site-paths.mjs), so a broken CMS upload never ships.
import { join } from 'node:path';
import { imageSize } from './image-size.mjs';
import { url } from './paths';

// Builds run from the project root; import.meta.url points into the bundle.
const PUBLIC = join(process.cwd(), 'public');

export interface ContentImage { src: string; width: number; height: number }

export function contentImage(path: string, owner: string): ContentImage {
  let size: { width: number; height: number } | null = null;
  try {
    size = imageSize(join(PUBLIC, decodeURI(path)));
  } catch {
    throw new Error(`${owner}: image ${path} is not in public/`);
  }
  if (!size) throw new Error(`${owner}: cannot read the size of ${path}`);
  return { src: url(path), ...size };
}
