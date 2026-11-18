# Meetings publishing: setup and operations

How to turn on Worker-rendered meetings (design: `docs/CONTENT-PUBLISHING-DESIGN.md`). Until step 4 is done and the first meeting is published, `meetings.html` and `past-meetings.html` are served exactly as their static files.

## What the Worker does

| Path | Behavior |
|---|---|
| `POST /api/publish` | Accepts an approved meeting from Power Automate, stores it in D1 and its PDFs in R2 |
| `/meetings.html`, `/es-meetings.html` | Static page with the upcoming cards replaced by published meetings |
| `/past-meetings.html`, `/es-past-meetings.html` | Static archive with published past meetings added under their year |
| `/files/meetings/…` | Published PDFs, never overwritten |
| everything else | Served straight from `public/`, unchanged |

If D1 is empty or can't be read, the meeting pages fall back to the static files.

## One-time setup (Cloudflare account owner)

Run from the repo root, signed in with `npx wrangler login` as an account admin.

1. **Create the database.** Copy the printed `database_id` into `wrangler.jsonc` (replace `REPLACE-WITH-D1-DATABASE-ID`) and commit it.
   ```bash
   npx wrangler d1 create sc911-website
   ```
2. **Create the tables.**
   ```bash
   npm run db:migrate:remote
   ```
3. **Create the file bucket.**
   ```bash
   npx wrangler r2 bucket create sc911-website-files
   ```
4. **Set the publish secret.** Generate a long random value, paste it at the prompt, and store it in the District password vault. Power Automate needs the same value.
   ```bash
   npx wrangler secret put PUBLISH_TOKEN
   ```
5. **Lock down `/api/*` with Cloudflare Access** (Zero Trust → Access → Applications):
   - Create a **service token** named `power-automate-meetings`, and save its Client ID and Client Secret in the vault.
   - Add a self-hosted application for `sc911-website.shelby-county-911-district.workers.dev/api/*` (and later `shelbycounty911.org/api/*`), with one policy: **Service Auth**, include that service token.
6. Merge the PR. Workers Builds deploys it.

Until steps 1–3 are done, Workers Builds can't deploy this branch, because the bindings don't exist yet.

## Power Automate flow (outline)

Owner: the website service account. Trigger: item approved in the *Meetings* list.

1. Get the item and its attachments (SharePoint connector).
2. **HTTP** action (Premium): `POST https://<site>/api/publish`
   - Headers: `Content-Type: application/json`, `Authorization: Bearer <PUBLISH_TOKEN>`, `CF-Access-Client-Id`, `CF-Access-Client-Secret`
   - Turn on **Secure inputs** and **Secure outputs** in the action settings.
   - Body: see the contract below. Send times as UTC ISO 8601 (SharePoint's default in flows).
3. Write the `url` from the response back to the list item, so staff can open the live page.
4. On failure after retries: email the approvers and the site owner.

A second, scheduled flow re-sends every item nightly. This is safe because re-sending an unchanged version is a no-op.

### Request contract

```json
{
  "list": "meetings",
  "itemId": 42,
  "version": "3.0",
  "approvedBy": "clerk@…",
  "approvedAt": "2026-11-18T15:00:00Z",
  "fields": {
    "body": "Board of Directors",
    "start": "2026-12-03T14:30:00Z",
    "end": "2026-12-03T16:00:00Z",
    "status": "Scheduled",
    "locationName": "District office",
    "locationAddress": "3150 Lenox Park Blvd., Suite 108\nMemphis, TN 38115",
    "onlineUrl": "https://…",
    "recordingUrl": "https://…cloudflarestream.com/…/watch",
    "noteEn": "…",
    "noteEs": "…"
  },
  "files": [
    { "role": "agenda", "name": "Board-Agenda-2026-12-03.pdf", "contentType": "application/pdf", "base64": "…" }
  ]
}
```

- `body`: `Board of Directors` or `Executive Committee`. `status`: `Scheduled`, `Rescheduled` or `Canceled`.
- Optional fields can be omitted or empty. Location defaults to the District office.
- `files` is the **complete** current set: one `agenda`, up to ten `materials`, one `minutes`. PDFs only, 25 MB each.
- Unknown properties are rejected. Every error message is returned in `details`.

| Response | Meaning |
|---|---|
| `200 {"status":"created"\|"updated","url":…}` | Published |
| `200 {"status":"unchanged"}` | Same or older version: nothing changed |
| `400 {"details":[…]}` | Validation failed: fix the list item |
| `401` | Wrong or missing token |
| `405` on `DELETE` | Meetings are never deleted: set Status to Canceled |

## How meetings behave on the site

- **Upcoming** until the meeting's end time (Central), then it moves to the archive under its year.
- **Rescheduled:** the card shows the new date and "Rescheduled from <first published date>".
- **Canceled:** stays visible, struck through and marked CANCELED, then archived as "Canceled".
- **Notice posted** is the first approval time and never changes.
- **Spanish pages:** labels and dates are in Spanish. The note uses `noteEs`, falling back to `noteEn` when it's empty.
- **Archive status:** "Minutes approved" once a `minutes` file is attached, otherwise "Minutes pending approval".

## Going live with real data

Published meetings replace the static cards entirely. So before the first real publish, enter **every currently upcoming meeting** in the list, so none disappear from the page.

## Local development

```bash
echo PUBLISH_TOKEN=local-test-token > .dev.vars
npm run db:migrate:local
npm run dev
```

`.dev.vars` and `.wrangler/` are git-ignored. `npm test` runs the unit tests.

## Operations

- **What's live:** `npx wrangler d1 execute sc911-website --remote --command "SELECT item_id, body, start_utc, status, version FROM meetings ORDER BY start_utc"`
- **Audit trail:** the `publish_log` table records every accepted request (who approved it, when, and the outcome).
- **Bad render after a deploy:** roll back the Worker version in Cloudflare. D1 and R2 data are unaffected.
- **Rotate the token:** set the new value with `wrangler secret put PUBLISH_TOKEN`, then update the flow. Requests fail with 401 in between, so do it during a quiet window.
