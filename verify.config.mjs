// Config for the kit's verify harness (mco-web-style tools/verify), run by
// scripts/verify.mjs. Root and page come from the command line, because the
// build is staged under its base path.
//
// `ready` and `effect` functions are serialized into the page: they cannot
// call anything defined in this file.

const chromeReady = () =>
  !document.documentElement.classList.contains('mco-booting') &&
  /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '');

export default {
  scenarios: [
    { name: 'home', query: '', ready: chromeReady },
    { name: 'not-found', query: '404.html', ready: chromeReady },
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
  ],
  probes: async ({ open, check }) => {
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
