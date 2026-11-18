// sc911-website Worker.
//
// Static assets (public/) are served directly by Cloudflare for every path except the
// ones listed in wrangler.jsonc `assets.run_worker_first`. For those, this Worker:
//   POST /api/publish                 store an approved meeting pushed by Power Automate
//   GET  /files/*                     serve published PDFs from R2
//   GET  /(es-)meetings.html          static page with upcoming meeting cards filled from D1
//   GET  /(es-)past-meetings.html     static archive with published meetings added by year
// If D1 has no meetings yet, or can't be read, the static pages are served unchanged.

import { validateMeetingPublish, compareVersions } from './validate.js';
import { rowToMeeting, partition, renderUpcoming, renderRecord, groupByYear, bumpYearDescription, renderYearSection } from './render.js';

const PAGES = {
  '/meetings.html': { kind: 'upcoming', lang: 'en' },
  '/es-meetings.html': { kind: 'upcoming', lang: 'es' },
  '/past-meetings.html': { kind: 'past', lang: 'en' },
  '/es-past-meetings.html': { kind: 'past', lang: 'es' },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/publish') return await handlePublish(request, env, url);
      if (url.pathname.startsWith('/api/')) return json(404, { error: 'Not found' });
      if (url.pathname.startsWith('/files/')) return await serveFile(request, env, url);
      const page = PAGES[url.pathname];
      if (page && (request.method === 'GET' || request.method === 'HEAD')) return await servePage(request, env, page);
    } catch (err) {
      console.error('worker error', url.pathname, err?.stack || err);
      if (url.pathname.startsWith('/api/')) return json(500, { error: 'Internal error' });
    }
    return env.ASSETS.fetch(request);
  },
};

// ---------- publish ----------

async function handlePublish(request, env, url) {
  if (request.method === 'DELETE') {
    return json(405, { error: 'Meetings cannot be deleted from the public site. Set Status to Canceled instead.' });
  }
  if (request.method !== 'POST') return json(405, { error: 'Use POST' }, { Allow: 'POST' });
  if (!env.PUBLISH_TOKEN || !(await tokenMatches(request.headers.get('Authorization'), env.PUBLISH_TOKEN))) {
    return json(401, { error: 'Unauthorized' });
  }
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json(415, { error: 'Content-Type must be application/json' });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: 'Body is not valid JSON' });
  }
  const result = validateMeetingPublish(payload);
  if (result.errors) return json(400, { error: 'Validation failed', details: result.errors });
  const { record, files } = result;
  const now = new Date().toISOString();
  const pageUrl = `${url.origin}/meetings.html#meeting-${record.itemId}`;

  const existing = await env.DB.prepare('SELECT version, first_start_utc, notice_posted_utc FROM meetings WHERE item_id = ?')
    .bind(record.itemId).first();
  if (existing && compareVersions(record.version, existing.version) <= 0) {
    await log(env, record, now, 'unchanged');
    return json(200, { status: 'unchanged', url: pageUrl });
  }

  // Store files first. Keys are content-addressed, so re-sends don't duplicate and
  // published files are never overwritten (public records).
  const stored = [];
  for (const f of files) {
    const hash = await sha256Hex(f.bytes);
    const key = `meetings/${record.itemId}/${hash.slice(0, 16)}-${f.name}`;
    if (!(await env.FILES.head(key))) {
      await env.FILES.put(key, f.bytes, {
        httpMetadata: { contentType: 'application/pdf', contentDisposition: `inline; filename="${f.name}"` },
        customMetadata: { itemId: String(record.itemId), version: record.version, sha256: hash },
      });
    }
    stored.push({ role: f.role, name: f.name, url: `/files/${key}` });
  }

  const firstStart = existing?.first_start_utc ?? record.start;
  const noticePosted = existing?.notice_posted_utc ?? record.approvedAt;
  await env.DB.prepare(
    `INSERT INTO meetings (item_id, version, body, start_utc, end_utc, first_start_utc, status, notice_posted_utc,
       location_name, location_address, online_url, recording_url, note_en, note_es, files_json, approved_by, approved_at, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)
     ON CONFLICT(item_id) DO UPDATE SET
       version = excluded.version, body = excluded.body, start_utc = excluded.start_utc, end_utc = excluded.end_utc,
       status = excluded.status, location_name = excluded.location_name, location_address = excluded.location_address,
       online_url = excluded.online_url, recording_url = excluded.recording_url, note_en = excluded.note_en,
       note_es = excluded.note_es, files_json = excluded.files_json, approved_by = excluded.approved_by,
       approved_at = excluded.approved_at, updated_at = excluded.updated_at`,
  ).bind(
    record.itemId, record.version, record.body, record.start, record.end, firstStart, record.status, noticePosted,
    record.locationName, record.locationAddress, record.onlineUrl, record.recordingUrl, record.noteEn, record.noteEs,
    JSON.stringify(stored), record.approvedBy, record.approvedAt, now,
  ).run();

  await log(env, { ...record, files: stored }, now, existing ? 'updated' : 'created');
  return json(200, { status: existing ? 'updated' : 'created', url: pageUrl });
}

async function log(env, record, receivedAt, outcome) {
  await env.DB.prepare(
    `INSERT INTO publish_log (list, item_id, version, approved_by, approved_at, received_at, outcome, record_json)
     VALUES ('meetings', ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(record.itemId, record.version, record.approvedBy, record.approvedAt, receivedAt, outcome, JSON.stringify(record)).run();
}

async function tokenMatches(header, secret) {
  const given = (header || '').replace(/^Bearer\s+/i, '');
  // Compare fixed-length digests so the comparison time doesn't depend on the input.
  const [a, b] = await Promise.all([sha256Bytes(given), sha256Bytes(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 && given.length > 0;
}

async function sha256Bytes(input) {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

async function sha256Hex(bytes) {
  return [...(await sha256Bytes(bytes))].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------- files ----------

async function serveFile(request, env, url) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const key = decodeURIComponent(url.pathname.slice('/files/'.length));
  if (!/^meetings\/\d+\/[0-9a-f]{16}-[A-Za-z0-9._-]+\.pdf$/.test(key)) return notFound(request, env);
  const obj = await env.FILES.get(key);
  if (!obj) return notFound(request, env);
  const headers = baseHeaders(env);
  obj.writeHttpMetadata(headers);
  headers.set('Content-Type', 'application/pdf');
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  headers.set('ETag', obj.httpEtag);
  return new Response(request.method === 'HEAD' ? null : obj.body, { headers });
}

async function notFound(request, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/404.html', request.url)));
  return new Response(page.body, { status: 404, headers: withBase(page.headers, env) });
}

// ---------- pages ----------

async function servePage(request, env, page) {
  const asset = await env.ASSETS.fetch(request);
  if (!asset.ok) return asset;

  let meetings;
  try {
    const { results } = await env.DB.prepare('SELECT * FROM meetings').all();
    meetings = results.map(rowToMeeting);
  } catch (err) {
    console.error('meetings read failed; serving static page', err?.stack || err);
    return asset;
  }
  if (!meetings.length) return asset; // nothing published yet: static page is authoritative

  const { upcoming, past } = partition(meetings);
  const headers = withBase(asset.headers, env);
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  headers.delete('ETag');
  headers.delete('Content-Length');
  const plain = new Response(asset.body, { status: asset.status, headers });

  if (page.kind === 'upcoming') {
    const { eyebrow, stack } = renderUpcoming(upcoming, page.lang);
    return new HTMLRewriter()
      .on('.schedule-heading .eyebrow', { element: (el) => el.setInnerContent(eyebrow) })
      .on('.upcoming-stack', { element: (el) => el.setInnerContent(stack, { html: true }) })
      .transform(plain);
  }

  const byYear = groupByYear(past);
  let firstYearSeen = false;
  let currentYear = null;
  let descBuffer = '';
  return new HTMLRewriter()
    .on('details.records-year', {
      element(el) {
        const year = Number((el.getAttribute('id') || '').replace('year-', ''));
        if (!firstYearSeen) {
          firstYearSeen = true;
          // Years newer than anything in the static archive get a whole new section on top.
          const newer = [...byYear.entries()].filter(([y]) => y > year);
          if (newer.length) el.before(newer.map(([y, ms]) => renderYearSection(y, ms, page.lang)).join(''), { html: true });
        }
        currentYear = year;
      },
    })
    .on('details.records-year .year-description', {
      text(chunk) {
        const ms = byYear.get(currentYear);
        if (!ms) return;
        descBuffer += chunk.text;
        if (!chunk.lastInTextNode) return chunk.remove();
        chunk.replace(bumpYearDescription(descBuffer, ms, page.lang));
        descBuffer = '';
      },
    })
    .on('details.records-year .year-heading', {
      element(el) {
        const ms = byYear.get(currentYear);
        if (ms) el.after(ms.map((m) => renderRecord(m, page.lang)).join(''), { html: true });
      },
    })
    .transform(plain);
}

// ---------- helpers ----------

function baseHeaders(env) {
  const h = new Headers();
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (env.ROBOTS_TAG) h.set('X-Robots-Tag', env.ROBOTS_TAG);
  return h;
}

function withBase(headers, env) {
  const h = new Headers(headers);
  for (const [k, v] of baseHeaders(env)) h.set(k, v);
  return h;
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra },
  });
}
