// Config for the kit's verify harness (mco-web-style tools/verify), run by
// scripts/verify.mjs. Root and page come from the command line, because the
// build is staged under its base path.
//
// `ready` and `effect` functions are serialized into the page: they cannot
// call anything defined in this file.

// Search results have rendered, so axe sees the list and its excerpts.
const resultsReady = () =>
  !document.documentElement.classList.contains('mco-booting') &&
  !document.getElementById('search-status')?.hidden &&
  !/^Searching/.test(document.getElementById('search-status')?.textContent || '');

const chromeReady = () =>
  !document.documentElement.classList.contains('mco-booting') &&
  /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '');

// The photo controls are wired (they stay hidden until MCO.photos has the
// schedule) and no set is loading.
const photosReady = () =>
  !document.documentElement.classList.contains('mco-booting') &&
  /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '') &&
  document.getElementById('photo-controls')?.hidden === false &&
  document.querySelectorAll('#pc-views input[type="radio"]').length > 0 &&
  !document.getElementById('hero-mosaic')?.hasAttribute('aria-busy');

export default {
  // keyboard.mjs opens every probe page with this; without it, it would use
  // the first scenario's (photosReady), which only the homepage can meet.
  ready: chromeReady,
  scenarios: [
    { name: 'home', query: '', ready: photosReady },
    // A linked direction: the mosaic, h1 and stamp follow ?dir=.
    { name: 'home-east', query: '?dir=E',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        document.getElementById('photo-controls')?.hidden === false &&
        !document.getElementById('hero-mosaic')?.hasAttribute('aria-busy') &&
        /_E_/.test(document.querySelector('#hero-mosaic img')?.getAttribute('src') || '') },
    { name: 'not-found', query: '404.html', ready: chromeReady },
    // Station directory with the filter applied from the URL, and one station.
    { name: 'stations', query: 'mesonet/stations/?q=gallatin',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '') &&
        document.getElementById('station-count').textContent !== '' },
    { name: 'station', query: 'mesonet/stations/aceabsar/', ready: chromeReady },
    // The station table, enhanced (sort buttons in place), and filtered so
    // the "N of M shown" caption and count are in the axe pass too.
    {
      name: 'status',
      query: 'mesonet/status/',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        document.querySelectorAll('#st-table thead .st-sort').length === 7,
    },
    {
      name: 'status-filtered',
      query: 'mesonet/status/?health=partial&sort=last&dir=desc',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        document.querySelector('#st-table th[aria-sort="descending"]') != null,
    },
    // News: the list, and the longest migrated post (17 figures, captions,
    // h2–h5), so axe sees content images and the reading layer.
    { name: 'news', query: 'news/', ready: chromeReady },
    { name: 'news-post', query: 'news/mtdrought-and-climate-2026-march/', ready: chromeReady },
    { name: 'search', query: 'search/', ready: chromeReady },
    { name: 'search-results', query: 'search/?q=soil', ready: resultsReady },
  ],
  probes: async ({ open, check }) => {
    // Photo hero: the controls change the set in place, announce it once,
    // and write the URL (date and time kept, North elided).
    {
      const { page, close } = await open('');
      await page.waitForFunction(() => document.getElementById('photo-controls')?.hidden === false &&
        !document.getElementById('hero-mosaic')?.hasAttribute('aria-busy'), null, { timeout: 30000 });
      const before = await page.evaluate(() => ({
        srcs: [...document.querySelectorAll('#hero-mosaic img')].map((i) => i.getAttribute('src')),
        url: location.search,
        views: [...document.querySelectorAll('#pc-views input')].map((i) => i.value).join(','),
      }));
      check('photos: North by default, public views only, homepage URL left clean',
        before.srcs.length > 0 && before.srcs.every((s) => /_N_/.test(s)) && before.views === 'N,E,S,W' && before.url === '',
        JSON.stringify({ n: before.srcs.length, views: before.views, url: before.url }));

      await page.locator('#pc-views label', { hasText: /^E$/ }).click();
      await page.waitForFunction(() => /_E_/.test(document.querySelector('#hero-mosaic img')?.getAttribute('src') || '') &&
        !document.getElementById('hero-mosaic').hasAttribute('aria-busy'), null, { timeout: 30000 });
      await page.waitForFunction(() => [...document.querySelectorAll('[aria-live="polite"]')]
        .some((e) => /facing east/.test(e.textContent)), null, { timeout: 3000 }).catch(() => {});
      const east = await page.evaluate(() => ({
        tiles: [...document.querySelectorAll('#hero-mosaic img')].length,
        allEast: [...document.querySelectorAll('#hero-mosaic img')].every((i) => /_E_/.test(i.src) && /^Looking east from /.test(i.alt)),
        h1: document.querySelector('h1').textContent,
        stamp: document.querySelector('.hero .stamp').textContent,
        live: [...document.querySelectorAll('[aria-live="polite"]')].map((e) => e.textContent).join(' '),
        q: Object.fromEntries(new URLSearchParams(location.search)),
      }));
      check('photos: East swaps every tile in place, with the h1 and stamp',
        east.tiles > 0 && east.allEast && /looking east/.test(east.h1) && /facing east/.test(east.stamp), JSON.stringify(east));
      check('photos: the change is announced once, in words',
        /cameras, facing east,/.test(east.live), east.live);
      check('photos: the URL carries date, time and dir=E',
        east.q.dir === 'E' && /^\d{4}-\d{2}-\d{2}$/.test(east.q.date || '') && !!east.q.time, JSON.stringify(east.q));

      // The first public date has no previous day, so move the time: another
      // ready slot that day, read from the menu the kit built.
      const first = await page.evaluate(() => {
        const s = document.getElementById('pc-time');
        return [...s.options].find((o) => !o.disabled && o.value !== s.value)?.value ?? '';
      });
      const stamp = east.stamp;
      await page.locator('#pc-time').selectOption(first);
      await page.waitForFunction((s) => document.querySelector('.hero .stamp').textContent !== s &&
        !document.getElementById('hero-mosaic').hasAttribute('aria-busy'), stamp, { timeout: 30000 });
      const moved = await page.evaluate(() => ({
        time: new URLSearchParams(location.search).get('time'),
        select: document.getElementById('pc-time').value,
        stamp: document.querySelector('.hero .stamp').textContent,
        dir: new URLSearchParams(location.search).get('dir'),
      }));
      check('photos: a new time moves the set and the URL together, keeping the direction',
        !!first && moved.select === first && moved.time === (first.endsWith(':00') ? String(Number(first.slice(0, 2))) : first) && moved.dir === 'E' && /facing east/.test(moved.stamp),
        JSON.stringify({ first, ...moved }));

      await page.locator('#pc-views label', { hasText: /^N$/ }).click();
      await page.waitForFunction(() => /_N_/.test(document.querySelector('#hero-mosaic img')?.getAttribute('src') || ''), null, { timeout: 30000 });
      const north = await page.evaluate(() => new URLSearchParams(location.search).has('dir'));
      check('photos: back to North drops dir= from the URL', !north);
      await close();
    }

    // Station directory: the filter appears with JS, narrows the rows, says
    // how many match, mirrors ?q=, and clearing it shows every row again.
    {
      const { page, close } = await open('mesonet/stations/');
      const rows = page.locator('#station-table tbody tr');
      const total = await rows.count();
      await page.locator('#station-q').fill('absarokee');
      await page.waitForTimeout(200);
      const narrowed = await page.evaluate(() => ({
        shown: [...document.querySelectorAll('#station-table tbody tr')].filter((r) => !r.hidden).map((r) => r.dataset.id),
        count: document.getElementById('station-count').textContent,
        q: new URLSearchParams(location.search).get('q'),
      }));
      check('stations: filter narrows the table to matching rows',
        total > 100 && narrowed.shown.includes('aceabsar') && narrowed.shown.length < total, JSON.stringify(narrowed));
      check('stations: filter states the count and mirrors ?q=',
        narrowed.count === `${narrowed.shown.length} of ${total} stations` && narrowed.q === 'absarokee', JSON.stringify(narrowed));
      await page.locator('#station-q').fill('');
      await page.waitForTimeout(200);
      const cleared = await page.evaluate(() => ({
        hidden: document.querySelectorAll('#station-table tbody tr[hidden]').length,
        q: new URLSearchParams(location.search).has('q'),
      }));
      check('stations: clearing the filter shows every row and drops ?q=',
        cleared.hidden === 0 && !cleared.q, JSON.stringify(cleared));
      await close();
    }

    // Station table: sort, filter, URL state, and a CSV of the rows shown.
    {
      const { page, close } = await open('mesonet/status/');
      await page.waitForFunction(() => document.querySelectorAll('#st-table .st-sort').length === 7);
      const total = await page.locator('#st-rows tr').count();
      check('status: every station row is in the built page', total > 100, `rows=${total}`);

      await page.locator('#st-table th[data-sort="last"] .st-sort').click();
      await page.locator('#st-table th[data-sort="last"] .st-sort').click();
      const sorted = await page.evaluate(() => {
        const ts = [...document.querySelectorAll('#st-rows tr:not([hidden])')].map((tr) => Number(tr.dataset.ts || 0));
        return { aria: document.querySelector('#st-table th[data-sort="last"]').getAttribute('aria-sort'),
          desc: ts.every((t, i) => i === 0 || ts[i - 1] >= t), url: location.search };
      });
      check('status: Last report sorts newest first on the second press, with aria-sort',
        sorted.aria === 'descending' && sorted.desc && /sort=last/.test(sorted.url) && /dir=desc/.test(sorted.url), JSON.stringify(sorted));

      await page.locator('#st-q').fill('zzzz-no-such-station');
      await page.waitForTimeout(500);
      const none = await page.evaluate(() => ({
        shown: document.querySelectorAll('#st-rows tr:not([hidden])').length,
        empty: !document.getElementById('st-empty').hidden,
        count: document.getElementById('st-count').textContent,
      }));
      check('status: a filter with no match shows the empty line and a zero count',
        none.shown === 0 && none.empty && /^0 of /.test(none.count), JSON.stringify(none));

      await page.locator('#st-q').fill('');
      await page.locator('#st-net .mco-chip[data-value="agrimet"]').click();
      const [download] = await Promise.all([page.waitForEvent('download'), page.locator('#st-csv').click()]);
      const { readFileSync } = await import('node:fs');
      const lines = readFileSync(await download.path(), 'utf8').trim().split(/\r\n/);
      const shown = await page.locator('#st-rows tr:not([hidden])').count();
      check('status: Download CSV writes exactly the rows shown',
        lines.length - 1 === shown && lines.slice(1).every((l) => l.includes('"AgriMet"')), `csv=${lines.length - 1} shown=${shown}`);
      await close();
    }

    // Search: the header link reaches it; typing and Enter lists the
    // homepage, the count is announced, and focus stays in the field.
    {
      const { page, close } = await open('');
      const href = await page.locator('#btn-search').getAttribute('href');
      check('header search link points at the search page', /\/search\/$/.test(href || ''), href);
      await page.goto(new URL(href, page.url()).href);
      await page.locator('#search-q').focus();
      await page.keyboard.type('soil');
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => /result/.test(document.getElementById('search-status').textContent), null, { timeout: 15000 });
      // MCO.announce clears the region, then sets it on a later tick.
      await page.waitForFunction(() => [...document.querySelectorAll('[aria-live="polite"]')]
        .some((e) => /result/.test(e.textContent)), null, { timeout: 3000 }).catch(() => {});
      const got = await page.evaluate(() => ({
        status: document.getElementById('search-status').textContent,
        links: [...document.querySelectorAll('#search-results a')].map((a) => new URL(a.href).pathname),
        home: new URL(document.querySelector('.logo-link').href).pathname,
        focus: document.activeElement?.id,
        live: [...document.querySelectorAll('[aria-live="polite"]')].some((e) => /result/.test(e.textContent)),
      }));
      check('search: a homepage word finds the homepage',
        got.links.includes(got.home) && got.focus === 'search-q', JSON.stringify(got));
      check('search: the count is announced', got.live, got.status);
      await close();
    }

    // Theme toggle cycles dark → light → high contrast and names the next one.
    {
      const { page, close } = await open('?theme=dark');
      const btn = page.locator('#btn-theme');
      const seen = [];
      for (let i = 0; i < 3; i++) {
        await btn.click();
        seen.push(await page.evaluate(() => [document.documentElement.dataset.theme,
          document.getElementById('btn-theme').getAttribute('aria-label')]));
      }
      check('theme toggle cycles light → high contrast → dark',
        seen.map((s) => s[0]).join(',') === 'light,high-contrast,dark', JSON.stringify(seen));
      check('theme toggle label names the next theme',
        seen[0][1] === 'Switch to high contrast theme' && seen[2][1] === 'Switch to light theme', JSON.stringify(seen));
      await close();
    }

    // Compact: links live in the drawer; it opens with focus inside, Esc
    // closes it, and focus returns to the menu button.
    {
      const { page, close } = await open('', { viewport: { name: '390', width: 390, height: 844, touch: true } });
      const inline = await page.locator('.site-nav').isVisible();
      check('compact: inline section links are hidden', !inline);
      await page.locator('#btn-menu').focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const opened = await page.evaluate(() => {
        const d = document.getElementById('site-drawer');
        return { open: !d.hidden, inside: d.contains(document.activeElement),
          expanded: document.getElementById('btn-menu').getAttribute('aria-expanded'),
          links: d.querySelectorAll('nav a').length };
      });
      check('compact: menu opens the drawer with focus inside',
        opened.open && opened.inside && opened.expanded === 'true' && opened.links === 6, JSON.stringify(opened));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const closed = await page.evaluate(() => ({
        hidden: document.getElementById('site-drawer').hidden,
        onToggle: document.activeElement === document.getElementById('btn-menu'),
      }));
      check('compact: Esc closes the drawer and focus returns to the menu button',
        closed.hidden && closed.onToggle, JSON.stringify(closed));
      await close();
    }
  },
};
