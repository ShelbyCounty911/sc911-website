// RSS 2.0 feeds for meetings, trainings, 9-1-1 center jobs and RFPs, plus a combined site feed at /feed/.
// Items come from the same published EmDash entries as the pages. Links are absolute, built from the
// request origin, so the feeds work on the test site and on shelbycounty911.org.
import { getEmDashCollection } from 'emdash';
import { BODIES } from './strings.js';
import { esc, escLines, formatDate, formatTimeRange, chicagoParts } from './format.js';
import { entryToMeeting } from './meetings.js';
import { upcomingTrainings, currentJobs, sortRfps, fileUrl, formatShortDate } from './listings.js';

const SITE = 'Shelby County, TN Emergency Communications District';
const RECENT_MS = 365 * 864e5;

const iso = (v) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const updated = (e) => iso(e.data.updatedAt) ?? iso(e.data.publishedAt) ?? new Date(0).toISOString();
const abs = (origin, url) => (url && url.startsWith('/') ? `${origin}${url}` : url);
const https = (u) => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const list = (items) => (items.length ? `<ul>${items.map((i) => `<li>${i}</li>`).join('')}</ul>` : '');

// ---------- items ----------

function meetingItems(entries, locals, origin, now = Date.now()) {
  return entries
    .map((e) => ({ e, m: entryToMeeting(e, locals) }))
    .filter(({ m }) => m.start && m.end && Date.parse(m.end) > now - RECENT_MS)
    .map(({ e, m }) => {
      const body = BODIES[m.body]?.en ?? m.body;
      const status = m.status === 'Canceled' ? ' (canceled)' : m.status === 'Rescheduled' ? ' (rescheduled)' : '';
      const upcoming = Date.parse(m.end) > now;
      const where = m.locationName || 'District office';
      const files = m.files.map((f) =>
        link(abs(origin, f.url), f.role === 'minutes' ? 'Minutes (PDF)' : `${f.name} (PDF)`),
      );
      if (m.materialsUrl && m.status !== 'Canceled') files.unshift(link(m.materialsUrl, 'Meeting materials'));
      if (m.recordingUrl) files.push(link(m.recordingUrl, 'Recording'));
      if (m.onlineUrl && upcoming && m.status !== 'Canceled') files.push(link(m.onlineUrl, 'Join online'));
      let html = `<p>${esc(formatDate(m.start, 'en'))}, ${esc(formatTimeRange(m.start, m.end, 'en'))} Central time. ${esc(where)}.</p>`;
      if (m.noteEn) html += `<p>${escLines(m.noteEn)}</p>`;
      html += list(files);
      return {
        kind: 'Meeting',
        title: `${body} meeting, ${formatDate(m.start, 'en')}${status}`,
        link: `${origin}${upcoming ? '/meetings/' : '/records/'}`,
        guid: `meeting-${e.id}`,
        date: updated(e),
        html,
      };
    });
}

function trainingItems(entries, origin) {
  return upcomingTrainings(entries).map(({ e, start, end }) => {
    const d = e.data;
    const canceled = d.training_status === 'Canceled' ? ' (canceled)' : '';
    const when = d.kind === 'Conference'
      ? `${formatDate(start, 'en')} – ${formatDate(end, 'en')}`
      : `${formatDate(start, 'en')}, ${formatTimeRange(start, end, 'en')} Central time`;
    let html = `<p>${esc(when)}${d.location ? `. ${escLines(d.location).replace(/<br>/g, ', ')}` : ''}.</p>`;
    if (d.organizer) html += `<p>${esc(d.organizer)}</p>`;
    if (d.description_en) html += `<p>${escLines(d.description_en)}</p>`;
    if (https(d.registration_url) && !canceled) html += `<p>${link(d.registration_url, 'Registration and event information')}</p>`;
    return {
      kind: 'Training',
      title: `${d.title}${canceled}`,
      link: `${origin}/training/`,
      guid: `training-${e.id}`,
      date: updated(e),
      html,
    };
  });
}

function jobItems(entries, origin) {
  return currentJobs(entries).map(({ e, closing }) => {
    const d = e.data;
    const terms = [d.pay_en, d.employment_type, d.location].filter(Boolean).join(' · ');
    const when = closing ? `Apply by ${formatShortDate(closing, 'en')}.` : d.continuous ? 'Continuous posting.' : '';
    let html = `<p>Hiring agency: ${esc(d.agency)}. Not a District job; apply directly with the agency.</p>`;
    if (terms) html += `<p>${esc(terms)}</p>`;
    if (d.summary_en) html += `<p>${escLines(d.summary_en)}</p>`;
    if (when) html += `<p>${esc(when)}</p>`;
    const links = [https(d.apply_url) && link(d.apply_url, 'Apply'), https(d.info_url) && link(d.info_url, d.info_label_en || 'More information')].filter(Boolean);
    html += list(links);
    return {
      kind: 'Job',
      title: `${d.title}, ${d.agency}`,
      link: `${origin}/careers/#psap-jobs`,
      guid: `job-${e.id}`,
      date: updated(e),
      html,
    };
  });
}

function rfpItems(entries, locals, origin) {
  const { open, recent } = sortRfps(entries);
  const time = (v) => { const p = chicagoParts(v); return `${formatDate(v, 'en')} at ${p.hour}:${p.minute} ${p.pm ? 'p.m.' : 'a.m.'}`; };
  return [...open.map((r) => ({ r, isOpen: true })), ...recent.map((r) => ({ r, isOpen: false }))].map(({ r, isOpen }) => {
    const d = r.e.data;
    const status = isOpen ? 'Open' : d.rfp_status === 'Open' ? 'Closed' : d.rfp_status;
    const dates = [
      r.issued && `Issued ${formatDate(r.issued, 'en')}`,
      r.questions && isOpen && `Questions due ${time(r.questions)}`,
      r.due && `Proposals due ${time(r.due)} Central time`,
    ].filter(Boolean);
    let html = `<p>${esc(dates.join(' · '))}</p>`;
    if (d.summary_en) html += `<p>${escLines(d.summary_en)}</p>`;
    if (d.contact) html += `<p>Contact: ${escLines(d.contact)}</p>`;
    const docs = [];
    const add = (f, label) => { const u = fileUrl(f, locals); if (u) docs.push(link(abs(origin, u), `${label} (PDF)`)); };
    add(d.solicitation, 'Solicitation');
    for (let n = 1; n <= 3; n++) add(d[`addendum_${n}`], `Addendum ${n}`);
    add(d.award_notice, 'Award notice');
    html += list(docs);
    return {
      kind: 'RFP',
      title: `${d.number ? `${d.number}: ` : ''}${d.title} (${status})`,
      link: `${origin}/rfps/`,
      guid: `rfp-${r.e.id}`,
      date: updated(r.e),
      html,
    };
  });
}

// ---------- feeds ----------

export const FEEDS = {
  meetings: { collections: ['meetings'], title: 'Meetings', page: '/meetings/', description: 'Board of Directors and Executive Committee meetings: notices, meeting materials and minutes.' },
  trainings: { collections: ['trainings'], title: 'Training and conferences', page: '/training/', description: 'Upcoming training and conferences for emergency communications professionals.' },
  jobs: { collections: ['psap_jobs'], title: 'Jobs at 9-1-1 centers', page: '/careers/', description: "Telecommunicator jobs posted by the agencies that run Shelby County's 9-1-1 centers. These are not District jobs." },
  rfps: { collections: ['rfps'], title: 'RFPs', page: '/rfps/', description: 'District requests for proposals, addenda and awards.' },
  all: { collections: ['meetings', 'trainings', 'psap_jobs', 'rfps'], title: 'Updates', page: '/', description: 'Meetings, training, 9-1-1 center jobs and RFPs.' },
};

async function load(slug) {
  const { entries } = await getEmDashCollection(slug, { status: 'published', limit: 1000 });
  return entries;
}

/** Build the feed response for one of FEEDS' keys. */
export async function feedResponse(name, { url, locals }) {
  const feed = FEEDS[name];
  const origin = url.origin;
  const data = Object.fromEntries(await Promise.all(feed.collections.map(async (c) => [c, await load(c)])));
  let items = [
    ...(data.meetings ? meetingItems(data.meetings, locals, origin) : []),
    ...(data.trainings ? trainingItems(data.trainings, origin) : []),
    ...(data.psap_jobs ? jobItems(data.psap_jobs, origin) : []),
    ...(data.rfps ? rfpItems(data.rfps, locals, origin) : []),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  if (name === 'all') items = items.slice(0, 50);

  const self = `${origin}${url.pathname}`;
  const built = items[0]?.date ?? new Date().toISOString();
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    `<title>${esc(`${SITE}: ${feed.title}`)}</title>`,
    `<link>${esc(origin + feed.page)}</link>`,
    `<atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>`,
    `<description>${esc(feed.description)}</description>`,
    '<language>en-us</language>',
    `<lastBuildDate>${new Date(built).toUTCString()}</lastBuildDate>`,
    '<ttl>60</ttl>',
    ...items.map((i) => [
      '<item>',
      `<title>${esc(name === 'all' ? `${i.kind}: ${i.title}` : i.title)}</title>`,
      `<link>${esc(i.link)}</link>`,
      `<guid isPermaLink="false">${esc(i.guid)}</guid>`,
      `<pubDate>${new Date(i.date).toUTCString()}</pubDate>`,
      `<category>${esc(i.kind)}</category>`,
      `<description>${esc(i.html)}</description>`,
      '</item>',
    ].join('')),
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
    },
  });
}

