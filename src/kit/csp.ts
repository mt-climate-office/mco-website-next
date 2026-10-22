import { createHash } from 'node:crypto';

// A meta CSP, written here rather than by Astro's security.csp: the kit's
// verify gate (tools/verify/head.mjs) matches the exact
// `http-equiv="Content-Security-Policy"` spelling, and Astro emits it in
// lower case. With inlineStylesheets: 'never' and bundled module scripts,
// the only inline script on a page is the kit's anti-flash boot.

const hash = (body: string) =>
  `'sha256-${createHash('sha256').update(body).digest('base64')}'`;

const JSDELIVR = 'https://cdn.jsdelivr.net';

/** The policy for a page whose only inline scripts are `inlineScripts`. */
export function contentSecurityPolicy(inlineScripts: string[]): string {
  return [
    "default-src 'none'",
    `script-src 'self' ${JSDELIVR} ${inlineScripts.map(hash).join(' ')}`,
    `style-src 'self' ${JSDELIVR}`,
    `font-src ${JSDELIVR}`,
    `img-src 'self' ${JSDELIVR}`,
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}
