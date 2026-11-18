import test from 'node:test';
import assert from 'node:assert/strict';
import { esc, formatDate, formatTimeRange, tileParts } from '../src/format.js';
import { validateMeetingPublish, compareVersions, safeFileName } from '../src/validate.js';
import { partition, renderUpcoming, renderCard, renderRecord, bumpYearDescription, renderYearSection } from '../src/render.js';

const PDF_B64 = Buffer.from('%PDF-1.7\n%test\n').toString('base64');

function payload(overrides = {}, fieldOverrides = {}) {
  return {
    list: 'meetings',
    itemId: 42,
    version: '1.0',
    approvedBy: 'clerk@example.org',
    approvedAt: '2026-11-18T15:00:00Z',
    fields: {
      body: 'Executive Committee',
      start: '2026-11-23T16:00:00Z', // 10:00 a.m. CST
      end: '2026-11-23T17:00:00Z',
      status: 'Scheduled',
      ...fieldOverrides,
    },
    files: [],
    ...overrides,
  };
}

function meeting(over = {}) {
  return {
    itemId: 42, body: 'Executive Committee', status: 'Scheduled',
    start: '2026-11-23T16:00:00.000Z', end: '2026-11-23T17:00:00.000Z', firstStart: '2026-11-23T16:00:00.000Z',
    noticePosted: '2026-11-18T15:00:00.000Z', locationName: null, locationAddress: null,
    onlineUrl: null, recordingUrl: null, noteEn: null, noteEs: null, files: [], ...over,
  };
}

test('dates and times render in Central time, matching the static pages', () => {
  assert.equal(formatDate('2026-11-23T16:00:00Z', 'en'), 'November 23, 2026');
  assert.equal(formatDate('2026-11-23T16:00:00Z', 'es'), '23 de noviembre de 2026');
  assert.equal(formatTimeRange('2026-11-23T16:00:00Z', '2026-11-23T17:00:00Z', 'en'), '10:00–11:00 a.m.');
  assert.equal(formatTimeRange('2026-12-03T14:30:00Z', '2026-12-03T16:00:00Z', 'en'), '8:30–10:00 a.m.');
  assert.equal(formatTimeRange('2026-12-03T14:30:00Z', '2026-12-03T16:00:00Z', 'es'), '8:30–10:00 a. m.');
  assert.equal(formatTimeRange('2026-12-03T17:30:00Z', '2026-12-03T19:00:00Z', 'en'), '11:30 a.m.–1:00 p.m.');
  assert.deepEqual(tileParts('2026-12-03T14:30:00Z', 'es'), { month: 'DIC', day: 3, year: 2026 });
});

test('a late-evening UTC time stays on the correct Central date', () => {
  // 03:30 UTC on Jan 1 is still Dec 31 in Memphis.
  assert.equal(formatDate('2027-01-01T03:30:00Z', 'en'), 'December 31, 2026');
});

test('daylight saving time is handled (CDT vs CST)', () => {
  assert.equal(formatTimeRange('2027-06-03T13:30:00Z', '2027-06-03T15:00:00Z', 'en'), '8:30–10:00 a.m.');
});

test('escaping neutralizes HTML from staff text', () => {
  assert.equal(esc('<script>"x" & \'y\''), '&lt;script&gt;&quot;x&quot; &amp; &#39;y&#39;');
  const html = renderCard(meeting({ noteEn: '<img src=x onerror=alert(1)>' }), 'en');
  assert.ok(!html.includes('<img'));
  assert.ok(html.includes('&lt;img'));
});

test('valid payload passes and normalizes times to UTC', () => {
  const r = validateMeetingPublish(payload({}, { start: '2026-11-23T10:00:00-06:00', end: '2026-11-23T11:00:00-06:00' }));
  assert.equal(r.errors, undefined);
  assert.equal(r.record.start, '2026-11-23T16:00:00.000Z');
});

test('validation rejects bad input', () => {
  const cases = [
    [payload({ list: 'jobs' }), /list must be "meetings"/],
    [payload({ itemId: 0 }), /itemId/],
    [payload({ version: 'v2' }), /version/],
    [payload({ extra: 1 }), /Unknown property: extra/],
    [payload({}, { body: 'Finance Committee' }), /body must be one of/],
    [payload({}, { status: 'Deleted' }), /status must be one of/],
    [payload({}, { end: '2026-11-23T15:00:00Z' }), /end must be after start/],
    [payload({}, { end: '2026-11-24T16:00:00Z' }), /longer than 12 hours/],
    [payload({}, { start: '2026-11-23 10:00' }), /start must be an ISO 8601/],
    [payload({}, { onlineUrl: 'http://example.org/join' }), /onlineUrl must be an https/],
    [payload({}, { recordingUrl: 'javascript:alert(1)' }), /recordingUrl must be an https/],
    [payload({}, { color: 'red' }), /Unknown field: color/],
    [payload({ files: [{ role: 'agenda', name: 'a.pdf', contentType: 'application/pdf', base64: Buffer.from('<html>').toString('base64') }] }), /not a PDF/],
    [payload({ files: [{ role: 'agenda', name: 'a.doc', contentType: 'application/msword', base64: PDF_B64 }] }), /must be a PDF/],
    [payload({ files: [{ role: 'bylaws', name: 'a.pdf', contentType: 'application/pdf', base64: PDF_B64 }] }), /role must be/],
    [payload({ files: [1, 2].map(() => ({ role: 'agenda', name: 'a.pdf', contentType: 'application/pdf', base64: PDF_B64 })) }), /only one agenda/],
  ];
  for (const [p, re] of cases) {
    const r = validateMeetingPublish(p);
    assert.ok(r.errors, `expected errors for ${re}`);
    assert.ok(r.errors.some((e) => re.test(e)), `expected ${re} in ${JSON.stringify(r.errors)}`);
  }
});

test('file names are made safe', () => {
  assert.equal(safeFileName('C:\\Users\\clerk\\Board Agenda (Final).PDF'), 'Board-Agenda-Final.pdf');
  assert.equal(safeFileName('../../etc/passwd'), 'passwd.pdf');
  assert.equal(safeFileName(''), 'document.pdf');
});

test('versions compare numerically', () => {
  assert.ok(compareVersions('10.0', '9.0') > 0);
  assert.ok(compareVersions('2.1', '2.0') > 0);
  assert.equal(compareVersions('3', '3.0'), 0);
});

test('upcoming vs past split uses the end time', () => {
  const now = new Date('2026-11-23T16:30:00Z'); // during the meeting
  const { upcoming, past } = partition([meeting(), meeting({ itemId: 7, start: '2026-10-01T13:30:00Z', end: '2026-10-01T15:00:00Z' })], now);
  assert.deepEqual(upcoming.map((m) => m.itemId), [42]);
  assert.deepEqual(past.map((m) => m.itemId), [7]);
});

test('upcoming list: count heading, next label skips canceled meetings', () => {
  const ms = [
    meeting({ itemId: 1, status: 'Canceled' }),
    meeting({ itemId: 2, body: 'Board of Directors', start: '2026-12-03T14:30:00Z', end: '2026-12-03T16:00:00Z' }),
  ];
  const { eyebrow, stack } = renderUpcoming(ms, 'en');
  assert.equal(eyebrow, '2026 · 2 UPCOMING MEETINGS');
  assert.ok(stack.indexOf('NEXT MEETING') > stack.indexOf('id="meeting-1"'));
  assert.ok(stack.includes('class="meeting-card upcoming-card is-canceled" id="meeting-1"'));
  assert.ok(stack.includes('This meeting has been canceled.'));
  assert.equal(renderUpcoming([], 'es').eyebrow, 'NO HAY REUNIONES PROGRAMADAS');
});

test('rescheduled meeting shows the original date', () => {
  const html = renderCard(meeting({ status: 'Rescheduled', firstStart: '2026-11-20T14:30:00Z' }), 'en');
  assert.ok(html.includes('RESCHEDULED'));
  assert.ok(html.includes('Rescheduled from November 20, 2026'));
  const es = renderCard(meeting({ status: 'Rescheduled', firstStart: '2026-11-20T14:30:00Z' }), 'es');
  assert.ok(es.includes('REPROGRAMADA'));
  assert.ok(es.includes('20 de noviembre de 2026'));
});

test('card shows default District office, files, online link and notice date', () => {
  const html = renderCard(meeting({
    onlineUrl: 'https://teams.example/join',
    files: [
      { role: 'agenda', name: 'Agenda.pdf', url: '/files/meetings/42/0123456789abcdef-Agenda.pdf' },
      { role: 'materials', name: 'Budget-Draft.pdf', url: '/files/meetings/42/fedcba9876543210-Budget-Draft.pdf' },
    ],
  }), 'en');
  assert.ok(html.includes('<h3>District office</h3>'));
  assert.ok(html.includes('3150 Lenox Park Blvd., Suite 108<br>Memphis, TN 38115'));
  assert.ok(html.includes('href="https://teams.example/join"'));
  assert.ok(html.includes('>Agenda (PDF)</a>'));
  assert.ok(html.includes('>Budget Draft (PDF)</a>'));
  assert.ok(html.includes('Notice posted November 18, 2026.'));
});

test('Spanish card falls back to the English note when no Spanish note exists', () => {
  const html = renderCard(meeting({ noteEn: 'Room change: Suite 110' }), 'es');
  assert.ok(html.includes('Room change: Suite 110'));
  assert.ok(html.includes('Oficina del distrito'));
});

test('archive row status and links', () => {
  const withMinutes = renderRecord(meeting({ files: [{ role: 'minutes', name: 'm.pdf', url: '/files/x' }], recordingUrl: 'https://stream.example/v' }), 'es');
  assert.ok(withMinutes.includes('Actas aprobadas'));
  assert.ok(withMinutes.includes('Actas (PDF, inglés)'));
  assert.ok(withMinutes.includes('Ver grabación'));
  assert.ok(renderRecord(meeting(), 'en').includes('Minutes pending approval'));
  assert.ok(renderRecord(meeting({ status: 'Canceled' }), 'en').includes('>Canceled<'));
});

test('year summary counts are bumped, including Spanish and missing recordings part', () => {
  const one = [meeting({ recordingUrl: 'https://stream.example/v' })];
  assert.equal(bumpYearDescription('10 meeting records · 5 recordings', one, 'en'), '11 meeting records · 6 recordings');
  assert.equal(bumpYearDescription('10 registros de reuniones · 5 grabaciones', one, 'es'), '11 registros de reuniones · 6 grabaciones');
  assert.equal(bumpYearDescription('6 meeting records · Financial audit', one, 'en'), '7 meeting records · Financial audit · 1 recording');
  assert.equal(bumpYearDescription('6 meeting records', [meeting()], 'en'), '7 meeting records');
});

test('new year section matches the static archive markup', () => {
  const html = renderYearSection(2027, [meeting({ start: '2027-02-04T14:30:00Z', end: '2027-02-04T16:00:00Z' })], 'en');
  assert.ok(html.startsWith('<details class="records-year" id="year-2027" open>'));
  assert.ok(html.includes('<span class="year-description">1 meeting record</span>'));
  assert.ok(html.includes('<a href="#year-2027">Link to 2027</a>'));
});
