# SC911 website

The new public website for the Shelby County, TN Emergency Communications District, replacing the WordPress site at
`shelbycounty911.org`. It is built on [EmDash](https://github.com/emdash-cms/emdash) (Cloudflare's CMS on Astro) and runs
as a Cloudflare Worker. Staff edit meetings, jobs, trainings, RFPs and audits in the EmDash admin; everything else is
approved page content in this repository.

**Status:** not live yet. `shelbycounty911.org` is still WordPress. The launch plan is in PR #25
(`docs/LAUNCH-RUNBOOK.md` once merged).

## Sites

| Site | Address | What it is |
|---|---|---|
| Test site (EmDash) | https://sc911-cms-spike.shelby-county-911-district.workers.dev/ | The new site, built from `main`. Public pages are open; the admin (`/_emdash/admin`) needs Microsoft sign-in through Cloudflare Access. Not indexed by search engines. |
| Static review site | https://sc911-website.shelby-county-911-district.workers.dev/index.html | The original approved mockup (`public/`). Retired after launch. |
| Production | https://shelbycounty911.org/ | Planned: a separate Worker `sc911-cms`, switched on with a Workers route (see the runbook). |

## Repository layout

| Path | Contents |
|---|---|
| `site/pages/` | The approved pages, English and `es-` Spanish pairs. **Edit page text here.** |
| `site/shared/` | Shared header and footer (`en-`/`es-header.html`, `-footer.html`), used by every page on both sites. |
| `public/` | Stylesheets, images, `documents/` (the 2006–2025 archive PDFs), `_redirects` (old WordPress addresses). `public/*.html` is generated: never edit it by hand. |
| `cms/` | The EmDash site: `astro.config.mjs`, `wrangler.jsonc`, collections in `seed/seed.json`, page logic in `src/`, build scripts in `scripts/`. |
| `cms/src/lib/` | How collections become page content: `meetings.js` + `render.js` (Meetings, Meeting records, audits), `listings.js` (Training, Careers, RFPs), `feeds.js` (RSS). |
| `scripts/` | Root build and checks for the page files (`build-site.mjs`, `check-site.mjs`, `check-cleanup.mjs`). |
| `docs/` | Decisions, runbook and notes (below). |

## How changes get published

- **Content** (meetings, minutes, jobs, trainings, RFPs, audits, uploaded PDFs) is edited in the admin and is live as soon
  as it is published. No code change. Staff instructions: the "SC911 Website: Staff How-To" doc (ask the project owner).
- **Code and page changes** go through a pull request:
  1. Branch from `main` (`content/…`, `cms/…`, `docs/…`).
  2. Make the change, then run the checks below.
  3. Open a PR. Required checks: `validate-site` and `Workers Builds: sc911-website`. `main` is protected, and branches
     must be up to date with `main` before merging. Merge with **squash**.
  4. Merging to `main` deploys automatically through Cloudflare Workers Builds: the test site (`sc911-cms-spike`, root
     `cms/`) and the static review site (`sc911-website`). A deploy takes about 2 minutes and never changes content.

## Editing pages, header, footer and styles

1. Edit `site/pages/*.html` (both languages), `site/shared/*`, or `public/*.css`.
2. `npm run build` regenerates `public/*.html`. Commit both the source and the generated files.
3. `npm run check`, `node scripts/build-site.mjs --check`, `node scripts/check-cleanup.mjs` and
   `node scripts/check-emdash-indexing.mjs` must pass. CI runs the same.

## Test site and production builds

One build setting decides which site a build is for (`cms/scripts/site-env.mjs`): Workers Builds for the production
Worker `sc911-cms` sets the build variable `CLOUDFLARE_ENV=production`. That selects the `production` environment in
`cms/wrangler.jsonc` (its own D1 database and R2 bucket) and builds the indexable site:

| | Test site (`sc911-cms-spike`) | Production (`sc911-cms`) |
|---|---|---|
| Search engines | `noindex` meta and header, `robots.txt` disallows all | Indexed on `shelbycounty911.org` only; its `workers.dev` address stays `noindex` |
| Canonical and `hreflang` links | none | `https://shelbycounty911.org/…` |
| `sitemap.xml` | none | every page, EN and ES |
| Footer | "· Review site" label | no label |

`scripts/check-emdash-indexing.mjs` builds both and fails if either is wrong. The `shelbycounty911.org/*` route is not in
`wrangler.jsonc`; it is added by hand at cutover (launch runbook).

The EmDash site reads the same `site/` files at build time (`cms/scripts/build-static.mjs`), serves them at short URLs
(`/meetings/`, Spanish under `/es/`, mapped in `cms/redirects/url-map.json`), and fills in the collection-driven parts at
request time.

## Running the EmDash site locally

Requires the Node version in `cms/node_modules/astro` (22.23 or newer).

```bash
cd cms
npm install
npm run dev
```

Open http://localhost:4321/. For the admin, open `/_emdash/api/setup/dev-bypass?redirect=/_emdash/admin` (local only;
signs you in as a test Admin). Local data lives in `cms/.wrangler/state` and can be deleted to start fresh. On Windows,
stopping the dev server can leave `workerd` processes that lock that folder; end them before deleting it.

`npm run build` in `cms/` checks a production build.

## Things to know about EmDash here

- **Collections:** `meetings`, `trainings`, `psap_jobs` (other agencies' 9-1-1 center jobs; District jobs stay in
  BambooHR), `rfps`, `audits`. Defined in `cms/seed/seed.json`.
- **A seed only applies when a site is first set up.** A new collection or field must also be added to existing sites
  (test, production) through the admin's Content types or the schema API.
- **Times are Central wall-clock time.** EmDash stores datetimes without a time zone; the site converts them
  (`centralWallToUtc` in `cms/src/lib/meetings.js`).
- **Uploaded files** are public at `/files/<key>`; Access protects everything under `/_emdash`.
- **RSS feeds:** `/feed/`, `/meetings/feed.xml`, `/training/feed.xml`, `/careers/feed.xml`, `/rfps/feed.xml`.
- **Roles:** new sign-ins are Contributors (drafts only). Clerks are Editors. Admins manage users and content types.
- **Secrets** (`EMDASH_ENCRYPTION_KEY`, `CF_ACCESS_AUDIENCE`) are Worker secrets, never in the repository. `.env.*` and
  `.dev.vars` are git-ignored or must stay uncommitted.

## Rules

- **Bilingual:** every page and public text has an English and a Spanish version.
- **Approved decisions** are recorded in [`docs/design/DECISIONS.md`](docs/design/DECISIONS.md); change them only with the
  project owner's approval, and record the change there. District naming follows
  [`docs/DISTRICT-NAMING.md`](docs/DISTRICT-NAMING.md): "Shelby County, TN Emergency Communications District".
- **No production DNS or route changes** without the project owner. The cutover is a Workers route, done during launch.
- **Keep the test site non-indexed** (`noindex`); only the production build is indexable (see above).
- **Never commit** WordPress backups, SQL dumps, credentials, tokens or restricted records. This repository is public.
- **Accessibility:** WCAG 2.1 AA for pages; uploaded PDFs should be tagged.

## Docs

| Doc | What it covers |
|---|---|
| [`docs/EMDASH-SPIKE.md`](docs/EMDASH-SPIKE.md) | How the EmDash site is built, roles, collections, records, feeds, deploys |
| `docs/LAUNCH-RUNBOOK.md` (PR #25) | Launch decisions, gates, cutover, smoke test, rollback |
| [`docs/design/DECISIONS.md`](docs/design/DECISIONS.md) | Owner-approved design and content decisions |
| [`docs/DISTRICT-NAMING.md`](docs/DISTRICT-NAMING.md) | The District's formal name and where it is used |
| `docs/design/*-MOCKUP.md` | Design history of individual pages |
