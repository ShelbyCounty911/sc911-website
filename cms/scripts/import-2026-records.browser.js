// One-time import of the 2026 meeting records and the FY2026 audit into EmDash.
// These were in the fixed archive (site/pages/past-meetings.html) until 2026-11-20; they now live in EmDash
// so clerks can add pending minutes and recordings in the admin.
//
// Run it once per site (test site, then production before launch): sign in to /_emdash/admin as an Admin,
// open the browser console, paste this whole file, and press Enter. It is safe to run again: entries that
// already exist (same slug) are skipped. Minutes PDFs are copied from the site's own /documents/ folder
// into EmDash media, so they appear in the admin like any upload.
//
// Times are Central wall-clock time from the WordPress event calendar. Location blank = District office.
(async () => {
  const STREAM = 'https://customer-gct9qbg0k4p3zrey.cloudflarestream.com';
  const MEETINGS = [
    { date: '2026-10-01', body: 'Board of Directors', start: '08:30', end: '10:00', recording: '7ee3aa453be687cd8564f0af97a4085b' },
    { date: '2026-09-18', body: 'Executive Committee', start: '14:00', end: '14:45' },
    { date: '2026-08-13', body: 'Board of Directors', start: '08:30', end: '10:00', recording: '4e754d3f9f898293fc8398cd38f2cdbb' },
    { date: '2026-07-30', body: 'Executive Committee', start: '08:30', end: '09:30' },
    { date: '2026-06-04', body: 'Board of Directors', start: '08:30', end: '10:00', recording: 'b1d0240ef2c5d00c059562aa8ebf852c', minutes: '2026-06-04-26-Board-Meeting-Minutes.pdf' },
    { date: '2026-05-26', body: 'Executive Committee', start: '08:30', end: '09:30' },
    { date: '2026-04-02', body: 'Board of Directors', start: '08:30', end: '10:00', recording: 'd9ac4345f859fa66f11f81d08db3d4a8', minutes: '2026-04-02-2026-Board-Meeting-Minutes.pdf' },
    { date: '2026-03-24', body: 'Executive Committee', start: '12:00', end: '13:00' },
    { date: '2026-02-05', body: 'Board of Directors', start: '08:30', end: '10:00', recording: '3486509e2c3b3a7c6f1fe4f9a220f850', minutes: '2026-02-05-2026-Board-Meeting-Minutes.pdf' },
    { date: '2026-01-23', body: 'Executive Committee', start: '08:30', end: '09:30' },
  ];
  const AUDITS = [{ slug: 'audit-fy2026', title: 'Audit FY2026', fiscal_year: 2026 }]; // report not yet posted

  const H = { 'Content-Type': 'application/json', 'X-EmDash-Request': '1' };
  const log = [];
  const existing = async (collection) => {
    const slugs = new Set();
    let cursor = '';
    do {
      const r = await (await fetch(`/_emdash/api/content/${collection}?status=all&limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`)).json();
      if (!r.success) throw new Error(`${collection}: list failed ${JSON.stringify(r.error).slice(0, 200)}`);
      for (const i of r.data.items) slugs.add(i.slug);
      cursor = r.data.nextCursor ?? '';
    } while (cursor);
    return slugs;
  };
  const create = async (collection, slug, data) => {
    const r = await fetch(`/_emdash/api/content/${collection}`, { method: 'POST', headers: H, body: JSON.stringify({ slug, data }) });
    const j = await r.json();
    if (!j.success) throw new Error(`${slug}: create failed ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
    const id = j.data.item?.id ?? j.data.id;
    const p = await fetch(`/_emdash/api/content/${collection}/${id}/publish`, { method: 'POST', headers: H, body: '{}' });
    if (!p.ok) throw new Error(`${slug}: publish failed ${p.status}`);
  };
  const upload = async (name) => {
    const res = await fetch(`/documents/${name}`);
    if (!res.ok) throw new Error(`/documents/${name}: ${res.status}`);
    const fd = new FormData();
    fd.append('file', new File([await res.blob()], name, { type: 'application/pdf' }));
    const r = await fetch('/_emdash/api/media', { method: 'POST', headers: { 'X-EmDash-Request': '1' }, body: fd });
    const it = (await r.json()).data?.item;
    if (!it) throw new Error(`${name}: upload failed ${r.status}`);
    return { id: it.id, provider: 'local', src: it.url, filename: it.filename, mimeType: it.mimeType, size: it.size, meta: { storageKey: it.storageKey } };
  };

  const haveMeetings = await existing('meetings');
  for (const m of MEETINGS) {
    const slug = `${m.body === 'Board of Directors' ? 'board' : 'exec'}-${m.date}`;
    if (haveMeetings.has(slug)) { log.push(`skip ${slug} (exists)`); continue; }
    const data = {
      title: `${m.body} ${m.date}`,
      body: m.body,
      start: `${m.date}T${m.start}:00.000Z`,
      end: `${m.date}T${m.end}:00.000Z`,
      meeting_status: 'Scheduled',
    };
    if (m.recording) data.recording_url = `${STREAM}/${m.recording}/watch`;
    if (m.minutes) data.minutes = await upload(m.minutes);
    await create('meetings', slug, data);
    log.push(`added ${slug}${m.minutes ? ' + minutes' : ''}${m.recording ? ' + recording' : ''}`);
  }
  const haveAudits = await existing('audits');
  for (const a of AUDITS) {
    if (haveAudits.has(a.slug)) { log.push(`skip ${a.slug} (exists)`); continue; }
    await create('audits', a.slug, { title: a.title, fiscal_year: a.fiscal_year });
    log.push(`added ${a.slug}`);
  }
  console.log(log.join('\n'));
  return log;
})();
