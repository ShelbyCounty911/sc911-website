# Content publishing design: Microsoft Lists → Cloudflare (push)

**Status:** proposed, 2026-11-18. Decision recorded: meetings use push publishing, not a meeting-management platform. Nothing here is built yet.

## Problem

After cutover, routine content (meeting notices, agendas, minutes, public trainings, 9-1-1 center job postings) would otherwise need a Git pull request and a site rebuild for every change. Staff who post this content don't use Git, and an urgent meeting correction can't wait on a build. A build can fail, as PR #22's first build did.

## Decision

- **Layout and general pages** stay in Git, built and deployed as today.
- **Routine records** are edited by staff in **Microsoft Lists** and approved in Microsoft 365.
- On approval, **Power Automate pushes** the approved record (with its files) to a **publish endpoint on the `sc911-website` Worker**. The Worker stores it and serves the pages immediately. No rebuild, no redeploy.
- **District job openings stay in BambooHR** (already embedded on Careers). Lists only holds 9-1-1 center (PSAP) jobs posted by other agencies, preserving the District vs. other-agency distinction.
- The **2006–2025 meeting archive stays as static files** in `public/documents/`. Lists covers meetings from cutover onward.

### Why push, not pull

| | Push (chosen) | Pull (Worker reads Lists via Graph) |
|---|---|---|
| What goes public | Exactly the approved snapshot | Ambiguous: latest draft vs. last approved version |
| Credentials in Cloudflare | One inbound endpoint secret | Entra app secret with SharePoint read access; expiry blanks pages |
| Time to publish | Seconds after approval | Polling interval |
| Microsoft 365 outage | Site keeps serving the last published records | Same, but only with an extra caching layer |
| Code to own | Store + render | Sync loop, Graph auth, throttling, file copying, store + render |

## Architecture

```
Staff ──edit──▶ Microsoft List ──approve──▶ Power Automate flow
                                               │  HTTPS POST /api/publish
                                               │  (Cloudflare Access service token + bearer secret)
                                               ▼
Visitors ──▶ shelbycounty911.org ──▶ Worker ──▶ D1 (records)   R2 (PDFs)
                                       │
                                       └──▶ static assets (layout, general pages, 2006–2025 archive)
```

- **D1** (SQLite) stores records. Queries like "upcoming meetings" and "past meetings for 2027" are simple SQL.
- **R2** stores uploaded files at permanent, content-addressed public paths, e.g. `/files/meetings/42/<hash>-Board-Agenda.pdf`. Files are never overwritten.
- The Worker runs first only for the paths it renders (`/(es-)meetings.html`, `/(es-)past-meetings.html`, later training and careers), plus `/files/*` and `/api/*`, using `assets.run_worker_first`. Everything else is served as static assets, unchanged.
- The Worker uses the static page as the template and fills in the records (HTMLRewriter), so pages keep the existing HTML, CSS, shared header and footer. If D1 is empty or unreadable, the static page is served unchanged.
- **Recordings** are already hosted on Cloudflare Stream (captioned); the list stores the Stream link.

## Lists

All lists live on one SharePoint site (e.g. *Website Content*). Approval uses a Power Automate approval step, routed to a named approver group per list.

### Meetings

| Column | Type | Notes |
|---|---|---|
| Body | Choice | Board of Directors, Executive Committee, (other committees as added) |
| Start | Date/time | Entered in Central time |
| End | Date/time | |
| Status | Choice | Scheduled, Rescheduled, Canceled |
| Notice posted | Date/time | Set by the flow at first approval; never edited by hand |
| Location | Text | Default: District office address |
| Online attendance link | Hyperlink | Optional; `https` only |
| Agenda | Attachment (PDF) | |
| Supporting materials | Attachments (PDF) | Optional |
| Minutes | Attachment (PDF) | Added after approval at a later meeting |
| Recording link | Hyperlink | Optional; captioned recording |
| Public note (EN) | Multi-line text | e.g. "Moved from Nov 20 due to …" |
| Public note (ES) | Multi-line text | Optional; English shown with a Spanish label if empty |

Rules:
- **Meetings are never deleted from the public site.** A removed list item or a delete request is rejected; use Status = Canceled. Canceled and rescheduled meetings stay visible with the status shown prominently (Open Meetings Act notice trail). Rescheduled cards show the originally published date.
- **No per-meeting pages**, per the owner's Oct 5, 2026 decision (`docs/MEETING-DETAIL-RETIREMENT.md`). Upcoming meetings are cards on Meetings; past meetings are rows in the year-by-year archive. Each has a stable anchor, `#meeting-<itemId>`.
- Upcoming vs. past is computed at request time in America/Chicago. Past meetings appear in the year-by-year archive alongside the static 2006–2025 records.

### Public trainings

Title (EN/ES), Start, End, Location, Registration link (`https` only), Description (EN/ES), Status (Scheduled, Canceled). Staff-only trainings are not entered here; they stay on the internal calendar. Trainings drop off the page after their end time.

### 9-1-1 center jobs (other agencies)

| Column | Type | Notes |
|---|---|---|
| Hiring agency | Choice (required) | Memphis Fire Services, Shelby County Sheriff's Office, Memphis Police Department, … |
| Position title | Text | Official title, kept in English |
| Pay | Text | As posted by the agency |
| Employment type, Location | Text | |
| Summary (EN / ES) | Multi-line text | |
| Apply link | Hyperlink (required) | Agency's own posting; `https` only |
| Info link | Hyperlink | Optional |
| Closing date | Date | Empty = continuous posting |
| Posted date | Date | |

Jobs disappear from the page automatically the day after the closing date (Central time). The Careers page keeps the "These are not District jobs" notice and per-card "Hiring agency" label.

## Publish endpoint contract

`POST /api/publish` (JSON). Protected two ways:
1. A **Cloudflare Access** policy on `/api/*` that only admits a dedicated **service token**, sent by the flow as `CF-Access-Client-Id` / `CF-Access-Client-Secret`.
2. A **bearer secret** checked by the Worker, stored as a Worker secret and in the flow with *Secure inputs* on, so it never appears in flow run history.

```json
{
  "list": "meetings",
  "itemId": 42,
  "version": "7.0",
  "approvedBy": "approver@…",
  "approvedAt": "2027-02-01T15:04:00Z",
  "fields": { "...": "column values as above" },
  "files": [
    { "role": "agenda", "name": "2027-02-04-Board-Agenda.pdf", "contentType": "application/pdf", "base64": "…" }
  ]
}
```

- **Idempotent:** keyed on `list` + `itemId`. Re-sending the same or an older `version` is a no-op.
- **Validation:** reject unknown lists and fields, non-`https` links, files that aren't PDF or larger than 25 MB, and deletes of meetings.
- **Response:** `200 {"url": "<public page>"}`. The flow writes this URL back to the list item, so staff can click through and check the live page.

## Failure handling

- **Flow fails to deliver:** Power Automate retries automatically. On final failure it emails the approver group and the site owner.
- **Missed updates:** a nightly scheduled flow re-sends every published item. Because publishing is idempotent, this is safe and repairs any drift.
- **Microsoft 365 outage:** no effect on visitors. The Worker serves what's in D1 and R2.
- **Worker deploy breaks rendering:** roll back the Worker version in Cloudflare. The data in D1 and R2 is untouched.
- **Audit trail:** D1 keeps every published version (who approved it, and when) in an append-only history table, alongside SharePoint version history.

## Security

- All staff text is rendered as escaped plain text. No HTML from Lists reaches the page. Links are only rendered if they're `https`.
- The flow runs as a **service account**, not a person, so it keeps working through staff changes. The service token and bearer secret are rotated on the same cadence as the monthly Entra credential review.
- No Microsoft credentials are stored in Cloudflare.

## Accessibility and records

- Under the DOJ ADA Title II web rule, posted documents must meet WCAG 2.1 AA. The upload checklist requires tagged, text-based PDFs (no scans) and captioned recordings. The Worker can flag PDFs that have no text layer.
- Minutes and agendas are public records. R2 files are never overwritten: a corrected file gets a new name, and the page links to the current one.

## Open questions

1. **Power Automate Premium:** the flow's HTTP action needs a Premium license for the flow owner (service account). The District has Microsoft 365 G5, which includes Power Automate with **standard** connectors only, so one Power Automate Premium license for the service account is likely needed. Confirm against the tenant's license SKUs, or budget for one.
2. **Spanish:** who translates the optional Spanish fields, and is English-with-a-Spanish-label acceptable when they're empty?
3. **Approvers:** who approves each list (meetings, trainings, jobs), and who is the backup?
4. ~~**Recordings:** where captioned recordings are hosted today.~~ Resolved: Cloudflare Stream (existing archive links already point there).

## Testing before cutover

- Publish, edit, reschedule and cancel a test meeting end to end. **Time an urgent correction** from approval to visible change on the public page (target: under 1 minute).
- Turn off the flow's network access and confirm the site still serves existing records, and that the nightly re-send repairs the gap afterward.
- Old WordPress URLs and current static URLs still resolve (`npm run check` + the runbook smoke test).
- A staff member who hasn't seen the system before completes each workflow using only the written instructions.

## Build order

1. **Meetings** (legal notice; highest risk). Includes the Worker skeleton, D1, R2, the publish endpoint and the flow.
2. **9-1-1 center jobs** (reuses the same pipeline; replaces the hand-edited cards on Careers).
3. **Public trainings.**

Launch does not have to wait for all three: until a list is live, its pages stay static and are updated by PR.
