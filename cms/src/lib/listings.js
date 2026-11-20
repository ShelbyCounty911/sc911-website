// Trainings, 9-1-1 center jobs (other agencies) and RFPs: EmDash entries rendered into the approved
// static Training, Careers and RFPs pages. Markup matches the approved designs (training-cards.css,
// .job-card in style.css). Datetime fields hold Central wall-clock time, like meetings.
import { centralWallToUtc } from './meetings.js';
import { esc, escLines, formatDate, formatTimeRange, tileParts, chicagoParts, chicagoDayKey } from './format.js';
import { T } from './strings.js';

const SHORT = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.'],
};
/** "Nov 18, 2026" / "18 de nov. de 2026" */
export function formatShortDate(iso, lang) {
  const p = chicagoParts(iso);
  const m = SHORT[lang][p.month - 1];
  return lang === 'es' ? `${p.day} de ${m} de ${p.year}` : `${m} ${p.day}, ${p.year}`;
}

const L = {
  en: {
    kind: { 'Training class': 'TRAINING CLASS', Conference: 'CONFERENCE' },
    canceled: 'CANCELED',
    canceledNote: 'This event has been canceled.',
    schedule: 'Schedule',
    location: 'Location',
    about: { 'Training class': 'About this class', Conference: 'About this conference' },
    learn: 'What you will learn',
    regHeading: 'Registration and event information',
    regLink: 'Registration and event information ↗',
    agencyLabel: (a) => `Hiring agency: ${a}`,
    applyBy: (d) => `Apply by ${d}`,
    continuous: 'Continuous posting',
    posted: (d) => `Posted ${d}`,
    employment: { 'Full time': 'Full time', 'Part time': 'Part time' },
    apply: (a) => APPLY_WITH[a]?.en ?? `Apply with ${a}`,
    moreInfo: 'More information',
    lastReviewed: (d) => `Last reviewed ${d}.`,
    noJobs: 'No openings are posted right now. Please check back.',
    rfpOpen: 'Open requests for proposals',
    rfpRecent: 'Recently closed',
    rfpNone: 'There are no open requests for proposals right now. Please check back.',
    rfpStatus: { Open: 'Open', Closed: 'Closed', Awarded: 'Awarded', Canceled: 'Canceled' },
    issued: (d) => `Issued ${d}`,
    questionsDue: (d) => `Questions due ${d}`,
    due: (d) => `Proposals due ${d}`,
    at: 'at',
    contact: 'Contact',
    solicitation: 'Solicitation',
    addendum: (n) => `Addendum ${n}`,
    award: 'Award notice',
    pdf: '(PDF)',
  },
  es: {
    kind: { 'Training class': 'CAPACITACIÓN', Conference: 'CONFERENCIA' },
    canceled: 'CANCELADA',
    canceledNote: 'Este evento ha sido cancelado.',
    schedule: 'Horario',
    location: 'Lugar',
    about: { 'Training class': 'Acerca de esta capacitación', Conference: 'Acerca de esta conferencia' },
    learn: 'Qué aprenderá',
    regHeading: 'Inscripción e información del evento',
    regLink: 'Inscripción e información del evento ↗',
    agencyLabel: (a) => `Agencia contratante: ${a}`,
    applyBy: (d) => `Fecha límite: ${d}`,
    continuous: 'Publicación continua',
    posted: (d) => `Publicado el ${d}`,
    employment: { 'Full time': 'Tiempo completo', 'Part time': 'Medio tiempo' },
    apply: (a) => APPLY_WITH[a]?.es ?? `Solicitar con ${a}`,
    moreInfo: 'Más información',
    lastReviewed: (d) => `Última revisión: ${d}.`,
    noJobs: 'No hay vacantes publicadas en este momento. Consulte de nuevo más adelante.',
    rfpOpen: 'Solicitudes de propuestas abiertas',
    rfpRecent: 'Cerradas recientemente',
    rfpNone: 'No hay solicitudes de propuestas abiertas en este momento. Consulte de nuevo más adelante.',
    rfpStatus: { Open: 'Abierta', Closed: 'Cerrada', Awarded: 'Adjudicada', Canceled: 'Cancelada' },
    issued: (d) => `Emitida el ${d}`,
    questionsDue: (d) => `Preguntas hasta el ${d}`,
    due: (d) => `Propuestas hasta el ${d}`,
    at: 'a las',
    contact: 'Contacto',
    solicitation: 'Solicitud (documento)',
    addendum: (n) => `Adenda ${n}`,
    award: 'Aviso de adjudicación',
    pdf: '(PDF, inglés)',
  },
};

const APPLY_WITH = {
  'Memphis Police Department': { en: 'Apply with the City of Memphis', es: 'Solicitar con la Ciudad de Memphis' },
  'Memphis Fire Services': { en: 'Apply with the City of Memphis', es: 'Solicitar con la Ciudad de Memphis' },
  "Shelby County Sheriff's Office": { en: 'Apply with Shelby County', es: 'Solicitar con el condado de Shelby' },
};

const pick = (en, es, lang) => (lang === 'es' ? es || en : en);
const httpsOnly = (u) => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const iso = (v) => (v instanceof Date ? v.toISOString() : v ? String(v) : null);
const slugId = (prefix, entry) => `${prefix}-${String(entry.id).replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`;

export function fileUrl(file, locals) {
  if (!file) return null;
  const key = typeof file?.meta?.storageKey === 'string' ? file.meta.storageKey : undefined;
  if (key) return locals.emdash?.getPublicMediaUrl?.(key) ?? `/_emdash/api/media/file/${key}`;
  return file.provider === 'external' ? file.src : file.url ?? null;
}

const lines = (v) => String(v ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
function timeOf(isoStr, lang) {
  const p = chicagoParts(isoStr);
  return `${p.hour}:${p.minute} ${p.pm ? T[lang].pm : T[lang].am}`;
}

// ---------- Trainings ----------

export function upcomingTrainings(entries, now = new Date()) {
  return entries
    .map((e) => ({ e, start: centralWallToUtc(e.data.start), end: centralWallToUtc(e.data.end) }))
    .filter((t) => t.start && t.end && Date.parse(t.end) > now.getTime())
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

function trainingCard({ e, start, end }, lang) {
  const d = e.data;
  const l = L[lang];
  const conf = d.kind === 'Conference';
  const sameDay = chicagoDayKey(start) === chicagoDayKey(end);
  const s = chicagoParts(start);
  const en = chicagoParts(end);
  const ts = tileParts(start, lang);
  let dateLine, tileDay, scheduleDate;
  if (sameDay) {
    dateLine = formatDate(start, lang);
    tileDay = String(s.day);
    scheduleDate = dateLine;
  } else if (s.year === en.year && s.month === en.month) {
    const month = T[lang].months[s.month - 1];
    dateLine = lang === 'es' ? `${s.day}–${en.day} de ${month} de ${s.year}` : `${month} ${s.day}–${en.day}, ${s.year}`;
    tileDay = `${s.day}–${en.day}`;
    scheduleDate = `${formatDate(start, lang)} – ${formatDate(end, lang)}`;
  } else {
    dateLine = `${formatDate(start, lang)} – ${formatDate(end, lang)}`;
    tileDay = String(s.day);
    scheduleDate = dateLine;
  }
  // Conferences show dates only (owner decision, Training page design); classes show the time.
  const time = !conf ? (sameDay ? formatTimeRange(start, end, lang) : `${timeOf(start, lang)} – ${timeOf(end, lang)}`) : null;
  const canceled = d.training_status === 'Canceled';
  const kind = `${canceled ? `${l.canceled} · ` : ''}${l.kind[d.kind] ?? esc(d.kind)}`;
  const title = pick(d.title, d.title_es, lang);
  const desc = pick(d.description_en, d.description_es, lang);
  const objectives = lines(pick(d.objectives_en, d.objectives_es, lang));
  const reg = httpsOnly(d.registration_url);
  const loc = lines(d.location);
  const titleLang = lang === 'es' && !d.title_es ? ' lang="en"' : '';

  let html = `<article class="training-event"><div class="training-event-head"><div><p class="training-kind">${esc(kind)}</p>`;
  html += `<h3${titleLang}>${esc(title)}</h3>`;
  if (d.organizer) html += `<p class="training-organizer">${esc(d.organizer)}</p>`;
  html += `<p class="training-date">${esc(dateLine)}</p></div>`;
  html += `<div class="training-date-tile" aria-hidden="true"><span>${esc(ts.month)}</span><strong>${esc(tileDay)}</strong><small>${ts.year}</small></div></div>`;
  html += `<div class="training-event-info"><section><h4>${l.schedule}</h4><p>${esc(scheduleDate)}</p>`;
  if (time) html += `<p class="training-meta">${esc(time)}</p>`;
  html += `</section>`;
  if (loc.length) html += `<section><h4>${l.location}</h4><p>${loc.map(esc).join('<br>')}</p></section>`;
  html += `</div>`;
  if (canceled) {
    html += `<div class="training-event-foot"><p><strong>${l.canceledNote}</strong></p></div>`;
  } else {
    if (desc || objectives.length) {
      html += `<section class="training-description"><h4>${l.about[d.kind] ?? l.about['Training class']}</h4>`;
      if (desc) html += `<p>${escLines(desc)}</p>`;
      if (objectives.length) html += `<details class="training-objectives"><summary>${l.learn}</summary><ul>${objectives.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></details>`;
      html += `</section>`;
    }
    if (reg) html += `<div class="training-event-foot"><div><h4>${l.regHeading}</h4><p><a href="${esc(reg)}" rel="noopener">${l.regLink}</a></p></div></div>`;
  }
  return html + `</article>`;
}

/** Replace the "No upcoming events" panel when there are upcoming trainings. */
export function injectTrainings(html, entries, lang) {
  const list = upcomingTrainings(entries);
  if (!list.length) return new Response(html);
  const cards = list.map((t) => trainingCard(t, lang)).join('');
  return new HTMLRewriter()
    .on('section.training-empty', { element: (el) => el.replace(`<div class="training-list">${cards}</div>`, { html: true }) })
    .transform(new Response(html));
}

// ---------- 9-1-1 center jobs (other agencies) ----------

export function currentJobs(entries, now = new Date()) {
  const today = chicagoDayKey(now.toISOString());
  return entries
    .map((e) => ({ e, closing: centralWallToUtc(e.data.closing), posted: iso(e.data.publishedAt) }))
    .filter((j) => !j.closing || chicagoDayKey(j.closing) >= today)
    .sort((a, b) => Date.parse(b.posted ?? 0) - Date.parse(a.posted ?? 0));
}

function jobCard({ e, closing, posted }, lang) {
  const d = e.data;
  const l = L[lang];
  const id = slugId('job', e);
  const when = closing ? l.applyBy(formatShortDate(closing, lang)) : d.continuous ? l.continuous : posted ? l.posted(formatShortDate(posted, lang)) : '';
  const terms = [d.pay_en || d.pay_es ? `<strong>${esc(pick(d.pay_en, d.pay_es, lang))}</strong>` : null, d.employment_type ? esc(l.employment[d.employment_type] ?? d.employment_type) : null, d.location ? esc(d.location) : null].filter(Boolean);
  const summary = pick(d.summary_en, d.summary_es, lang);
  const apply = httpsOnly(d.apply_url);
  const info = httpsOnly(d.info_url);
  let html = `<article class="job-card" aria-labelledby="${id}"><p class="job-agency"><span>${esc(l.agencyLabel(d.agency))}</span><span>${esc(when)}</span></p>`;
  html += `<h3 id="${id}"${lang === 'es' ? ' lang="en"' : ''}>${esc(d.title)}</h3>`;
  if (terms.length) html += `<p class="job-terms">${terms.join(' · ')}</p>`;
  if (summary) html += `<p>${escLines(summary)}</p>`;
  if (apply || info) {
    html += `<div class="actions">`;
    if (apply) html += `<a class="button" href="${esc(apply)}" rel="noopener">${esc(l.apply(d.agency))}</a>`;
    if (info) html += `<a class="button secondary" href="${esc(info)}" rel="noopener">${esc(pick(d.info_label_en, d.info_label_es, lang) || l.moreInfo)}</a>`;
    html += `</div>`;
  }
  return html + `</article>`;
}

/** Fill the "Jobs at 9-1-1 centers" section. District jobs (BambooHR) are not touched. */
export function injectJobs(html, entries, lang) {
  const l = L[lang];
  const jobs = currentJobs(entries);
  const reviewed = entries.map((e) => iso(e.data.updatedAt) ?? iso(e.data.publishedAt)).filter(Boolean).sort().pop();
  const list = jobs.length ? jobs.map((j) => jobCard(j, lang)).join('') : `<p class="meta">${l.noJobs}</p>`;
  let rw = new HTMLRewriter().on('#psap-jobs .job-list', { element: (el) => el.setInnerContent(list, { html: true }) });
  if (reviewed) rw = rw.on('#psap-jobs > p.meta', { element: (el) => el.setInnerContent(l.lastReviewed(formatDate(reviewed, lang))) });
  return rw.transform(new Response(html));
}

// ---------- RFPs ----------

const RECENT_DAYS = 365;

export function sortRfps(entries, now = new Date()) {
  const t = now.getTime();
  const rows = entries.map((e) => ({ e, due: centralWallToUtc(e.data.due), issued: centralWallToUtc(e.data.issued), questions: centralWallToUtc(e.data.questions_due) }));
  const isOpen = (r) => r.e.data.rfp_status === 'Open' && r.due && Date.parse(r.due) > t;
  const open = rows.filter(isOpen).sort((a, b) => Date.parse(a.due) - Date.parse(b.due));
  const recent = rows
    .filter((r) => !isOpen(r) && r.due && t - Date.parse(r.due) < RECENT_DAYS * 864e5)
    .sort((a, b) => Date.parse(b.due) - Date.parse(a.due));
  return { open, recent };
}

function rfpCard(r, lang, locals, open) {
  const d = r.e.data;
  const l = L[lang];
  const id = slugId('rfp', r.e);
  const status = open ? l.rfpStatus.Open : d.rfp_status === 'Open' ? l.rfpStatus.Closed : l.rfpStatus[d.rfp_status] ?? d.rfp_status;
  const dt = (v) => `${formatDate(v, lang)} ${l.at} ${timeOf(v, lang)}`;
  const dates = [r.issued ? l.issued(formatDate(r.issued, lang)) : null, r.questions && open ? l.questionsDue(dt(r.questions)) : null, r.due ? l.due(dt(r.due)) : null].filter(Boolean);
  const title = pick(d.title, d.title_es, lang);
  const summary = pick(d.summary_en, d.summary_es, lang);
  const docs = [];
  const add = (f, label) => { const url = fileUrl(f, locals); if (url) docs.push(`<a href="${esc(url)}">${esc(label)} ${esc(l.pdf)}</a>`); };
  add(d.solicitation, l.solicitation);
  for (let n = 1; n <= 3; n++) add(d[`addendum_${n}`], l.addendum(n));
  add(d.award_notice, l.award);
  let html = `<article class="job-card" aria-labelledby="${id}"><p class="job-agency"><span>${esc(d.number || '')}</span><span>${esc(status)}</span></p>`;
  html += `<h3 id="${id}"${lang === 'es' && !d.title_es ? ' lang="en"' : ''}>${esc(title)}</h3>`;
  if (dates.length) html += `<p class="job-terms">${dates.map(esc).join(' · ')}</p>`;
  if (summary) html += `<p>${escLines(summary)}</p>`;
  if (d.contact) html += `<p><strong>${l.contact}:</strong> ${escLines(d.contact)}</p>`;
  if (docs.length) html += `<ul class="rfp-docs">${docs.map((a) => `<li>${a}</li>`).join('')}</ul>`;
  return html + `</article>`;
}

/** Replace the RFPs page placeholder notice with open and recently closed RFPs. */
export function injectRfps(html, entries, lang, locals) {
  const l = L[lang];
  const { open, recent } = sortRfps(entries);
  let out = `<section class="job-section" aria-labelledby="rfp-open"><h2 id="rfp-open">${l.rfpOpen}</h2>`;
  out += open.length ? `<div class="job-list">${open.map((r) => rfpCard(r, lang, locals, true)).join('')}</div>` : `<p class="meta">${l.rfpNone}</p>`;
  out += `</section>`;
  if (recent.length) {
    out += `<section class="job-section" aria-labelledby="rfp-recent"><h2 id="rfp-recent">${l.rfpRecent}</h2><div class="job-list">${recent.map((r) => rfpCard(r, lang, locals, false)).join('')}</div></section>`;
  }
  return new HTMLRewriter().on('main .notice', { element: (el) => el.replace(out, { html: true }) }).transform(new Response(html));
}
