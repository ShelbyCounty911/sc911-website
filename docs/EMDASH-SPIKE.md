# EmDash spike (November 19, 2026)

Branch `spike/emdash`. The EmDash site is in `cms/` (EmDash 1.5.0, Astro 7, Cloudflare template). It is deployed
as a separate test Worker, `sc911-cms-spike` (workers.dev only, behind Cloudflare Access). The review Worker is unchanged.

This spike evaluates replacing the static site and the Lists + Power Automate publishing design
(`CONTENT-PUBLISHING-DESIGN.md`, PR #27/#28) with EmDash. **Owner approved the move on 2026-11-20**; `design/DECISIONS.md`
records it and marks "Stay on static HTML/CSS mockup" as superseded.

## How it is built

- **Approved pages unchanged.** `cms/scripts/build-static.mjs` takes `site/pages` and `site/shared` and serves them at the new
  URLs. Same markup and CSS; links are rewritten. Pages are not editable in EmDash yet. That is a later step, page by page.
- **New URLs** come from `cms/redirects/url-map.json`. English pages use short paths (`/meetings/`, `/records/`, `/careers/`, and so on).
  Spanish pages use the same paths under `/es/`. Documents and media keep `/documents/…` and `/media/…`.
- **Redirects.** `cms/scripts/build-redirects.mjs` turns the WordPress redirects (and the review site's `.html` addresses)
  into a static `_redirects` file: 267 static rules and 2 wildcards. Workers static assets apply it before EmDash runs, so the EmDash
  bug with `.pdf` redirects (emdash-cms/emdash#4962) does not affect us.
- **Meetings** are an EmDash collection (`cms/seed/seed.json`). The Meetings and Meeting records pages render them with the
  card code from PR #28 (`cms/src/lib/render.js`, `format.js`, `strings.js`).

## Verified locally

| Check | Result |
|---|---|
| All 27 pages (EN/ES + 404) served at new URLs | 200 |
| `/meetings` → `/meetings/` | 301 |
| Every `_redirects` rule (269), including old `.pdf` URLs and wildcards | 301 to a page that returns 200 |
| Documents, media and CSS served as static files | 200 |
| Meetings page cards render from EmDash in EN and ES | yes |
| Draft edit leaves the public page unchanged | yes |
| Publish (with confirmation) updates EN and ES; canceled meeting stays listed; "Next meeting" moves | yes |

## Problems found and how they were handled

1. **Times.** The datetime field shows and stores clock time with no time zone; it doesn't convert to the editor's zone.
   Fields are labeled "Central time", and the site converts America/Chicago to UTC, including across DST changes
   (`centralWallToUtc` in `cms/src/lib/meetings.js`).
2. **File lists.** A repeater containing file fields makes the whole entry read-only ("field types this version does not
   support"). Replaced with five fixed "Supporting material" file fields.
3. **Notice-posted date.** The site uses EmDash's publication date. Changing it requires `content:publish_any` (Editor and up), so
   Contributors and Authors can't, but Editors can. **Decided 2026-11-20: no lock.** Legal notice is published in at least two
   local newspapers, so the website date is a courtesy, not the notice of record. Rule for editors: don't change the publication date.

## Roles (from EmDash 1.5 permission rules)

Read from `@emdash-cms/auth` and `emdash/dist/authorize-*.mjs`, then checked live for Contributor.

**Live check, 2026-11-20** (second Entra account, through Access): the account was created as Contributor (20) on first
sign-in. It saved a draft meeting. Publishing that draft was refused ("Failed to publish, 1 of 1 could not be published"). The draft
stayed unpublished, and the public EN and ES Meetings pages did not change. The admin still shows Publish and Move to trash buttons
to a Contributor and refuses them only when clicked, so expect staff to see those errors. Opening a published meeting shows
every field greyed out (read-only), and the meeting's stored version did not change. Move to trash on a published meeting
was refused, and the meeting stayed published. All four results match the table below.

| Action | Contributor (20) | Author (30) | Editor (40) | Admin (50) |
|---|---|---|---|---|
| Create a meeting (draft) | yes | yes | yes | yes |
| Edit own entry while it is still a draft | yes | yes | yes | yes |
| Edit an entry after it is published | **no** | own only | any | any |
| Publish / unpublish | **no** | own only | any | any |
| Change publication date | no | no | yes | yes |
| Move to Trash | no | own only | any | any |
| Delete permanently (empty Trash) | no | no | no | yes |
| Upload files | yes | yes | yes | yes |
| Delete files (permanent) | no | own only | any | any |
| Redirects, content types, settings, users | no | no | no | yes |

**What this means for the workflow.** A Contributor clerk can draft new meetings, and an Editor publishes them. But once a meeting is
published, a Contributor can't change it: adding the agenda later, posting minutes, or marking it canceled would have to be done
by an Editor. The options:

- **A.** The clerk is an Editor, and approval is a habit, not enforced.
- **B.** The clerk is a Contributor, and the approver does every post-publish update.
- **C.** A small plugin adds an approval step: the clerk is an Author, and publishing is blocked until an approver signs off
  (EmDash's `content:beforePublish` hook).

**Chose A (2026-11-20).** Clerks are Editors; approval is by habit, and revision history records changes.
New Access users still start as Contributor, so an Admin promotes each clerk to Editor under Users. Editors can also delete
files and trash any entry, so the "never delete files" rule below is a habit too.

## Still open

- **Sign-in.** Done: Cloudflare Access with Entra in front of the whole spike Worker, verified 2026-11-19.
- **Roles live test.** Done 2026-11-20 for Contributor (see Roles). Workflow: option A (see Roles).
- **Deleting files** is permanent. Rule: never delete; add a new file instead. Under option A every clerk can delete, so this relies on training.
- **Accessibility pass on the admin screens** staff will use.
- **Remaining collections:** trainings, other agencies' jobs, RFPs. Then make the static pages editable one at a time.
- **CI.** Workers Builds needs a build command (`cd cms && npm ci && npm run build`) and a deploy from `cms/`. The site checks should
  point at the built output.

## Run it locally

```bash
cd cms
npm install
npm run dev          # http://localhost:4321 ; admin at /_emdash/admin
```

In local dev, open `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` to sign in as a local test admin. This works only in dev.
