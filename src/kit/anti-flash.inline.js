
  (function () {
    const raw = new URLSearchParams(location.search).get('theme');
    const url = raw == null ? null : raw.toLowerCase();
    let saved = null;
    try { saved = localStorage.getItem('mco-theme'); } catch (e) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const valid = ['dark', 'light', 'high-contrast'];
    const t = valid.includes(url) ? url
            : valid.includes(saved) ? saved
            : (prefersDark ? 'dark' : 'light');
    const root = document.documentElement;
    root.setAttribute('data-theme', t);
    root.classList.toggle('is-compact', window.matchMedia('(max-width: 640px), (max-height: 560px)').matches);
    root.classList.toggle('is-touch', window.matchMedia('(hover: none)').matches);
    // First-paint hold (0.9.0): [data-hold] stays invisible until MCO.ready();
    // this timeout releases it anyway, so a failed script never strands a page.
    root.classList.add('mco-booting');
    setTimeout(function () { root.classList.remove('mco-booting'); }, 3000);
  })();
