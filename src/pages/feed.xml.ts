// The old site's jekyll-feed address. Feed readers subscribed to it do not
// follow a meta refresh, so the news feed is built here too, unchanged
// (src/data/redirects.json, status 200). Items carry new links and GUIDs, so
// a reader shows the current posts once as new.
export { GET } from './news/rss.xml';
