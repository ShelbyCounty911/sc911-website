import { BODIES, T } from './strings.js';
import { esc, escLines, formatDate, formatTimeRange, tileParts, chicagoYear, chicagoDayKey } from './format.js';

// A meeting as rendered: plain object built from a D1 row by rowToMeeting().
// { itemId, body, status, start, end, firstStart, noticePosted, locationName, locationAddress,
//   onlineUrl, recordingUrl, noteEn, noteEs, files: [{ role, name, url }] }

export function rowToMeeting(row) {
  return {
    itemId: row.item_id,
    body: row.body,
    status: row.status,
    start: row.start_utc,
    end: row.end_utc,
    firstStart: row.first_start_utc,
    noticePosted: row.notice_posted_utc,
    locationName: row.location_name,
    locationAddress: row.location_address,
    onlineUrl: row.online_url,
    recordingUrl: row.recording_url,
    noteEn: row.note_en,
    noteEs: row.note_es,
    files: JSON.parse(row.files_json || '[]'),
  };
}

/** Split meetings into upcoming (not yet ended) and past, each sorted for display. */
export function partition(meetings, now = new Date()) {
  const t = now.getTime();
  const upcoming = meetings.filter((m) => Date.parse(m.end) > t).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const past = meetings.filter((m) => Date.parse(m.end) <= t).sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
  return { upcoming, past };
}

function bodyLabel(m, lang) {
  return BODIES[m.body]?.[lang] ?? m.body;
}

function note(m, lang) {
  return lang === 'es' ? m.noteEs || m.noteEn : m.noteEn;
}

/** Display name for a supporting file: "2027-02-04-Budget-Draft.pdf" -> "2027 02 04 Budget Draft". */
export function fileLabel(name) {
  return String(name).replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
}

function fileLink(file, text, lang) {
  return `<a href="${esc(file.url)}">${esc(text)} ${esc(T[lang].pdf)}</a>`;
}

/** One upcoming meeting card, matching the static .meeting-card markup. */
export function renderCard(m, lang) {
  const t = T[lang];
  const tile = tileParts(m.start, lang);
  const canceled = m.status === 'Canceled';
  const moved = m.status === 'Rescheduled' && m.firstStart && chicagoDayKey(m.firstStart) !== chicagoDayKey(m.start);
  // The agenda arrives with the other meeting materials, so the card has one "Meeting materials" list.
  const materials = m.files.filter((f) => f.role === 'materials');

  const online = m.onlineUrl && !canceled
    ? `<p>${esc(t.onlineReady)}</p><a class="button secondary" href="${esc(m.onlineUrl)}">${esc(t.onlineButton)}</a>`
    : `<p>${esc(t.onlinePending)}</p><span class="awaiting">${esc(t.onlinePendingTag)}</span>`;

  const locationName = m.locationName || t.defaultLocationName;
  const locationAddress = m.locationAddress ?? (m.locationName ? '' : t.defaultLocationAddress);

  const bottom = [
    canceled ? `<p><strong>${esc(t.canceledBottom)}</strong></p>` : '',
    note(m, lang) ? `<p>${escLines(note(m, lang))}</p>` : '',
    !canceled && !note(m, lang) ? `<p>${esc(t.defaultBottom)}</p>` : '',
    m.noticePosted ? `<p class="meta">${esc(t.noticePosted(formatDate(m.noticePosted, lang)))}</p>` : '',
  ].join('');

  return `<article class="meeting-card upcoming-card${canceled ? ' is-canceled' : ''}" id="meeting-${m.itemId}">`
    + `<div class="card-heading"><div><p class="card-status">${esc(t.status[m.status])}</p>`
    + `<h2>${esc(bodyLabel(m, lang))}</h2>`
    + `<p class="card-date">${esc(formatDate(m.start, lang))}</p>`
    + `<p class="card-time">${esc(formatTimeRange(m.start, m.end, lang))}</p>`
    + (moved ? `<p class="card-moved">${esc(t.rescheduledFrom(formatDate(m.firstStart, lang)))}</p>` : '')
    + `</div><div class="date-tile" aria-hidden="true"><span>${esc(tile.month)}</span><strong>${tile.day}</strong><small>${tile.year}</small></div></div>`
    + `<div class="attendance-grid">`
    + `<section><p class="card-label">${esc(t.attendInPerson)}</p><h3>${esc(locationName)}</h3>${locationAddress ? `<p>${escLines(locationAddress)}</p>` : ''}</section>`
    + `<section><p class="card-label">${esc(t.attendOnline)}</p><h3>${esc(t.onlineTitle)}</h3>${online}</section>`
    + `</div>`
    + `<div class="documents-strip">`
    + `<div><h3>${esc(t.materials)}</h3>${materials.length
      ? `<ul>${materials.map((f) => `<li>${fileLink(f, fileLabel(f.name), lang)}</li>`).join('')}</ul>`
      : `<p>${esc(t.notPostedPlural)}</p>`}</div>`
    + `</div>`
    + `<div class="card-bottom">${bottom}</div>`
    + `</article>`;
}

/** Inner HTML for .upcoming-stack and the text for the schedule eyebrow. */
export function renderUpcoming(upcoming, lang) {
  const t = T[lang];
  if (!upcoming.length) {
    return { eyebrow: t.noneHeading, stack: `<div class="notice"><p>${esc(t.noneText)}</p></div>` };
  }
  const years = [...new Set(upcoming.map((m) => chicagoYear(m.start)))];
  const yearText = years.length > 1 ? `${years[0]}–${years[years.length - 1]}` : `${years[0]}`;
  const nextIndex = upcoming.findIndex((m) => m.status !== 'Canceled');
  const stack = upcoming
    .map((m, i) => `<div>${i === nextIndex ? `<p class="next-label">${esc(t.nextLabel)}</p>` : ''}${renderCard(m, lang)}</div>`)
    .join('');
  return { eyebrow: `${yearText} · ${t.upcomingCount(upcoming.length)}`, stack };
}

/** One archive row, matching the static .meeting-record markup. */
export function renderRecord(m, lang) {
  const t = T[lang];
  const minutes = m.files.find((f) => f.role === 'minutes');
  const materials = m.status === 'Canceled' ? [] : m.files.filter((f) => f.role === 'materials');
  // Executive Committee minutes are not posted in this collection, so only Board meetings show "pending".
  const status = m.status === 'Canceled' ? t.recordStatus.canceled
    : minutes ? t.recordStatus.approved
    : m.body === 'Executive Committee' ? ''
    : t.recordStatus.pending;
  const links = [
    minutes ? `<a href="${esc(minutes.url)}">${esc(t.minutesLink)}</a>` : '',
    ...materials.map((f) => `<a href="${esc(f.url)}">${esc(fileLabel(f.name))} ${esc(t.pdf)}</a>`),
    m.recordingUrl ? `<a class="video-link" href="${esc(m.recordingUrl)}"><span aria-hidden="true">▷ </span>${esc(t.watch)}</a>` : '',
  ].join('');
  return `<article class="meeting-record" id="meeting-${m.itemId}"><div>`
    + `<p class="meeting-type">${esc(bodyLabel(m, lang))}</p>`
    + `<h3>${esc(formatDate(m.start, lang))}</h3>`
    + (status ? `<p class="record-status">${esc(status)}</p>` : '')
    + `</div>${links ? `<div class="record-links">${links}</div>` : ''}</article>`;
}

/**
 * The fiscal-year audit block, matching the static .year-audit markup.
 * audit: { year, url, size } (url null = not yet posted).
 */
export function renderAudit(audit, lang) {
  const t = T[lang];
  const kb = audit.size ? (audit.size >= 1048576 ? `${(audit.size / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(audit.size / 1024))} KB`) : null;
  const action = audit.url
    ? `<a href="${esc(audit.url)}">${esc(t.auditLink)}${kb ? ` <span class="file-meta">${esc(t.fileMeta(kb))}</span>` : ''}</a>`
    : `<p class="audit-pending">${esc(t.auditPending)}</p>`;
  return `<section class="year-audit"><div><p class="meeting-type">${esc(t.auditType)}</p>`
    + `<h3>${esc(t.auditTitle(audit.year))}</h3><p>${esc(t.auditPeriod(audit.year))}</p></div>${action}</section>`;
}

/** Group past meetings by Central-time year, newest year first. */
export function groupByYear(past) {
  const map = new Map();
  for (const m of past) {
    const y = chicagoYear(m.start);
    if (!map.has(y)) map.set(y, []);
    map.get(y).push(m);
  }
  return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
}

/** Update a year summary like "10 meeting records · 5 recordings" with extra published records. */
export function bumpYearDescription(text, meetings, lang) {
  const t = T[lang];
  const addRecords = meetings.length;
  const addRecordings = meetings.filter((m) => m.recordingUrl).length;
  const parts = text.trim().split(/\s*·\s*/);
  const recordsAt = parts.findIndex((p) => /^\d+\s/.test(p) && !new RegExp(t.recordingsWord).test(p));
  if (recordsAt >= 0) parts[recordsAt] = t.yearRecords(Number(parts[recordsAt].match(/^\d+/)[0]) + addRecords);
  else parts.unshift(t.yearRecords(addRecords));
  const recordingsAt = parts.findIndex((p) => new RegExp(`^\\d+\\s+${t.recordingsWord}$`).test(p));
  if (recordingsAt >= 0) parts[recordingsAt] = t.yearRecordings(Number(parts[recordingsAt].match(/^\d+/)[0]) + addRecordings);
  else if (addRecordings) parts.push(t.yearRecordings(addRecordings));
  return parts.join(' · ');
}

/** A complete year section for a year the static archive doesn't have (meetings and/or that year's audit). */
export function renderYearSection(year, meetings, lang, audit = null) {
  const t = T[lang];
  const recordings = meetings.filter((m) => m.recordingUrl).length;
  const desc = meetings.length
    ? t.yearRecords(meetings.length) + (recordings ? ` · ${t.yearRecordings(recordings)}` : '')
    : t.auditTitle(year);
  return `<details class="records-year" id="year-${year}" open><summary>`
    + `<span class="year-number">${year}</span><span class="year-description">${esc(desc)}</span>`
    + `<span class="year-toggle" aria-hidden="true"></span></summary>`
    + `<div class="year-body"><div class="year-heading"><h2>${esc(t.meetingsHeading)}</h2>`
    + `<a href="#year-${year}">${esc(t.yearLink(year))}</a></div>`
    + meetings.map((m) => renderRecord(m, lang)).join('')
    + (audit ? renderAudit(audit, lang) : '')
    + `</div></details>`;
}
