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

## Trainings, other agencies' jobs and RFPs

Three more collections in `cms/seed/seed.json`, rendered by `cms/src/lib/listings.js` into the approved pages. All dates are
Central time, like meetings. If a collection can't be read, the approved static page is served unchanged.

| Collection | Page | What shows |
|---|---|---|
| Trainings (`trainings`) | `/training/` | Upcoming only; each leaves the page after its end time. Cards use the approved Training design: classes show the time, conferences show dates only. Canceled events stay listed, marked canceled. With none upcoming, the approved "No upcoming events" panel shows. |
| 9-1-1 center jobs (`psap_jobs`) | `/careers/`, "Jobs at 9-1-1 centers" only | Other agencies' jobs. District jobs stay in the BambooHR embed and are not touched. A job leaves the page the day after its closing date. The card shows "Apply by", "Continuous posting" or "Posted". "Last reviewed" is the latest edit. The "These are not District jobs" notice stays. |
| RFPs (`rfps`) | `/rfps/` | "Open" (status Open, due date not passed) and "Recently closed" (due in the last 12 months). Solicitation, up to three addenda and an award notice as files. |

Spanish pages use the Spanish fields when filled in, otherwise English (marked `lang="en"`). Job titles stay in English.
The agency list holds the three agencies posting today; an Admin adds more under Content types.

**Deployed site.** A seed only applies when a site is first set up, so the three collections have to be added to the
deployed site separately (through the schema API or Content types), before or after deploying the code.

Verified locally: sample entries in each collection render on the EN and ES pages. Past trainings, closed jobs and RFPs more
than a year old are hidden. The admin edit forms open with every field editable.

## RSS feeds

EmDash 1.5 has no feeds built in, so `cms/src/lib/feeds.js` builds RSS 2.0 from the same published entries as the pages.
Feeds are in English and list the same items the pages show.

| Feed | Items |
|---|---|
| `/meetings/feed.xml` | Meetings from the past 12 months and upcoming, with agenda, minutes and recording links |
| `/training/feed.xml` | Upcoming trainings and conferences |
| `/careers/feed.xml` | 9-1-1 center jobs (other agencies) still open |
| `/rfps/feed.xml` | Open RFPs and those closed in the last 12 months, with documents |
| `/feed/` | All of the above, newest 50 (the old WordPress feed address; its redirect to the home page was removed) |

Each item's date is the entry's last edit, so readers sort an updated meeting (agenda or minutes added) to the top. Pages link
their feed in `<head>` so browsers and feed readers find it.

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
- **Remaining collections.** Built 2026-11-20 (see below). Next: make the static pages editable one at a time.
- **CI.** Workers Builds is connected (2026-11-20; see "Automatic deploys"). The GitHub site checks still test the static site, not
  `cms/`.

## Automatic deploys

The `sc911-cms-spike` Worker is connected to this repository with Workers Builds (Worker → Settings → Builds):

| Setting | Value |
|---|---|
| Production branch | `spike/emdash` (change to `main` when this merges) |
| Root directory | `cms` |
| Build command | `npm ci && npm run build` (the `prebuild` step reads `../site` and `../public`) |
| Deploy command | `npx wrangler deploy` |
| Preview builds | Off (preview URLs would bypass Access) |
| Build variable | `NODE_VERSION=24` (Astro 7 needs Node 22.23 or newer) |
| API token | Existing "Workers Builds - 2026-09-10" token |

`EMDASH_ENCRYPTION_KEY` and `CF_ACCESS_AUDIENCE` are Worker secrets, not build variables; deploys keep them. The D1 database
ID is committed in `cms/wrangler.jsonc`. Content lives in D1 and R2, so a deploy never changes content, and a new collection
still has to be added to the live site separately (see "Trainings, other agencies' jobs and RFPs").

## Run it locally

```bash
cd cms
npm install
npm run dev          # http://localhost:4321 ; admin at /_emdash/admin
```

In local dev, open `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` to sign in as a local test admin. This works only in dev.
