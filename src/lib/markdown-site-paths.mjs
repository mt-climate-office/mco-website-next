// A hast plugin for Astro's Markdown processor, Sätteri
// (astro.config.mjs markdown.processor).
//
// Content is written with root-relative paths, such as /images/news/x.jpg and
// /news/some-post/, because that is what Pages CMS writes and what the
// newsletter renderer makes absolute against the production origin
// (docs/newsletter.md). The site may be built under a base path, so this puts
// every root-relative link and image under it, as url() in src/lib/paths.ts
// does for templates.
//
// It also gives each local image its pixel width and height (so the page does
// not shift as images load) and async decoding, lazy-loads every image after
// the first (often the largest paint, so it loads at once, at high priority), and
// fails the build on an image path with no file in public/, so a broken CMS
// upload never ships.
//
// Responsive images: when an 800px-wide copy sits beside an image, named
// <name>-800w.<ext> (the migrated posts have them), the image gets a srcset so
// a phone downloads the small one. Without the copy the image is served as is.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from './image-size.mjs';

const ROOT_RELATIVE = /^\/(?!\/)/;
const SMALL = 800;
// The reading column (.prose, 68ch) is about 700px wide; below the kit's 750
// rung the image spans the viewport.
const SIZES = '(max-width: 750px) 100vw, 700px';

/**
 * @param {{ base?: string, publicDir: URL }} options
 * @returns {() => import('satteri').HastPluginDefinition} a factory, so each
 *   document counts its own images
 */
export function sitePathsPlugin({ base = '/', publicDir }) {
  const prefix = base.replace(/\/?$/, '/');
  const pub = fileURLToPath(publicDir);
  /** @param {string} value */
  const rebase = (value) => prefix + value.slice(1);

  return () => {
    let images = 0;
    return {
      name: 'mco-site-paths',
      element: {
        filter: ['a', 'img'],
        visit(node, ctx) {
          const p = node.properties ?? {};
          if (node.tagName === 'a') {
            if (typeof p.href === 'string' && ROOT_RELATIVE.test(p.href)) ctx.setProperty(node, 'href', rebase(p.href));
            return;
          }
          if (typeof p.src !== 'string' || !ROOT_RELATIVE.test(p.src)) return;
          const onDisk = join(pub, decodeURI(p.src.split(/[?#]/)[0]));
          if (!existsSync(onDisk)) {
            const where = ctx.fileURL ? fileURLToPath(ctx.fileURL) : 'Markdown';
            throw new Error(`${where}: image ${p.src} is not in public/`);
          }
          const size = imageSize(onDisk);
          if (size && p.width == null && p.height == null) {
            ctx.setProperty(node, 'width', size.width);
            ctx.setProperty(node, 'height', size.height);
          }
          if (images++ === 0) {
            if (p.fetchPriority == null) ctx.setProperty(node, 'fetchPriority', 'high');
          } else if (p.loading == null) {
            ctx.setProperty(node, 'loading', 'lazy');
          }
          if (p.decoding == null) ctx.setProperty(node, 'decoding', 'async');
          const dot = p.src.lastIndexOf('.');
          const small = `${p.src.slice(0, dot)}-${SMALL}w${p.src.slice(dot)}`;
          if (size && size.width > SMALL && p.srcSet == null && existsSync(join(pub, decodeURI(small)))) {
            ctx.setProperty(node, 'srcSet', `${rebase(small)} ${SMALL}w, ${rebase(p.src)} ${size.width}w`);
            ctx.setProperty(node, 'sizes', SIZES);
          }
          ctx.setProperty(node, 'src', rebase(p.src));
        },
      },
    };
  };
}
