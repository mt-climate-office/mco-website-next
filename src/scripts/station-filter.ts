// Filter for the station directory (/mesonet/stations/). The table is
// complete without this script, and the filter field is not shown without
// scripts at all (index.astro). This only hides rows that do not match.
//
// Matching is the kit's MCO.searchModel (case-, accent- and apostrophe-blind,
// with the kit's typo tolerance), so the directory finds what the tools'
// station search finds. MCO.initSearchBox is a combobox for picking one item,
// not a filter over a table, so only the model is used here.
//
// The query is mirrored to ?q= (HOUSE-STYLE §4: read once at boot, validate,
// mirror on every change), so a filtered list can be shared.

declare const MCO: any;
export {};

const box = document.getElementById('station-filter');
const input = document.getElementById('station-q') as HTMLInputElement | null;
const countEl = document.getElementById('station-count');
const rows = [...document.querySelectorAll<HTMLTableRowElement>('#station-table tbody tr[data-id]')];

if (box && input && countEl && rows.length) {
  const items = rows.map((tr) => ({
    id: tr.dataset.id!,
    label: tr.querySelector('th')?.textContent?.trim() ?? '',
    keywords: (tr.dataset.keywords || '').split('|').filter(Boolean),
    row: tr,
  }));
  const total = items.length;
  const noun = (n: number) => (n === 1 ? 'station' : 'stations');
  let announceTimer: ReturnType<typeof setTimeout> | undefined;

  const apply = (announce: boolean) => {
    const q = input.value.trim();
    const shown = q ? new Set(MCO.searchModel.filter(items, q, total).flat.map((it: { id: string }) => it.id)) : null;
    for (const it of items) it.row.hidden = shown != null && !shown.has(it.id);
    const n = shown ? shown.size : total;
    const text = !shown ? `${total} ${noun(total)}`
      : n === 0 ? 'No stations match'
      : `${n} of ${total} ${noun(total)}`;
    countEl.textContent = text;
    if (announce) {
      clearTimeout(announceTimer);
      announceTimer = setTimeout(() => MCO.announce(text), 400);
    }
  };

  const mirror = () => {
    const params = MCO.urlParams();
    const q = input.value.trim();
    if (q) params.set('q', q);
    else params.delete('q');
    MCO.replaceUrlState(params, { keepHash: true });
  };

  // Validate the boot value: a bounded plain string.
  const initial = (MCO.urlParams().get('q') || '').trim().slice(0, 80);
  input.value = initial;
  apply(false);

  input.addEventListener('input', () => {
    apply(true);
    mirror();
  });
}
