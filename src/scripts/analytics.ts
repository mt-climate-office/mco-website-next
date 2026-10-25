// Page counts for GoatCounter (DECISIONS D26), as the Station Dashboard
// counts (mesonet-dashboard web/src/core/analytics.ts), into the same
// account: no cookies, no personal data. One count per page view: the path,
// the title and the screen size, plus the referring site (host only) and
// any utm_* campaign tags. The full referrer and the query string's other
// keys are never sent.
//
// Only the production build counts: Base.astro sets data-count on <html>
// there, and its CSP is the only one that lets the beacon out. Skipped when
// the visitor asks not to be tracked (Do Not Track or Global Privacy
// Control). Fire-and-forget: a blocked or failed beacon never affects the
// page.

export const GOATCOUNTER_URL = 'https://mt-climate-office.goatcounter.com/count';

/** The referring site's host (no `www.`), or '' for none, this site, or an unreadable value. */
export function referrerHost(referrer: string, ownHost: string): string {
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, '');
    return host === ownHost.replace(/^www\./, '') ? '' : host;
  } catch {
    return '';
  }
}

/** Only the `utm_*` keys of `search`, as a query string GoatCounter reads campaigns from ('' for none). */
export function campaignQuery(search: string): string {
  const keep = [...new URLSearchParams(search)].filter(([k]) => k.startsWith('utm_'));
  return keep.length ? `?${new URLSearchParams(keep)}` : '';
}

/** The beacon URL for one view. Empty fields are left out. */
export function countUrl(view: { path: string; title: string; screen: string; referrer: string; campaign: string }): string {
  const q = new URLSearchParams(
    Object.entries({ p: view.path, t: view.title, s: view.screen, r: view.referrer, q: view.campaign })
      .filter(([, v]) => v !== ''),
  );
  q.set('rnd', Math.random().toString(36).slice(2));
  return `${GOATCOUNTER_URL}?${q}`;
}

const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
if ('count' in document.documentElement.dataset && nav.doNotTrack !== '1' && nav.globalPrivacyControl !== true) {
  try {
    navigator.sendBeacon(countUrl({
      path: location.pathname,
      title: document.title,
      screen: `${screen.width},${screen.height},${window.devicePixelRatio || 1}`,
      referrer: referrerHost(document.referrer, location.hostname),
      campaign: campaignQuery(location.search),
    }));
  } catch {
    // Ignore: counting is best-effort.
  }
}
