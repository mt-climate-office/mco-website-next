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

// The photo hero has its tiles (it has no controls; DECISIONS D22).
const photosReady = () =>
  !document.documentElement.classList.contains('mco-booting') &&
  /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '') &&
  document.querySelectorAll('#hero-mosaic img').length > 0;

// The station map island has drawn (canvas, legend) and its tiles settled.
// It loads when the map reaches the viewport, so this scrolls it there, and
// opens the table twin so axe checks it too. Side effects in a ready check
// are deliberate here: the harness has no separate setup hook.
const mapReady = () => {
  const frame = document.getElementById('sm-map');
  if (!frame) return false;
  frame.scrollIntoView({ block: 'center' });
  const details = document.querySelector('.sm-details');
  if (details) details.open = true;
  return !document.documentElement.classList.contains('mco-booting') &&
    !!frame.querySelector('canvas') &&
    document.getElementById('sm-legend')?.hidden === false &&
    !!frame.querySelector('.maplibregl-ctrl-attrib');
};

// The conditions card shows a station with its readings in (none loading).
const conditionsReady = () => {
  const card = document.getElementById('cond');
  const result = document.getElementById('cond-result');
  if (!card || !result) return false;
  card.scrollIntoView({ block: 'center' });
  return !document.documentElement.classList.contains('mco-booting') &&
    !result.hidden && !result.hasAttribute('aria-busy') &&
    /^Updated /.test(document.getElementById('cond-stamp')?.textContent || '');
};

export default {
  // keyboard.mjs opens every probe page with this; without it, it would use
  // the first scenario's (photosReady), which only the homepage can meet.
  ready: chromeReady,
  scenarios: [
    { name: 'home', query: '', ready: photosReady },
    // The station map, loaded, with its table twin open.
    { name: 'home-map', query: '', ready: mapReady },
    // The conditions card, filled from a linked station (?s=).
    { name: 'home-conditions', query: '?s=aceabsar', ready: conditionsReady },
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
    // Section hubs and the accessibility statement (static pages).
    { name: 'conditions', query: 'conditions/', ready: chromeReady },
    { name: 'drought', query: 'drought/', ready: chromeReady },
    { name: 'mesonet', query: 'mesonet/', ready: chromeReady },
    { name: 'research', query: 'research/', ready: chromeReady },
    // Publications: the list filtered from the URL (chips pressed, count
    // stated), and one publication page.
    { name: 'publications', query: 'research/publications/?year=2021&topic=drought',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '') &&
        / of \d+ publications?$/.test(document.getElementById('pub-count')?.textContent || '') },
    { name: 'publication', query: 'research/publications/hoylman-2022-drought-assessment/', ready: chromeReady },
    // Method pages: the longest (seven stage tables, linear equations, a
    // logo) and the QA/QC thresholds table read from the kept CSV.
    { name: 'ag-gdds', query: 'mesonet/ag_tools/gdds/', ready: chromeReady },
    { name: 'qaqc', query: 'mesonet/qaqc/', ready: chromeReady },
    { name: 'mesonet-data', query: 'mesonet/data/', ready: chromeReady },
    { name: 'about', query: 'about/', ready: chromeReady },
    // People, partners and projects: the team page (photos, a person with
    // none, contact links), the partners page, the project list, and a
    // project with a body, partners and a tagged publication.
    { name: 'team', query: 'about/team/', ready: chromeReady },
    { name: 'partners', query: 'about/partnerships/', ready: chromeReady },
    { name: 'projects', query: 'projects/', ready: chromeReady },
    { name: 'project', query: 'projects/mdc/', ready: chromeReady },
    { name: 'accessibility', query: 'accessibility/', ready: chromeReady },
    { name: 'search-results', query: 'search/?q=soil', ready: resultsReady },
  ],
  probes: async ({ open, check }) => {
    // Photo hero: West only, no controls, one image to assistive
    // technology, and the h1, stamp and label agree with the tiles (D22).
    {
      const { page, close } = await open('');
      await page.waitForFunction(() => document.querySelectorAll('#hero-mosaic img').length > 0, null, { timeout: 30000 });
      const hero = await page.evaluate(() => {
        const m = document.getElementById('hero-mosaic');
        const imgs = [...m.querySelectorAll('img')];
        return {
          n: imgs.length,
          west: imgs.every((i) => /_W_/.test(i.getAttribute('src'))),
          decorative: imgs.every((i) => i.getAttribute('alt') === ''),
          role: m.getAttribute('role'),
          label: m.getAttribute('aria-label'),
          h1: document.querySelector('h1').textContent,
          stamp: document.querySelector('.hero .stamp').textContent,
          controls: !!document.querySelector('#photo-controls, .hero input, .hero select'),
          url: location.search,
        };
      });
      check('photos: every tile faces west, and the h1, stamp and label say so',
        hero.n > 30 && hero.west && /looking west/.test(hero.h1) && /facing west/.test(hero.stamp) &&
        /facing west/.test(hero.label || ''), JSON.stringify(hero));
      check('photos: the mosaic is one named image; its tiles are not read out one by one',
        hero.role === 'img' && /^Photos from \d+ station cameras/.test(hero.label || '') && hero.decorative,
        JSON.stringify({ role: hero.role, label: hero.label }));
      check('photos: no controls, and the homepage URL is left clean', !hero.controls && hero.url === '');
      await close();
    }

    // Station map: nothing of MapLibre until the map reaches the viewport;
    // a wheel over it scrolls the page rather than zooming (cooperative
    // gestures), Ctrl + wheel zooms it; the table twin lists every station
    // in the directory; a station's popup links to its page and the
    // dashboard.
    {
      const phone = { name: '390', width: 390, height: 844, touch: true };
      const { page, close } = await open('', { viewport: phone });
      const map = page.locator('#sm-map');
      const top = await map.evaluate((el) => el.getBoundingClientRect().top);
      const early = await page.evaluate(() => ({
        ml: typeof window.maplibregl !== 'undefined',
        unpkg: performance.getEntriesByType('resource').some((e) => e.name.startsWith('https://unpkg.com/')),
        island: performance.getEntriesByType('resource').some((e) => /station-map-island/.test(e.name)),
      }));
      check('station map: no MapLibre, island or unpkg request before the map is in view',
        top > 844 && !early.ml && !early.unpkg && !early.island, JSON.stringify({ top, ...early }));
      await map.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !!document.querySelector('#sm-map canvas') &&
        document.getElementById('sm-legend')?.hidden === false, null, { timeout: 30000 });
      const loaded = await page.evaluate(() => ({
        role: document.getElementById('sm-map').getAttribute('role'),
        label: document.getElementById('sm-map').getAttribute('aria-label'),
        ticks: document.querySelectorAll('#sm-legend .sm-ticks li').length,
      }));
      check('station map: loads once scrolled into view, labelled, with a legend',
        loaded.role === 'application' && /table below/.test(loaded.label || '') && loaded.ticks >= 2, JSON.stringify(loaded));
      await close();
    }
    {
      const { page, close } = await open('');
      await page.locator('#sm-map').scrollIntoViewIfNeeded();
      await page.waitForFunction(() => !!document.querySelector('#sm-map canvas') &&
        document.getElementById('sm-legend')?.hidden === false, null, { timeout: 30000 });
      await page.waitForTimeout(1500);
      const box = await page.locator('#sm-map').boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      // MapLibre shows its hint for a moment, so record that it was shown.
      await page.evaluate(() => {
        const screen = document.querySelector('.maplibregl-cooperative-gesture-screen');
        window.__smHint = false;
        new MutationObserver(() => { if (screen.classList.contains('maplibregl-show')) window.__smHint = true; })
          .observe(screen, { attributes: true, attributeFilter: ['class'] });
      });
      const y0 = await page.evaluate(() => window.scrollY);
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(600);
      const wheel = await page.evaluate(() => ({ scrolled: window.scrollY, hint: window.__smHint }));
      check('station map: a wheel over the map scrolls the page and shows the zoom hint',
        wheel.scrolled > y0 && wheel.hint, JSON.stringify({ y0, ...wheel }));
      // The page moved under the pointer: point at the map again.
      const b1 = await page.locator('#sm-map').boundingBox();
      await page.mouse.move(b1.x + b1.width / 2, b1.y + b1.height / 2);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -240);
      await page.keyboard.up('Control');
      await page.waitForTimeout(600);
      const y2 = await page.evaluate(() => window.scrollY);
      check('station map: Ctrl + wheel zooms the map, not the page', y2 === wheel.scrolled, JSON.stringify({ before: wheel.scrolled, after: y2 }));

      // A station's popup: find one under the pointer by its hover tooltip.
      const b = await page.locator('#sm-map').boundingBox();
      let hit = null;
      for (let y = b.y + 50; y < b.y + b.height - 50 && !hit; y += 8) {
        for (let x = b.x + 60; x < b.x + b.width - 70; x += 8) {
          await page.mouse.move(x, y);
          if (await page.evaluate(() => document.querySelector('.mco-tooltip.visible') != null)) { hit = { x, y }; break; }
        }
      }
      if (hit) await page.mouse.click(hit.x, hit.y);
      await page.waitForTimeout(500);
      const pop = await page.evaluate(() => ({
        links: [...document.querySelectorAll('.maplibregl-popup a')].map((a) => a.getAttribute('href')),
        temp: /Air temperature/.test(document.querySelector('.maplibregl-popup')?.textContent || ''),
      }));
      check('station map: a station opens a popup with its reading, page and dashboard links',
        !!hit && pop.temp && pop.links.some((h) => /\/mesonet\/stations\/[a-z0-9_]+\/$/.test(h)) &&
        pop.links.some((h) => /^https:\/\/mesonet\.climate\.umt\.edu\/dash\/next\/\?s=/.test(h)), JSON.stringify(pop));
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
      check('station map: Esc closes the popup', await page.evaluate(() => !document.querySelector('.maplibregl-popup')));

      const twin = await page.evaluate(() => [...document.querySelectorAll('#sm-table tbody tr')].map((tr) => tr.dataset.id));
      await page.goto(new URL('mesonet/stations/', page.url()).href);
      const directory = await page.evaluate(() => [...document.querySelectorAll('#station-table tbody tr')].map((tr) => tr.dataset.id));
      const missing = directory.filter((id) => !twin.includes(id));
      check('station map: the table twin has every station in the directory',
        directory.length > 100 && missing.length === 0 && twin.length === directory.length,
        `twin=${twin.length} directory=${directory.length} missing=${missing.slice(0, 5).join(',')}`);
      await close();
    }

    // Conditions card: the kit's place search finds stations and places in
    // headed sections; a ZIP code fills the card with its nearest station,
    // the distance, the readings and ?s=; Esc behaves as the kit's search
    // box does; ?s= restores the card on load.
    {
      const filled = () => !document.getElementById('cond-result').hidden &&
        !document.getElementById('cond-result').hasAttribute('aria-busy') &&
        /^Updated /.test(document.getElementById('cond-stamp').textContent);
      const { page, close } = await open('');
      const empty = await page.evaluate(() => ({
        result: document.getElementById('cond-result').hidden,
        empty: !document.getElementById('cond-empty').hidden,
        label: document.querySelector('label[for="cond-q"]')?.textContent,
        url: location.search,
      }));
      check('conditions: empty card with a labelled search, homepage URL left clean',
        empty.result && empty.empty && empty.label === 'Find conditions near you' && empty.url === '', JSON.stringify(empty));

      await page.locator('#cond-q').click();
      await page.keyboard.type('bozeman');
      await page.waitForFunction(() => document.querySelectorAll('#cond-list .mco-search-group').length === 2, null, { timeout: 30000 });
      const town = await page.evaluate(() => ({
        groups: [...document.querySelectorAll('#cond-list .mco-search-group')].map((g) => g.textContent),
        first: document.querySelector('#cond-list [role="option"]')?.textContent,
        places: [...document.querySelectorAll('#cond-list [role="group"]:last-child [role="option"]')].map((o) => o.textContent),
        expanded: document.getElementById('cond-q').getAttribute('aria-expanded'),
      }));
      check('conditions: typing a town lists Stations, then Places, headed',
        town.groups.join(',') === 'Stations,Places' && /^Bozeman, (HydroMet|AgriMet)$/.test(town.first || '') &&
        town.places.some((p) => p === 'Bozeman, City') && town.expanded === 'true', JSON.stringify(town));

      // Esc with the list open closes it and restores the text from before
      // it opened (empty here); with the list closed, Esc clears the text.
      await page.keyboard.press('Escape');
      const esc1 = await page.evaluate(() => ({ v: document.getElementById('cond-q').value,
        expanded: document.getElementById('cond-q').getAttribute('aria-expanded'), list: document.getElementById('cond-list').hidden }));
      await page.keyboard.type('lolo');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Shift+Tab');
      const kept = await page.evaluate(() => document.getElementById('cond-q').value);
      await page.keyboard.press('Escape');
      const esc2 = await page.evaluate(() => ({ v: document.getElementById('cond-q').value,
        expanded: document.getElementById('cond-q').getAttribute('aria-expanded') }));
      check('conditions: Esc closes the list and restores the text, then clears it once closed',
        esc1.v === '' && esc1.expanded === 'false' && esc1.list && kept === 'lolo' && esc2.v === '' && esc2.expanded === 'false',
        JSON.stringify({ esc1, kept, esc2 }));

      await page.keyboard.type('59715');
      await page.waitForFunction(() => [...document.querySelectorAll('#cond-list [role="option"]')]
        .some((o) => /^59715, ZIP code$/.test(o.textContent)), null, { timeout: 30000 });
      await page.locator('#cond-list [role="option"]', { hasText: /^59715/ }).first().click();
      await page.waitForFunction(filled, null, { timeout: 30000 });
      await page.waitForFunction(() => [...document.querySelectorAll('[aria-live="polite"]')]
        .some((e) => /from the center of ZIP code 59715\./.test(e.textContent)), null, { timeout: 3000 }).catch(() => {});
      const zip = await page.evaluate(() => ({
        station: document.getElementById('cond-station').textContent,
        from: document.getElementById('cond-from').textContent,
        headline: document.getElementById('cond-headline-label').textContent + ' ' + document.getElementById('cond-headline-value').textContent,
        readings: [...document.querySelectorAll('#cond-readings dt')].map((d) => d.textContent),
        stamp: document.getElementById('cond-stamp').textContent,
        near: [...document.querySelectorAll('#cond-near-rows button')].map((b) => [b.textContent, b.getAttribute('aria-pressed')]),
        links: [...document.querySelectorAll('.cond-links a')].map((a) => a.getAttribute('href')),
        s: new URLSearchParams(location.search).get('s'),
        focus: document.activeElement?.id,
        live: [...document.querySelectorAll('[aria-live="polite"]')].map((e) => e.textContent).join(' '),
      }));
      const pressed = zip.near.filter(([, p]) => p === 'true');
      check('conditions: a ZIP code fills the card with its nearest station and the distance',
        !!zip.station && /^\d+(\.\d)? mi from the center of ZIP code 59715$/.test(zip.from) &&
        /^Air temperature at (2 m|8 ft) -?\d+°F$/.test(zip.headline) && /^Updated .+ · Provisional$|^Updated [^·]+$/.test(zip.stamp) &&
        zip.near.length >= 2 && pressed.length === 1 && pressed[0][0].startsWith(zip.station + ', '),
        JSON.stringify(zip));
      check('conditions: the pick links the station page and dashboard, writes ?s= and keeps focus in the field',
        zip.links.some((h) => new RegExp(`/mesonet/stations/${zip.s}/$`).test(h)) &&
        zip.links.includes(`https://mesonet.climate.umt.edu/dash/next/?s=${zip.s}`) && /^[a-z0-9_]+$/.test(zip.s || '') &&
        zip.focus === 'cond-q', JSON.stringify(zip));
      check('conditions: the card is announced once, in words',
        zip.live.includes(`${zip.station}, ${zip.from}.`), zip.live);

      // The kit's conditions line (MCO.summary): one sentence under the
      // temperature once its parts are in, or hidden when nothing is known;
      // never an error string. Its announcement is the card's, above.
      await page.waitForFunction(() => {
        const s = document.getElementById('cond-summary');
        return s.hidden || s.textContent.trim().length > 0;
      }, null, { timeout: 30000 }).catch(() => {});
      const line = await page.evaluate(() => {
        const s = document.getElementById('cond-summary');
        return { hidden: s.hidden, text: s.textContent };
      });
      check('conditions: the conditions line is one plain sentence, or hidden',
        (line.hidden && line.text === '') ||
        (!line.hidden && /^[A-Z][a-z].*\.$/.test(line.text) && !/error|undefined|null|NaN|—/i.test(line.text)),
        JSON.stringify(line));
      await close();
    }
    {
      const { page, close } = await open('?s=arskeogh');
      await page.waitForFunction(() => !document.getElementById('cond-result').hidden &&
        !document.getElementById('cond-result').hasAttribute('aria-busy') &&
        /^Updated /.test(document.getElementById('cond-stamp').textContent), null, { timeout: 30000 });
      const restored = await page.evaluate(() => ({
        station: document.getElementById('cond-station').textContent,
        label: document.getElementById('cond-headline-label').textContent,
        from: document.getElementById('cond-from').hidden,
        empty: document.getElementById('cond-empty').hidden,
        s: new URLSearchParams(location.search).get('s'),
      }));
      check('conditions: ?s= restores the card on load (an AgriMet station reads its 8 ft sensor)',
        !!restored.station && restored.station !== 'Station' && /^Air temperature( at 8 ft)?$/.test(restored.label) && restored.from && restored.empty && restored.s === 'arskeogh',
        JSON.stringify(restored));
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

    // Publications: chips narrow the list (or within a group, and across
    // groups), say how many match, announce it, and mirror the URL; "Show
    // all" undoes it. Each item page links its own BibTeX and CSL-JSON.
    {
      const { page, close } = await open('research/publications/');
      const total = await page.locator('#pub-items > li').count();
      const state = () => page.evaluate(() => ({
        shown: [...document.querySelectorAll('#pub-items > li')].filter((li) => !li.hidden)
          .map((li) => ({ year: li.dataset.year, topic: li.dataset.topic })),
        count: document.getElementById('pub-count').textContent,
        q: Object.fromEntries(new URLSearchParams(location.search)),
        clear: !document.getElementById('pub-clear').hidden,
        live: [...document.querySelectorAll('[aria-live="polite"]')].map((e) => e.textContent).join(' '),
      }));
      await page.locator('#pf-year .mco-chip', { hasText: /^2021$/ }).click();
      await page.waitForTimeout(150);
      const y = await state();
      check('publications: a year chip narrows the list to that year',
        total > 1 && y.shown.length > 0 && y.shown.length < total && y.shown.every((s) => s.year === '2021'), JSON.stringify(y));
      check('publications: the count is stated, announced and mirrored to ?year=',
        y.count === `${y.shown.length} of ${total} publications` && y.q.year === '2021' && y.clear &&
        y.live.includes(y.count), JSON.stringify(y));
      await page.locator('#pf-topic .mco-chip', { hasText: /^Drought$/ }).click();
      await page.waitForTimeout(150);
      const yt = await state();
      check('publications: groups combine (2021 and Drought)',
        yt.shown.length > 0 && yt.shown.length <= y.shown.length &&
        yt.shown.every((s) => s.year === '2021' && s.topic.split(' ').includes('drought')) && yt.q.topic === 'drought',
        JSON.stringify(yt));
      await page.locator('#pub-clear').click();
      await page.waitForTimeout(150);
      const all = await state();
      check('publications: Show all restores every item and clears the URL',
        all.shown.length === total && !all.q.year && !all.q.topic && !all.clear, JSON.stringify(all));

      await page.goto(new URL('hoylman-2022-drought-assessment/', page.url()).href);
      const item = await page.evaluate(() => {
        const links = [...document.querySelectorAll('main a')].map((a) => ({ text: a.textContent.trim(), href: a.href }));
        return {
          h1: document.querySelector('h1').textContent,
          doi: links.some((l) => l.href === 'https://doi.org/10.1038/s41467-022-30316-5'),
          vague: links.filter((l) => /^(read article|permalink|here|link|more)$/i.test(l.text)).length,
          bibHref: links.find((l) => /^BibTeX for this /.test(l.text))?.href,
          cslHref: links.find((l) => /^CSL-JSON for this /.test(l.text))?.href,
        };
      });
      // Fetched from the test runner: the page's CSP (connect-src) rightly
      // blocks fetch() from the page itself. The links are plain downloads.
      item.bib = item.bibHref ? (await (await page.request.get(item.bibHref)).text()).slice(0, 48) : null;
      item.csl = item.cslHref ? (await (await page.request.get(item.cslHref)).json()).map((x) => x.id) : null;
      check('publication: title as h1, DOI linked, no vague link text',
        /^Drought assessment has been outpaced/.test(item.h1) && item.doi && item.vague === 0, JSON.stringify(item));
      check('publication: its BibTeX and CSL-JSON load',
        /^@article\{hoylman-2022-drought-assessment,/.test(item.bib || '') &&
        JSON.stringify(item.csl) === '["hoylman-2022-drought-assessment"]', JSON.stringify(item));
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
