# EmDash spike (November 19, 2026)

Branch `spike/emdash`. The EmDash site is in `cms/` (EmDash 1.5.0, Astro 7, Cloudflare template). It was tested
locally only. Nothing has been deployed, and the review Worker is unchanged.

This spike evaluates replacing the static site and the Lists + Power Automate publishing design
(`CONTENT-PUBLISHING-DESIGN.md`, PR #27/#28) with EmDash. Before it merges, the owner decision
"Stay on static HTML/CSS mockup — No Astro/CMS" in `design/DECISIONS.md` must be reversed.

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
3. **Notice-posted date.** The site uses EmDash's publication date, and editors can change it in the admin. For the Open Meetings
   Act record this has to be locked down: a plugin, or a role that can't change it. Still open.

## Still open before deciding

- **Sign-in.** Cloudflare Access with Entra (GCC) in front of `/_emdash/admin`, mapping groups to roles. Needs a deployed test Worker
  and an Access application (user steps).
- **Approval.** Contributors draft and Editors publish. Confirm Contributors can't publish or delete, and that only Admins can empty Trash.
- **Deleting media** is permanent. Rule: never delete; add a new file instead.
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
