# Launch runbook: shelbycounty911.org cutover to EmDash

**Status:** draft, rewritten 2026-11-20 for the EmDash site (#29). Nothing in this document has been executed.

This runbook moves `https://shelbycounty911.org/` from WordPress to the EmDash site in `cms/`. The owner approved the move
to EmDash on 2026-11-20 (`docs/design/DECISIONS.md`). The cutover itself still needs the owner's sign-off at the end.

## How it works

- **A Workers route, not a DNS change.** The apex record `shelbycounty911.org A 134.209.121.124 Proxied` (WordPress) stays.
  Adding the route `shelbycounty911.org/*` → production Worker sends every request on the apex to EmDash, ahead of WordPress.
- **Rollback = delete the route.** WordPress serves again within seconds. No DNS edits, no TTL wait.
- `www.shelbycounty911.org` and `http://` already 301 to `https://shelbycounty911.org/` (WordPress does this) and keep working
  while WordPress stays up.
- The zone's other records (email, Microsoft 365, ArcGIS, apps, tunnels) are untouched.

## Decisions for the owner

| # | Decision | Recommendation |
|---|---|---|
| D1 | Production Worker: a new one, or promote the test Worker `sc911-cms-spike`? | **Decided 2026-11-20: new Worker `sc911-cms`** with its own database and file storage. The test Worker stays as staging, so changes can be tried before they reach the public site. Content to re-enter at launch is small (meetings, three jobs). |
| D2 | Who can sign in to the production admin? | **Decided 2026-11-20: Entra group `SEC-SSO-Employees-Users-Prod`.** Any member can sign in and arrives as Contributor (draft only); an Admin promotes clerks to Editor. Access needs the group's object ID and group claims enabled on the Entra login method. |
| D3 | **Open.** How are uploaded files (agendas, minutes, RFP documents) served? | EmDash serves them from `/_emdash/api/media/file/…`. Keep that path **public** with an Access *Bypass* rule (below). The alternative is a public R2 bucket on its own domain, which means one more DNS name. |
| D4 | What happens to the static review site `sc911-website.…workers.dev`? | **Decided 2026-11-20: retire it after launch.** The test Worker replaces it as the review site. |

## Sign-in on the public site

On the test site, Access protects the whole hostname. In production the public pages must be open, so Access protects only
the admin:

| Access application | Destination | Policy |
|---|---|---|
| SC911 site admin | `shelbycounty911.org/_emdash` (covers everything under it) **and** the production Worker's `workers.dev` hostname | Allow: Entra group `SEC-SSO-Employees-Users-Prod` (D2), Entra ID only |
| SC911 site files | `shelbycounty911.org/_emdash/api/media/file` | **Bypass: everyone** (the more specific path wins, so files stay public) |

- Use **one** application for both admin destinations. EmDash checks one Access audience tag (`CF_ACCESS_AUDIENCE`), and each
  application has its own.
- Access must be in place **before the first deploy** of the production Worker: the first person to sign in becomes Admin.
- New editors arrive as Contributor. An Admin promotes each clerk to Editor (workflow option A).

## Code changes before launch (one PR, "production mode")

The test site must stay hidden from search engines while production is indexable, so production differences come from a
build setting (`SITE_ENV=production`), not from editing the approved pages:

1. `cms/scripts/build-static.mjs`: in production, remove the `REVIEW SITE · Not the public website` banner, the
   `SC911 Design Review` / `Content Review` title suffixes and `<meta name="robots" content="noindex…">`; add
   `<link rel="canonical" href="https://shelbycounty911.org/…">`; write `sitemap.xml` from the page list.
2. `cms/scripts/sync-assets.mjs`: in production, write a `robots.txt` that allows crawling and names the sitemap, and drop the
   `noindex` rule from `_headers`.
3. `cms/src/pages/[...path].astro` and `404.astro`: send `X-Robots-Tag: noindex` only outside production.
4. `cms/wrangler.jsonc`: a `production` environment with name `sc911-cms`, its own D1 and R2, `workers_dev: true`
   (behind Access, for admin setup before cutover), `preview_urls: false`, and **no** `routes` (the route is added by hand).
5. Site checks (`scripts/check-site.mjs`) learn the EmDash build: the test build must be `noindex`; the production build must not be.
6. README: replace the review-only charter with the production process.

**To verify on the test Worker first:** that a Workers Builds deploy leaves a dashboard-added route in place, and that the
build picks the production environment from `CLOUDFLARE_ENV=production`.

## Gates (all checked before cutover)

| # | Gate | Owner | Status |
|---|---|---|---|
| 1 | Old WordPress URLs redirect (pages, posts, events, uploads); 269 rules in `cms/public/_redirects` | Dev | Done on test site |
| 2 | Bilingual 404 page | Dev | Done on test site |
| 3 | Decisions D1–D4 made | Owner | D1, D2, D4 decided 2026-11-20; **D3 open** |
| 4 | Production-mode PR merged; test site still `noindex` | Dev | **Not started** |
| 5 | Production Worker, D1, R2, Access apps (admin + file bypass) created; Admin signed in first | Owner (dashboard) | **Not started** |
| 6 | Content entered on production: upcoming meetings, 9-1-1 center jobs, any trainings/RFPs; checked against the official calendar | Clerk + Owner | **Not started** |
| 7 | RFPs page: real content, and the RFP card design approved | Owner | **Not started** |
| 8 | Spanish review of all pages, including the new collection wording | Owner | **Not started** |
| 9 | Accessibility (WCAG 2.1 AA) and responsive checks, EN and ES, public pages and the admin screens clerks use | Dev + Owner | **Not started** |
| 10 | Clerks have signed in, been promoted to Editor, and received the one-page how-to | Owner | **Not started** |
| 11 | Owner sign-off, with name and date recorded below | Owner | **Not given** |

## Cutover steps

Run in a low-traffic window on a weekday morning. The project owner (or a delegate) runs every Cloudflare step.

**T-1 day**
1. Screenshot the `shelbycounty911.org` A record and the zone's **Workers Routes** (expected: only `api` and `budget-api`).
2. Confirm `main` is green and the production Worker's latest build succeeded. Note its Version ID: `________`.
3. On the production `workers.dev` address (signed in), spot-check Home, Meetings and Careers in EN and ES.
4. Tell staff the window and a contact. Freeze WordPress edits.

**T-0**
1. Zone `shelbycounty911.org` → **Workers Routes** → **Add route**: `shelbycounty911.org/*` → Worker `sc911-cms`. Time: `________`
2. **Caching → Configuration → Purge Everything** on the zone.
3. Run the smoke test. Any failure → **Rollback**.

**Smoke test** (from outside the District network if possible)

```bash
for p in / /es/ /meetings/ /es/meetings/ /records/ /careers/ /training/ /rfps/ /does-not-exist/; do printf '%-18s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://shelbycounty911.org$p)"; done
```

Expect `200` for pages and `404` for `/does-not-exist/`.

```bash
for p in /meetings.html /careers.html /transparency/ /using-9-1-1/ /wp-content/uploads/2016/02/02-05-15-Board-Meeting-Minutes.pdf; do printf '%-62s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://shelbycounty911.org$p)"; done
```

Expect `301` to the new page or `/documents/…` file.

```bash
curl -sI https://shelbycounty911.org/ | grep -i x-robots-tag
```

Expect no output (no `noindex`).

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://shelbycounty911.org/_emdash/admin
```

Expect a redirect to `sc911.cloudflareaccess.com` (the admin is protected).

By hand: open a meeting agenda PDF from the Meetings page in a private window (files must open without signing in); sign in
to `/_emdash/admin` as an editor; check that `https://www.shelbycounty911.org/` lands on the new home page; check that other
subdomains (`gis`, `board`, `budget`, `dashboard`, `apps`) still work.

## Rollback

Under a minute. Use it if the smoke test fails or a serious problem is reported.

1. Zone → **Workers Routes** → delete `shelbycounty911.org/*`.
2. **Purge Everything** on the zone.
3. `curl -sI https://shelbycounty911.org/ | grep -i wp-json` returns the WordPress `Link:` header.

WordPress is not changed at any point, so rollback restores the pre-launch site. Content entered in EmDash stays in the
production database for the next attempt.

## After launch

- **Day 1:** submit `https://shelbycounty911.org/sitemap.xml` to Google Search Console and Bing Webmaster Tools. Watch
  Cloudflare analytics for 404s and add redirects for real old URLs that show up.
- **Week 1:** keep WordPress running, untouched, as the rollback target.
- **Day 30 or later**, with owner approval: reproduce the `www` and `http` redirects as a Cloudflare Redirect Rule, archive
  a final WordPress export and uploads per the records-retention schedule, then retire WordPress and replace the apex A
  record with a proxied placeholder (`AAAA 100::`, as `api` uses). Retire the static review Worker `sc911-website` (D4).

## Sign-off

| Role | Name | Date |
|---|---|---|
| Project owner (approves cutover) | | |
| Cutover performed by | | |
| Smoke test verified by | | |
