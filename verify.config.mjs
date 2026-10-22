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

export default {
  scenarios: [
    { name: 'home', query: '', ready: chromeReady },
    { name: 'not-found', query: '404.html', ready: chromeReady },
    { name: 'search', query: 'search/', ready: chromeReady },
    { name: 'search-results', query: 'search/?q=soil', ready: resultsReady },
  ],
  probes: async ({ open, check }) => {
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
