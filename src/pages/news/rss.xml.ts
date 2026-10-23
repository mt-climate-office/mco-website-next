// RSS 2.0 feed of news posts: title, link, date and summary for each, newest
// first. Written by hand because it is a few lines and needs no dependency.
// Links point at the production host, as canonical URLs do (DECISIONS D2).
import type { APIRoute } from 'astro';
import { getNews } from '../../lib/news-posts';
import { newsPath } from '../../lib/news';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const GET: APIRoute = async () => {
  const origin = import.meta.env.MCO_CANONICAL_ORIGIN;
  const abs = (path: string) => new URL(path, origin + '/').href;
  const posts = await getNews();
  const items = posts.map(({ data, slug, category }) => {
    const link = abs(newsPath(slug));
    return [
      '    <item>',
      `      <title>${esc(data.title)}</title>`,
      `      <link>${link}</link>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <pubDate>${data.date.toUTCString()}</pubDate>`,
      `      <category>${esc(category)}</category>`,
      `      <description>${esc(data.summary)}</description>`,
      '    </item>',
    ].join('\n');
  });
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    '    <title>News · Montana Climate Office</title>',
    `    <link>${abs('news/')}</link>`,
    `    <atom:link href="${abs('news/rss.xml')}" rel="self" type="application/rss+xml"/>`,
    '    <description>Montana Drought &amp; Climate updates, event reports and announcements from the Montana Climate Office.</description>',
    '    <language>en-us</language>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
};
