// Filters for the publications list (/research/publications/). The list is
// complete without this script, and the filter chips are not shown without
// scripts at all (site.css). This only hides items that do not match.
//
// Kit chips, as on /mesonet/status/: aria-pressed drives their look
// (HOUSE-STYLE §5.7). Within a group, pressed chips are alternatives (2020
// or 2021); across groups, all must hold (2021 and Drought). None pressed in
// a group means that group does not filter.
//
// State is mirrored to the URL as comma lists (?year=2021,2020&topic=drought;
// HOUSE-STYLE §4: read once at boot, validate, mirror on every change), so a
// filtered list can be shared and a publication page can link to one. Count
// changes are announced (§5.1).

declare const MCO: any;
export {};

const $ = (id: string) => document.getElementById(id);

const list = $('pub-items');
const countEl = $('pub-count');
const empty = $('pub-empty');
const clear = $('pub-clear') as HTMLButtonElement | null;

if (list && countEl && empty && clear) {
  const items = [...list.querySelectorAll<HTMLLIElement>('li.pub-item')];
  const total = items.length;
  const groups = [...document.querySelectorAll<HTMLElement>('#pub-filters .mco-chips')].map((el) => ({
    key: el.dataset.key!,
    chips: [...el.querySelectorAll<HTMLButtonElement>('.mco-chip')],
    on: new Set<string>(),
  }));
  const noun = (n: number) => (n === 1 ? 'publication' : 'publications');

  // Boot: URL > none, unknown tokens dropped.
  const params = MCO.urlParams();
  for (const g of groups) {
    const known = new Set(g.chips.map((c) => c.dataset.value!));
    for (const v of MCO.splitTokens(params.get(g.key)) ?? []) if (known.has(v)) g.on.add(v);
  }

  const matches = (li: HTMLLIElement) => groups.every((g) => {
    if (!g.on.size) return true;
    const have = (li.dataset[g.key] || '').split(' ');
    return have.some((v) => g.on.has(v));
  });

  let text = '';
  const render = () => {
    let shown = 0;
    for (const li of items) {
      const on = matches(li);
      li.hidden = !on;
      if (on) shown++;
    }
    for (const g of groups) {
      for (const c of g.chips) c.setAttribute('aria-pressed', String(g.on.has(c.dataset.value!)));
    }
    const filtered = groups.some((g) => g.on.size);
    text = filtered ? `${shown} of ${total} ${noun(total)}` : `${total} ${noun(total)}`;
    countEl.textContent = text;
    empty.hidden = shown > 0;
    clear.hidden = !filtered;
  };

  const writeUrl = () => {
    const p = MCO.urlParams();
    for (const g of groups) {
      // Written in the chips' order, so the same filter is the same URL.
      const v = g.chips.map((c) => c.dataset.value!).filter((x) => g.on.has(x)).join(',');
      if (v) p.set(g.key, v);
      else p.delete(g.key);
    }
    MCO.replaceUrlState(p, { keepHash: true });
  };

  for (const g of groups) {
    for (const chip of g.chips) {
      chip.addEventListener('click', () => {
        const v = chip.dataset.value!;
        if (g.on.has(v)) g.on.delete(v);
        else g.on.add(v);
        render();
        writeUrl();
        MCO.announce(text);
      });
    }
  }

  clear.addEventListener('click', () => {
    for (const g of groups) g.on.clear();
    render();
    writeUrl();
    MCO.announce(text);
    // The button hides itself; keep focus on the filters, not the body.
    groups[0]?.chips[0]?.focus();
  });

  render();
}
