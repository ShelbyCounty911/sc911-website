// Turns the approved review pages (../site/pages + ../site/shared) into src/generated/static-pages.json,
// keyed by their new EmDash URL (see redirects/url-map.json). Links are rewritten to the new URLs and
// assets to root-relative paths, so the approved markup and CSS are served unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const site = path.resolve(root, '../site');
const map = JSON.parse(fs.readFileSync(path.join(root, 'redirects/url-map.json'), 'utf8'));

const urlFor = {};
for (const [file, url] of Object.entries(map.pages)) {
  urlFor[file] = url;
  urlFor[`es-${file}`] = url === '/' ? `${map.spanishPrefix}/` : `${map.spanishPrefix}${url}`;
}

const SECTIONS = ['using-911.html', 'meetings.html', 'training.html', 'resources.html'];
const SITE_NAME = 'Shelby County, TN Emergency Communications District';
const FEED_FOR = {
  'meetings.html': ['/meetings/feed.xml', 'Meetings'],
  'past-meetings.html': ['/meetings/feed.xml', 'Meetings'],
  'training.html': ['/training/feed.xml', 'Training and conferences'],
  'careers.html': ['/careers/feed.xml', 'Jobs at 9-1-1 centers'],
  'rfps.html': ['/rfps/feed.xml', 'RFPs'],
};
const sectionOf = (base) =>
  base === 'index.html' || base === '404.html' ? null : SECTIONS.includes(base) ? base : 'resources.html';

function rewriteUrl(value, page) {
  if (/^(https?:|mailto:|tel:|data:|#|\/)/i.test(value) || value === '') return value;
  const [p, hash] = value.split('#');
  if (p.endsWith('.html')) {
    const url = urlFor[p];
    if (!url) throw new Error(`${page}: link to ${p} has no new URL in redirects/url-map.json`);
    return hash ? `${url}#${hash}` : url;
  }
  return `/${p}${hash ? `#${hash}` : ''}`;
}

const pages = {};
for (const name of fs.readdirSync(path.join(site, 'pages')).filter((n) => n.endsWith('.html'))) {
  const es = name.startsWith('es-');
  const prefix = es ? 'es-' : '';
  const base = name.replace(/^es-/, '');
  const section = sectionOf(base);
  let header = fs.readFileSync(path.join(site, 'shared', `${es ? 'es' : 'en'}-header.html`), 'utf8');
  header = header.replace(/<a href="([^"]+)"[^>]*>/g, (tag, href) => {
    if (!SECTIONS.map((n) => prefix + n).includes(href)) return tag;
    const current = href === prefix + section ? ` aria-current="${base === section ? 'page' : 'location'}"` : '';
    return `<a href="${href}"${current}>`;
  });
  const footer = fs.readFileSync(path.join(site, 'shared', `${es ? 'es' : 'en'}-footer.html`), 'utf8');
  let html = fs.readFileSync(path.join(site, 'pages', name), 'utf8').replace('{{HEADER}}', header).replace('{{FOOTER}}', footer);
  html = html.replace(/<base [^>]*>/i, '');
  // The "REVIEW SITE" banner is for the public static review site; the EmDash site is behind sign-in until
  // launch and the banner must not reach production, so it is removed here (owner request 2026-11-20).
  html = html.replace(/<div class="review">[^<]*<\/div>/, '');
  // Review-only title endings become the District's name, like the pages that already use it.
  html = html.replace(/<title>([^<]*?) \| SC911 (?:Design|Content) Review<\/title>/, `<title>$1 | ${SITE_NAME}</title>`);
  html = html.replace(/\b(href|src)="([^"]*)"/g, (_, attr, v) => `${attr}="${rewriteUrl(v, name)}"`);
  const key = base === '404.html' ? (es ? 'es-404' : '404') : urlFor[name];
  if (!key) throw new Error(`${name} has no URL in redirects/url-map.json`);
  // RSS autodiscovery (feeds are English; see src/lib/feeds.js): the page's own feed, then the site feed.
  const feeds = [FEED_FOR[base], ['/feed/', 'Updates']].filter(Boolean);
  html = html.replace(
    '</head>',
    feeds.map(([href, title]) => `<link rel="alternate" type="application/rss+xml" title="${SITE_NAME}: ${title}" href="${href}">`).join('') + '</head>',
  );
  pages[key] = { lang: es ? 'es' : 'en', source: name, html };
}

fs.mkdirSync(path.join(root, 'src/generated'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/generated/static-pages.json'), JSON.stringify(pages));
console.log(`${Object.keys(pages).length} pages written to src/generated/static-pages.json`);
