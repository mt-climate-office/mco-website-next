// The homepage hero is a theme island (kit 0.18.0, DECISIONS D23): dark in
// every page theme, or high-contrast on a high-contrast page. The header
// takes the same island while it sits over the hero, so its text keeps its
// contrast on the scrim, and returns to the page theme once the hero has
// scrolled out from under it. Both carry data-theme="dark" in the HTML, so
// without scripts the hero and the header stay dark.

declare const MCO: { getTheme(): string };

const hero = document.querySelector<HTMLElement>('.hero[data-theme]');
const nav = document.querySelector<HTMLElement>('.mco-navbar');

if (hero && nav) {
  const island = () => (MCO.getTheme() === 'high-contrast' ? 'high-contrast' : 'dark');
  let over: boolean | null = null;

  const apply = () => {
    const theme = island();
    hero.dataset.theme = theme;
    if (over) nav.dataset.theme = theme;
    else delete nav.dataset.theme;
  };

  let queued = false;
  const check = () => {
    queued = false;
    const now = hero.getBoundingClientRect().bottom > nav.offsetHeight;
    if (now !== over) { over = now; apply(); }
  };
  const queue = () => {
    if (!queued) { queued = true; requestAnimationFrame(check); }
  };

  check();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  document.addEventListener('mco:themechange', apply);
}
