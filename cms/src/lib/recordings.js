// Shared by the "Add recording" staff page (src/pages/tools/add-recording/) and its server endpoint.
// Pure functions only, so scripts/check-recordings.mjs can test them in CI without the Worker runtime.

const DROPBOX_HOSTS = new Set(['www.dropbox.com', 'dropbox.com', 'dl.dropboxusercontent.com']);
const VIDEO_EXT = /\.(mp4|m4v|mov|mkv|webm|avi)$/i;

/**
 * A Dropbox share link as a direct download Stream can fetch.
 * Returns { url, filename } or throws an Error whose message is shown to staff.
 */
export function normalizeDropboxUrl(input) {
  let u;
  try {
    u = new URL(String(input ?? '').trim());
  } catch {
    throw new Error('Paste the full Dropbox link, starting with https://');
  }
  if (u.protocol !== 'https:' || !DROPBOX_HOSTS.has(u.hostname)) throw new Error('The link must be a Dropbox link (dropbox.com).');
  const filename = decodeURIComponent(u.pathname.split('/').pop() || '');
  if (!VIDEO_EXT.test(filename)) throw new Error('That link is not a single video file. In Dropbox, share the .mp4 file itself, not its folder.');
  if (u.hostname !== 'dl.dropboxusercontent.com') {
    u.hostname = 'www.dropbox.com';
    u.searchParams.delete('raw');
    u.searchParams.set('dl', '1'); // dl=0 is Dropbox's preview page; dl=1 is the file
  }
  return { url: u.toString(), filename };
}

/**
 * Meeting date and body from a recording's file name, e.g.
 * "2026-11-23-26-Executive-Committee-Meeting.mp4" → { date: "2026-11-23", body: "Executive Committee" }.
 */
export function guessFromFilename(filename) {
  const name = String(filename ?? '');
  const m = name.match(/(20\d{2})[-_. ]?(\d{2})[-_. ]?(\d{2})/);
  const date = m && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31 ? `${m[1]}-${m[2]}-${m[3]}` : null;
  const words = name.toLowerCase().replace(/[^a-z]+/g, ' ');
  const body = /\bexec(utive)?\b/.test(words) ? 'Executive Committee' : /\bboard\b/.test(words) ? 'Board of Directors' : null;
  return { date, body };
}

/** The meeting's date as staff typed it (stored as Central wall time with a "Z"), e.g. "2026-11-23". */
export function meetingDay(item) {
  const start = item?.data?.start;
  return typeof start === 'string' ? start.slice(0, 10) : start instanceof Date ? start.toISOString().slice(0, 10) : null;
}

/** The one meeting that matches the guess, or null when none or more than one does. */
export function matchMeeting(items, guess) {
  if (!guess?.date) return null;
  let hits = items.filter((i) => meetingDay(i) === guess.date);
  if (guess.body && hits.length > 1) hits = hits.filter((i) => i.data?.body === guess.body);
  else if (guess.body && hits.length === 1 && hits[0].data?.body !== guess.body) return null;
  return hits.length === 1 ? hits[0] : null;
}

/** Meetings to offer in the list: started already, newest first, within the last `days` days. */
export function recentMeetings(items, now = new Date(), days = 180) {
  const today = now.toISOString().slice(0, 10);
  const from = new Date(now.getTime() - days * 864e5).toISOString().slice(0, 10);
  return items
    .filter((i) => { const d = meetingDay(i); return d && d <= today && d >= from; })
    .sort((a, b) => String(b.data.start).localeCompare(String(a.data.start)));
}

const STREAM_HOST = /^https:\/\/customer-[a-z0-9]+\.cloudflarestream\.com\/[a-f0-9]{32}\/watch$/;

/** The public watch link from a Stream video object ("preview"), or null. */
export function watchUrl(video) {
  const url = video?.preview;
  return typeof url === 'string' && STREAM_HOST.test(url) ? url : null;
}

/** Recording state for the page from a Stream video object and its captions list. */
export function recordingState(video, captions = []) {
  const state = video?.status?.state ?? 'queued';
  const ready = video?.readyToStream === true && state === 'ready';
  const pct = Number.parseFloat(video?.status?.pctComplete);
  const cap = captions.find((c) => String(c.language).startsWith('en'));
  return {
    uid: video?.uid ?? null,
    ready,
    failed: state === 'error',
    error: state === 'error' ? video?.status?.errorReasonText || video?.status?.errReasonText || 'Stream could not process the video.' : null,
    percent: Number.isFinite(pct) ? Math.round(pct) : null,
    watchUrl: ready ? watchUrl(video) : null,
    captions: cap ? (cap.status === 'ready' || !cap.status ? 'ready' : cap.status === 'error' ? 'error' : 'generating') : 'none',
  };
}
