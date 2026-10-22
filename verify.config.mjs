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
    // Station directory with the filter applied from the URL, and one station.
    { name: 'stations', query: 'mesonet/stations/?q=gallatin',
      ready: () => !document.documentElement.classList.contains('mco-booting') &&
        /^Switch to /.test(document.getElementById('btn-theme')?.getAttribute('aria-label') || '') &&
        document.getElementById('station-count').textContent !== '' },
    { name: 'station', query: 'mesonet/stations/aceabsar/', ready: chromeReady },
  ],
  probes: async ({ open, check }) => {
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
