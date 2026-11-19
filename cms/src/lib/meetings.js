// Adapts EmDash "meetings" entries to the meeting objects render.js expects, and injects them
// into the approved static Meetings / Meeting records pages.
import { partition, renderUpcoming, renderRecord, groupByYear, bumpYearDescription, renderYearSection } from './render.js';

// EmDash's datetime field edits and stores wall-clock time with a "Z" suffix (the admin does not
// convert to the editor's time zone). Staff type Central time, so read the stored clock fields as
// America/Chicago and convert to a real UTC instant.
const CHICAGO = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Chicago', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function chicagoOffsetMs(utcMs) {
  const p = Object.fromEntries(CHICAGO.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
export function centralWallToUtc(v) {
  if (!v) return null;
  const wall = (v instanceof Date ? v : new Date(String(v))).getTime();
  if (Number.isNaN(wall)) return null;
  let utc = wall - chicagoOffsetMs(wall);
  utc = wall - chicagoOffsetMs(utc); // second pass settles DST boundaries
  return new Date(utc).toISOString();
}
const iso = (v) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);

function fileUrl(file, locals) {
  if (!file) return null;
  const key = typeof file?.meta?.storageKey === 'string' ? file.meta.storageKey : undefined;
  if (key) return locals.emdash?.getPublicMediaUrl?.(key) ?? `/_emdash/api/media/file/${key}`;
  return file.provider === 'external' ? file.src : file.url ?? null;
}
const fileName = (file) => file?.filename || file?.meta?.filename || 'document.pdf';

export function entryToMeeting(entry, locals) {
  const d = entry.data;
  const files = [];
  const add = (role, f) => { const url = fileUrl(f, locals); if (url) files.push({ role, name: fileName(f), url }); };
  add('agenda', d.agenda);
  for (let n = 1; n <= 5; n++) add('materials', d[`material_${n}`]);
  add('minutes', d.minutes);
  return {
    itemId: entry.id,
    body: d.body,
    status: d.meeting_status,
    start: centralWallToUtc(d.start),
    end: centralWallToUtc(d.end),
    firstStart: centralWallToUtc(d.original_start) ?? centralWallToUtc(d.start),
    noticePosted: iso(d.publishedAt),
    locationName: d.location_name || null,
    locationAddress: d.location_address ?? null,
    onlineUrl: d.online_url || null,
    recordingUrl: d.recording_url || null,
    noteEn: d.note_en || null,
    noteEs: d.note_es || null,
    files,
  };
}

/** Rewrite the static page HTML with published meetings. kind: 'upcoming' | 'records'. */
export function injectMeetings(html, meetings, kind, lang) {
  if (!meetings.length) return new Response(html);
  const { upcoming, past } = partition(meetings);
  const res = new Response(html);
  if (kind === 'upcoming') {
    const { eyebrow, stack } = renderUpcoming(upcoming, lang);
    return new HTMLRewriter()
      .on('.schedule-heading .eyebrow', { element: (el) => el.setInnerContent(eyebrow) })
      .on('.upcoming-stack', { element: (el) => el.setInnerContent(stack, { html: true }) })
      .transform(res);
  }
  const byYear = groupByYear(past);
  let firstYearSeen = false;
  let currentYear = null;
  let buf = '';
  return new HTMLRewriter()
    .on('details.records-year', {
      element(el) {
        const year = Number((el.getAttribute('id') || '').replace('year-', ''));
        if (!firstYearSeen) {
          firstYearSeen = true;
          const newer = [...byYear.entries()].filter(([y]) => y > year);
          if (newer.length) el.before(newer.map(([y, ms]) => renderYearSection(y, ms, lang)).join(''), { html: true });
        }
        currentYear = year;
      },
    })
    .on('details.records-year .year-description', {
      text(chunk) {
        const ms = byYear.get(currentYear);
        if (!ms) return;
        buf += chunk.text;
        if (!chunk.lastInTextNode) return chunk.remove();
        chunk.replace(bumpYearDescription(buf, ms, lang));
        buf = '';
      },
    })
    .on('details.records-year .year-heading', {
      element(el) {
        const ms = byYear.get(currentYear);
        if (ms) el.after(ms.map((m) => renderRecord(m, lang)).join(''), { html: true });
      },
    })
    .transform(res);
}
