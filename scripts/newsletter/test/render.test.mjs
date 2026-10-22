// Newsletter renderer tests. No network, no secrets: `npm run test:newsletter`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { CANONICAL_ORIGIN } from '../../../astro.config.mjs';
import { newsPath, newsSlug } from '../../../src/lib/news.ts';
import { absolutize, markSent, parsePost, renderPost, sendDecision } from '../render.mjs';

const FIXTURE = new URL('./fixtures/2026-10-01-october-drought-update.md', import.meta.url).pathname;
const rendered = await renderPost(FIXTURE);
const html = rendered.html;
const attrs = (name) => [...html.matchAll(new RegExp(`\\s${name}="([^"]*)"`, 'g'))].map((m) => m[1]);

test('post URL is /news/<slug>/ on the production origin', () => {
  assert.equal(rendered.slug, 'october-drought-update');
  assert.equal(rendered.url, `${CANONICAL_ORIGIN}/news/october-drought-update/`);
  assert.equal(rendered.campaignName, 'news/october-drought-update');
  assert.equal(newsSlug('2026-10-01-x.md', 'custom'), 'custom');
  assert.equal(newsPath('a b'), 'news/a%20b/');
});

test('subject and preheader come from title and summary', () => {
  assert.equal(rendered.subject, 'Montana Drought & Climate, October update');
  assert.match(html, /September precipitation, the U\.S\. Drought Monitor/);
});

test('unsubscribe placeholder survives MJML', () => {
  assert.ok(attrs('href').includes('{{ UnsubscribeURL }}'));
});

test('footer carries the Franke postal address', () => {
  assert.match(html, /W\.A\. Franke College of Forestry &amp; Conservation/);
  assert.match(html, /University of Montana, Missoula, MT 59812/);
});

test('no glyphs or words VOICE.md bans', () => {
  assert.doesNotMatch(html, /[→▶►➜➔]/u);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
  assert.doesNotMatch(html, /\b(deliver|provide|leverage|empower|facilitate|utilize|seamless)\b/i);
});

test('every link and image is absolute; site links point at the production origin', () => {
  const urls = [...attrs('href'), ...attrs('src')]
    .filter((u) => u !== '{{ UnsubscribeURL }}' && !u.startsWith('mailto:'));
  for (const u of urls) assert.match(u, /^https:\/\//, `not absolute: ${u}`);
  assert.ok(urls.includes(`${CANONICAL_ORIGIN}/drought/`));
  assert.ok(urls.includes(`${CANONICAL_ORIGIN}/images/news/dillon-north.jpg`));
  assert.ok(urls.includes(rendered.url));
});

test('iframes become a banner link; scripts are dropped', () => {
  assert.doesNotMatch(html, /<iframe|alert\(1\)/i);
  assert.ok(attrs('src').includes(`${CANONICAL_ORIGIN}/images/news/october-hero.jpg`));
  assert.match(html, /View the interactive version on /);
});

test('relative image paths are refused, not guessed', () => {
  assert.throws(() => absolutize('./photo.jpg'), /relative URL/);
  assert.equal(absolutize('/a/'), `${CANONICAL_ORIGIN}/a/`);
});

test('send rule: pending, not draft, not future-dated', () => {
  const base = { title: 't', date: '2026-10-01', email: 'pending', draft: false };
  assert.equal(sendDecision(base, '2026-10-22').send, true);
  assert.equal(sendDecision({ ...base, email: 'sent' }, '2026-10-22').send, false);
  assert.equal(sendDecision({ ...base, email: undefined }, '2026-10-22').send, false);
  assert.equal(sendDecision({ ...base, draft: true }, '2026-10-22').send, false);
  assert.equal(sendDecision({ ...base, date: '2026-10-23' }, '2026-10-22').send, false);
  assert.equal(sendDecision({ ...base, date: new Date('2026-10-01') }, '2026-10-22').send, true);
});

test('markSent flips only the front-matter flag', () => {
  const src = readFileSync(FIXTURE, 'utf8');
  const out = markSent(src);
  assert.match(out, /^email: sent   # flipped to sent by the workflow$/m);
  assert.equal(parsePost(out).data.email, 'sent');
  assert.equal(parsePost(out).body, parsePost(src).body);
  assert.equal(markSent('---\nemail: "pending"\n---\nemail: pending\n'), '---\nemail: sent\n---\nemail: pending\n');
});
