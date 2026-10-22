// Site search on /search/, driven by Pagefind's JS API. Pagefind's own UI
// and its CSS are not used; the field is the kit's .mco-search and results
// are plain links styled in site.css.
//
// Nothing from Pagefind loads until the first query: pagefind.js, its wasm
// and index chunks are fetched from <base>pagefind/ on demand. The CSP for
// this page allows that (src/kit/csp.ts, `search`).

declare const MCO: any;

interface PagefindResult {
  id: string;
  data(): Promise<{ url: string; excerpt: string; meta: { title?: string } }>;
}
interface Pagefind {
  options(o: Record<string, unknown>): Promise<void>;
  init(): Promise<void>;
  search(q: string): Promise<{ results: PagefindResult[] } | null>;
}

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const PAGE_SIZE = 10;

const form = document.querySelector<HTMLFormElement>('.site-search-form')!;
const input = document.getElementById('search-q') as HTMLInputElement;
const status = document.getElementById('search-status')!;
const list = document.getElementById('search-results') as HTMLOListElement;
const more = document.getElementById('search-more') as HTMLButtonElement;

let pagefind: Promise<Pagefind> | null = null;
function loadPagefind(): Promise<Pagefind> {
  if (pagefind) return pagefind;
  pagefind = (async () => {
    const pf: Pagefind = await import(/* @vite-ignore */ `${BASE}pagefind/pagefind.js`);
    // Result URLs in the index are relative to the site root; the base path
    // makes them right under a project-pages or verify base.
    await pf.options({ baseUrl: BASE, excerptLength: 30 });
    await pf.init();
    return pf;
  })();
  pagefind.catch(() => { pagefind = null; });   // a later query retries
  return pagefind;
}

// Pagefind's excerpt is HTML with <mark> around matches. Keep the text and
// the marks and nothing else, so no markup from the index reaches the page.
function excerptNodes(html: string): Node[] {
  const doc = new DOMParser().parseFromString(`<p>${html}</p>`, 'text/html');
  const out: Node[] = [];
  doc.body.firstElementChild?.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out.push(document.createTextNode(n.textContent || ''));
    else if (n.nodeName === 'MARK') {
      const m = document.createElement('mark');
      m.textContent = n.textContent;
      out.push(m);
    } else out.push(document.createTextNode(n.textContent || ''));
  });
  return out;
}

const quoted = (q: string) => `“${q}”`;
const countText = (n: number, q: string) =>
  n === 0 ? `No results for ${quoted(q)}.`
    : `${n} ${n === 1 ? 'result' : 'results'} for ${quoted(q)}.`;

function setStatus(text: string) {
  status.textContent = text;
  status.hidden = !text;
  if (text) MCO.announce(text);
}

let results: PagefindResult[] = [];
let shown = 0;
let seq = 0;

async function renderMore(): Promise<HTMLAnchorElement | null> {
  const mine = seq;
  const batch = results.slice(shown, shown + PAGE_SIZE);
  const data = await Promise.all(batch.map((r) => r.data()));
  if (mine !== seq) return null;   // a newer query replaced this one
  let first: HTMLAnchorElement | null = null;
  for (const d of data) {
    const li = document.createElement('li');
    li.className = 'site-search-result';
    const h = document.createElement('h2');
    h.className = 'site-search-result-title';
    const a = document.createElement('a');
    a.href = d.url;
    a.textContent = d.meta.title || d.url;
    h.append(a);
    const p = document.createElement('p');
    p.className = 'site-search-excerpt';
    p.append(...excerptNodes(d.excerpt));
    li.append(h, p);
    list.append(li);
    first ??= a;
  }
  shown += batch.length;
  list.hidden = shown === 0;
  more.hidden = shown >= results.length;
  return first;
}

async function run(q: string) {
  const mine = ++seq;
  results = [];
  shown = 0;
  list.textContent = '';
  list.hidden = true;
  more.hidden = true;
  if (!q) { setStatus('Type a word or phrase to search.'); return; }
  status.textContent = 'Searching…';
  status.hidden = false;
  try {
    const pf = await loadPagefind();
    const res = await pf.search(q);
    if (mine !== seq) return;
    results = res?.results ?? [];
    await renderMore();
    if (mine !== seq) return;
    setStatus(countText(results.length, q));
  } catch {
    if (mine !== seq) return;
    setStatus('Search is not available right now. The sections below are another way in.');
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  const params = MCO.urlParams();
  if (q) params.set('q', q); else params.delete('q');
  MCO.replaceUrlState(params);
  run(q);   // focus stays in the field, so the query can be refined
});

more.addEventListener('click', async () => {
  // Focus moves to the first new result, so keyboard users continue there.
  const first = await renderMore();
  if (first) first.focus();
  MCO.announce(`Showing ${shown} of ${results.length} results.`);
});

// Start loading the engine once someone shows intent to search.
input.addEventListener('focus', () => { loadPagefind().catch(() => {}); }, { once: true });

const initial = (MCO.urlParams().get('q') || '').trim();
if (initial) {
  input.value = initial;
  run(initial);
}
