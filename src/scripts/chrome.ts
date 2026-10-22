// Wires the site chrome to the kit (mco-core.js, a classic script loaded
// before this module runs). Use the kit's helpers; don't reimplement them.

declare const MCO: any;

const $ = (id: string) => document.getElementById(id);

// Theme: the kit's 3-state toggle (HOUSE-STYLE §4). ?theme= is mirrored only
// when it differs from the OS default, so share links stay clean.
MCO.initThemeToggle({
  button: $('btn-theme'),
  iconSun: $('icon-sun'),
  iconMoon: $('icon-moon'),
  iconContrast: $('icon-contrast'),
  cycle: true,
  onChange(theme: string) {
    const params = MCO.urlParams();
    if (theme === MCO.osTheme()) params.delete('theme');
    else params.set('theme', theme);
    MCO.replaceUrlState(params, { keepHash: true });
    MCO.announce(`Theme: ${theme.replace('-', ' ')}`);
  },
});

// Compact: the section links live in an off-canvas drawer. The kit's
// 'compact' mode docks the drawer as a column above compact, which suits a
// filter panel and not a navbar, so the drawer is modal at every width and
// CSS shows its toggle only on compact. Leaving compact closes it.
const drawer = MCO.initDrawer({
  drawer: $('site-drawer'),
  toggle: $('btn-menu'),
  scrim: $('site-scrim'),
  modal: 'always',
});
MCO.viewport.onChange(() => {
  if (!MCO.viewport.isCompact() && drawer.isOpen()) drawer.close({ restoreFocus: false });
});

MCO.ready();
