# Launch runbook: shelbycounty911.org cutover

**Status:** draft, prepared 2026-11-18. Not yet approved. Nothing in this document has been executed.

This runbook moves `https://shelbycounty911.org/` from the WordPress site to the `sc911-website` Worker. It replaces the README's "review-only" charter **only once the project owner signs off on the gates below**.

## Approach

Use a **Workers route**, not a DNS change.

- Today the apex record is `shelbycounty911.org  A  134.209.121.124  Proxied` (the WordPress origin). **Leave it in place.**
- Add the route `shelbycounty911.org/*` → Worker `sc911-website`. Cloudflare then serves every request on the apex from the Worker, ahead of the origin and the edge cache.
- **Rollback = delete the route.** Traffic goes straight back to WordPress within seconds. No DNS records are created, deleted, or edited, so there's no TTL wait and nothing to rebuild.
- The zone already uses this pattern (`api` and `budget-api` route Workers over placeholder records).
- `www.shelbycounty911.org` and `http://` already 301 to `https://shelbycounty911.org/`. They keep working unchanged while WordPress stays up (see "After launch").
- The other 60 records in the zone (email, Microsoft 365, ArcGIS, Pages apps, tunnels) are untouched.

## Gates (all must be checked before cutover)

| # | Gate | Owner | Status |
|---|------|-------|--------|
| 1 | Old WordPress URLs redirect: pages, posts, events, ~150 uploads (PR #22) | Dev | PR open, checks green |
| 2 | Bilingual 404 page (PR #23) | Dev | PR open, checks green |
| 3 | Upcoming meetings match the official calendar (PR #24 fixes Exec Committee to Nov 23) | Owner | PR open |
| 4 | Careers page has real content (WordPress lists 3 current postings, updated 2026-11-18) | Owner | **Not started** |
| 5 | RFPs page has real content (currently "awaiting confirmation for this prototype") | Owner | **Not started** |
| 6 | Content owner and update process agreed (who posts meetings, minutes, jobs; turnaround) | Owner | **Not decided** |
| 7 | Accessibility check: pages (WCAG 2.1 AA) and a sample of public PDFs | Dev + Owner | **Not started** |
| 8 | Responsive check at phone, tablet, desktop widths, EN and ES | Dev | **Not started** |
| 9 | Go-live PR reviewed on its preview URL (see below) | Owner | **Not started** |
| 10 | Owner sign-off to lift the review-only charter, with name and date recorded here | Owner | **Not given** |

## Go-live PR (prepared, merged only at cutover)

One PR, merged during the cutover window, that:

1. Removes the `REVIEW SITE · Not the public website` banner and the `SC911 Design Review` / `Content Review` title suffixes from every page.
2. Removes `noindex` from page `<meta name="robots">`, `public/_headers` and `public/robots.txt`, and points `robots.txt` at a new `sitemap.xml`.
3. Changes `scripts/check-site.mjs` from "require noindex" to "forbid noindex" on production.
4. Changes `/ /index.html 302` in `_redirects` to `301`.
5. Adds `<link rel="canonical">` pointing at `https://shelbycounty911.org/...` on each page.
6. Updates the README to replace the review-only charter with the production process.

**Preview indexing after launch:** with `noindex` gone from `_headers`, PR preview URLs on `*.workers.dev` become indexable. Before merging, either set `"workers_dev": false` (previews still work through `preview_urls`), or confirm on a preview that a host-scoped `_headers` rule keeps `noindex` on `*.workers.dev`.

## Cutover steps

Run in a low-traffic window, weekday morning, with this runbook open. The project owner (or their delegate) runs every Cloudflare step.

**T-1 day**
1. Record evidence for rollback: screenshot the `shelbycounty911.org` A record and **Workers Routes** on the zone (expected: only `api` and `budget-api` routes).
2. Confirm `main` is green (`validate-site`, `Workers Builds`) and the review URL shows the go-live PR's preview content.
3. Post a notice to staff with the window and a contact.

**T-0**
1. Merge the go-live PR. Wait for **Workers Builds: sc911-website** on `main` to succeed. Note the new **Version ID** here: `________`.
2. Cloudflare dashboard → zone `shelbycounty911.org` → **Workers Routes** → **Add route**:
   - Route: `shelbycounty911.org/*`
   - Worker: `sc911-website`
   - Note the time: `________`
3. **Caching → Configuration → Purge Everything** on the zone (clears cached WordPress HTML).
4. Run the smoke test below. Any failure → **Rollback**.

**Smoke test** (from outside the district network if possible)

```bash
for p in / /index.html /es-index.html /meetings.html /past-meetings.html /does-not-exist; do printf '%-22s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://shelbycounty911.org$p)"; done
```

Expect `301` for `/`, `200` for pages, and `404` for `/does-not-exist`.

```bash
for p in /careers/ /transparency/ /archives/ /using-9-1-1/ /wp-content/uploads/2016/02/06-30-2007-Audit.pdf; do printf '%-60s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' https://shelbycounty911.org$p)"; done
```

Expect `301` to the matching new page or `/documents/...` file.

```bash
curl -sI https://shelbycounty911.org/index.html | grep -i x-robots-tag
```

Expect no `noindex`.

Also by hand: the home page renders in EN and ES on a phone, the latest board minutes PDF opens, `https://www.shelbycounty911.org/` lands on the new home page, and other subdomains (`gis`, `board`, `budget`, `dashboard`, `apps`) still work.

## Rollback

Takes under a minute. Use it if the smoke test fails or a serious problem is reported.

1. Cloudflare → zone `shelbycounty911.org` → **Workers Routes** → delete `shelbycounty911.org/*`.
2. **Purge Everything** on the zone.
3. Check that `curl -sI https://shelbycounty911.org/ | grep -i wp-json` returns the WordPress `Link:` header.
4. Leave the go-live PR merged (it only affects the Worker), or revert it if the review URL must go back to `noindex`.

WordPress is not modified at any point, so rollback restores the exact pre-launch site.

## After launch

- **Day 1:** submit `https://shelbycounty911.org/sitemap.xml` in Google Search Console and Bing Webmaster Tools. Watch Cloudflare analytics for 404 spikes and add redirects for any real old URLs that show up.
- **Week 1:** keep WordPress running and untouched as the rollback target. Freeze edits there and tell staff that WordPress changes no longer appear on the public site.
- **Day 30 or later:** decommission WordPress only after (a) `www` and `http` redirects are reproduced as a Cloudflare Redirect Rule (WordPress does them today), (b) a final export and archive of WordPress content and uploads is stored per the district's records-retention schedule, and (c) the owner approves. Only then change or remove the apex A record, replacing it with a placeholder `AAAA 100::` (proxied) like `api` uses.

## Sign-off

| Role | Name | Date |
|------|------|------|
| Project owner (lifts review-only charter) | | |
| Cutover performed by | | |
| Smoke test verified by | | |
