import { T } from './strings.js';

export const TIME_ZONE = 'America/Chicago';

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape any value for use in HTML text or a quoted attribute. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
}

/** Link US phone numbers in already-escaped text, e.g. (901) 380-3908 → tel:+19013803908. */
export function linkPhones(html) {
  return html.replace(
    /(?<![\w-])(?:\+?1[ .-]?)?\(?([2-9]\d{2})\)?[ .-]?(\d{3})[ .-](\d{4})(?![\w-])/g,
    (m, a, b, c) => `<a href="tel:+1${a}${b}${c}">${m}</a>`,
  );
}

/** Escape multi-line text, turning newlines into <br> and phone numbers into tel: links. */
export function escLines(value) {
  return String(value ?? '')
    .split(/\r?\n/)
    .map((line) => linkPhones(esc(line.trim())))
    .filter(Boolean)
    .join('<br>');
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** Calendar parts of an instant in Central time. */
export function chicagoParts(isoOrDate) {
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  const p = Object.fromEntries(partsFormatter.formatToParts(d).map((x) => [x.type, x.value]));
  return {
    year: Number(p.year),
    month: Number(p.month), // 1-12
    day: Number(p.day),
    hour: Number(p.hour), // 1-12
    minute: p.minute,
    pm: /p/i.test(p.dayPeriod),
  };
}

/** "November 23, 2026" / "23 de noviembre de 2026" */
export function formatDate(iso, lang) {
  const p = chicagoParts(iso);
  const month = T[lang].months[p.month - 1];
  return lang === 'es' ? `${p.day} de ${month} de ${p.year}` : `${month} ${p.day}, ${p.year}`;
}

/** "10:00–11:00 a.m." or "11:30 a.m.–1:00 p.m." (Spanish: "a. m." / "p. m.") */
export function formatTimeRange(startIso, endIso, lang) {
  const s = chicagoParts(startIso);
  const e = chicagoParts(endIso);
  const period = (x) => (x.pm ? T[lang].pm : T[lang].am);
  const clock = (x) => `${x.hour}:${x.minute}`;
  if (s.pm === e.pm) return `${clock(s)}–${clock(e)} ${period(e)}`;
  return `${clock(s)} ${period(s)}–${clock(e)} ${period(e)}`;
}

/** Date tile parts: { month: "NOV", day: 23, year: 2026 } */
export function tileParts(iso, lang) {
  const p = chicagoParts(iso);
  return { month: T[lang].tile[p.month - 1], day: p.day, year: p.year };
}

/** Central-time calendar year of an instant. */
export function chicagoYear(iso) {
  return chicagoParts(iso).year;
}

/** "Nov 20, 2026"-style same-day comparison key in Central time. */
export function chicagoDayKey(iso) {
  const p = chicagoParts(iso);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}
