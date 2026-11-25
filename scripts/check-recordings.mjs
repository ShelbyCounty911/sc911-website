#!/usr/bin/env node
/**
 * Tests the "Add recording" staff page's shared logic (cms/src/lib/recordings.js): Dropbox link handling,
 * matching a video's file name to a meeting, and reading Stream's processing and caption state.
 * Usage: node scripts/check-recordings.mjs   (exit 1 on any failure)
 */
import {
  normalizeDropboxUrl, guessFromFilename, matchMeeting, recentMeetings, recordingState, watchUrl,
} from '../cms/src/lib/recordings.js';

const failures = [];
const eq = (got, want, msg) => { if (JSON.stringify(got) !== JSON.stringify(want)) failures.push(`${msg}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); };
const throws = (fn, msg) => { try { fn(); failures.push(`${msg}: should have been rejected`); } catch { /* expected */ } };

// Dropbox links
const raymond = 'https://www.dropbox.com/scl/fi/tn77f5iurbcq3ygb2xj8u/2026-11-23-26-Executive-Committee-Meeting.mp4?rlkey=8j9u0ot8tt3slibmt2q5mmdvw&dl=0';
const n = normalizeDropboxUrl(raymond);
eq(n.filename, '2026-11-23-26-Executive-Committee-Meeting.mp4', 'file name from the share link');
eq(new URL(n.url).searchParams.get('dl'), '1', 'dl=0 becomes dl=1');
eq(new URL(n.url).searchParams.get('rlkey'), '8j9u0ot8tt3slibmt2q5mmdvw', 'rlkey kept');
eq(new URL(normalizeDropboxUrl('https://dropbox.com/s/abc/Board%20Meeting%202026-12-03.mp4?raw=1').url).searchParams.get('raw'), null, 'raw=1 dropped');
throws(() => normalizeDropboxUrl('http://www.dropbox.com/scl/fi/x/a.mp4?dl=0'), 'plain http');
throws(() => normalizeDropboxUrl('https://evil.example/scl/fi/x/a.mp4'), 'non-Dropbox host');
throws(() => normalizeDropboxUrl('https://www.dropbox.com.evil.example/a.mp4'), 'look-alike host');
throws(() => normalizeDropboxUrl('https://www.dropbox.com/scl/fo/tunpcd7eozx528u0cw5h8/AIhLoso?rlkey=k&dl=0'), 'folder link');
throws(() => normalizeDropboxUrl('https://www.dropbox.com/scl/fi/x/minutes.pdf?dl=0'), 'not a video');
throws(() => normalizeDropboxUrl('not a link'), 'not a URL');

// File name → meeting
eq(guessFromFilename('2026-11-23-26-Executive-Committee-Meeting.mp4'), { date: '2026-11-23', body: 'Executive Committee' }, 'Raymond-style exec name');
eq(guessFromFilename('2026-12-03 Board Meeting.mp4'), { date: '2026-12-03', body: 'Board of Directors' }, 'board name');
eq(guessFromFilename('20270204_board.mp4'), { date: '2027-02-04', body: 'Board of Directors' }, 'compact date');
eq(guessFromFilename('Exec Comm 2026-13-40.mp4'), { date: null, body: 'Executive Committee' }, 'impossible date ignored');
eq(guessFromFilename('meeting.mp4'), { date: null, body: null }, 'no clues');

const m = (id, start, body, extra = {}) => ({ id, status: 'published', data: { start, body, ...extra } });
const items = [
  m('exec23', '2026-11-23T11:00:00.000Z', 'Executive Committee'),
  m('board03', '2026-12-03T08:30:00.000Z', 'Board of Directors'),
  m('a', '2026-10-01T08:30:00.000Z', 'Board of Directors'),
  m('b', '2026-10-01T11:00:00.000Z', 'Executive Committee'),
  m('old', '2025-02-01T08:30:00.000Z', 'Board of Directors'),
];
eq(matchMeeting(items, { date: '2026-11-23', body: 'Executive Committee' })?.id, 'exec23', 'exact match');
eq(matchMeeting(items, { date: '2026-11-23', body: null })?.id, 'exec23', 'date alone when only one meeting that day');
eq(matchMeeting(items, { date: '2026-11-23', body: 'Board of Directors' }), null, 'wrong body is not matched');
eq(matchMeeting(items, { date: '2026-10-01', body: 'Executive Committee' })?.id, 'b', 'two meetings one day, body decides');
eq(matchMeeting(items, { date: '2026-10-01', body: null }), null, 'two meetings one day, no body: no guess');
eq(matchMeeting(items, { date: null, body: 'Board of Directors' }), null, 'no date: no guess');
eq(recentMeetings(items, new Date('2026-11-25T18:00:00Z')).map((i) => i.id), ['exec23', 'b', 'a'], 'recent list: past, newest first, no future or old');

// Stream state
const watch = 'https://customer-gct9qbg0k4p3zrey.cloudflarestream.com/95e37bf7f972bd50920d61c1f46df8a2/watch';
const v = (state, extra = {}) => ({ uid: '95e37bf7f972bd50920d61c1f46df8a2', preview: watch, readyToStream: state === 'ready', status: { state, pctComplete: '42.5' }, ...extra });
eq(recordingState(v('inprogress')).ready, false, 'processing is not ready');
eq(recordingState(v('inprogress')).percent, 43, 'percent rounded');
eq(recordingState(v('inprogress')).watchUrl, null, 'no watch link until ready');
eq(recordingState(v('ready')).watchUrl, watch, 'watch link when ready');
eq(recordingState(v('ready')).captions, 'none', 'no captions yet');
eq(recordingState(v('ready'), [{ language: 'en', status: 'inprogress' }]).captions, 'generating', 'captions generating');
eq(recordingState(v('ready'), [{ language: 'en', generated: true, status: 'ready' }]).captions, 'ready', 'captions ready');
eq(recordingState(v('error', { status: { state: 'error', errorReasonText: 'bad file' } })).failed, true, 'error state');
eq(watchUrl({ preview: 'https://evil.example/95e37bf7f972bd50920d61c1f46df8a2/watch' }), null, 'only Stream watch links are used');

if (failures.length) {
  console.error(`Add-recording check: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('Add-recording check: Dropbox links, meeting matching and Stream states all pass');
