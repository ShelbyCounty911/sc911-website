# Setup completion report — ShelbyCounty911/sc911-website

**Generated:** 2026-09-10 (inspection session)  
**Main tip inspected:** `4b4e283edfb50545289419233d06d86443fa88b4`  
**Method:** Live GitHub API / Actions / rulesets / classic branch protection; Cloudflare Worker inventory via API + Wrangler deployments/versions; live HTTP checks of the workers.dev review host. Dashboard Builds connection settings were evidenced by owner screenshots after reconnect (`?new-connection=true`). Workers Builds trigger list API returned HTTP 403 with the available Wrangler OAuth token (Builds endpoints not readable that way).

This report distinguishes **verified in this inspection** from **configured but not demonstrated**. It is not an accessibility acceptance review.

---

## 1. GitHub Actions

### Workflow files, triggers, check names

| Item | Evidence |
|------|----------|
| Workflow file | `.github/workflows/site-checks.yml` (only workflow on `main`) |
| Workflow display name | `Site checks` |
| Triggers | `push` to `main`; `pull_request` targeting `main` |
| Job id / check name | `validate-site` / **`validate-site`** |
| Runner steps | `actions/checkout@v4` → `actions/setup-node@v4` (Node 20) → `node scripts/check-site.mjs` |

### What the checks cover (`scripts/check-site.mjs`)

| Area | Behavior |
|------|----------|
| Internal links + fragments | Every HTML under `public/`: resolve local `href`/`src` (skip `http(s)`, `mailto:`, `tel:`, `data:`, `javascript:`, empty/`#`). Fail if missing. For `#fragment` targets on HTML, require matching `id`. |
| Assets | Same pass: local asset paths must exist under `public/`. |
| English/Spanish pairs | Root HTML: `index.html` ↔ `es-index.html`, `foo.html` ↔ `es-foo.html`. Allowed unpaired: `review.html` only. Nested HTML not pair-checked. |
| Preview noindex | Every HTML needs robots meta containing `noindex`; `public/robots.txt` must contain `Disallow: /`; `public/_headers` must contain `X-Robots-Tag` and `noindex`. |

### Latest PR, SHAs, workflow runs, command output

| Item | Value |
|------|-------|
| CI setup PR | https://github.com/ShelbyCounty911/sc911-website/pull/2 (MERGED 2026-09-10T17:29:34Z) |
| Merge commit | `4b4e283edfb50545289419233d06d86443fa88b4` |
| PR head before merge | `a4b0050d3aa4a6b102e7eb1e7d27faf62bb72078` |
| Actions run (PR) | https://github.com/ShelbyCounty911/sc911-website/actions/runs/34505135401 — `pull_request` — **success** |
| Actions run (push/main) | https://github.com/ShelbyCounty911/sc911-website/actions/runs/34508541611 — `push` — **success** |

Local command on current `main` checkout:

```text
Checking 73 HTML file(s) under public/…
PASS: Links/assets: all local href/src targets resolve (73 HTML files)
PASS: Language pairs: EN/ES matched (37 EN, 36 ES; unpaired allowed: review.html)
PASS: Preview indexing: robots noindex meta present on all 73 HTML files
PASS: Preview indexing: public/robots.txt contains Disallow: /
PASS: Preview indexing: public/_headers contains X-Robots-Tag and noindex
Result: PASS
```

### Skipped checks / non-blocking failures

- No other GitHub Actions workflows exist (no a11y, visual, or deploy workflows).
- Ruleset/classic protection require **only** `validate-site`. Cloudflare’s `Workers Builds: sc911-website` check is **not** a required status check for merging.
- `required_approving_review_count` is **0** (PR still required; human Approve not required). Self-approval had been a blocker earlier; approval count was lowered so owners can merge their own PRs while still requiring the PR + check.

---

## 2. Protection of `main`

### Active ruleset (API)

| Field | Value |
|-------|-------|
| id | `22798472` |
| name | `Protect main` |
| enforcement | `active` |
| target | `refs/heads/main` |
| UI | https://github.com/ShelbyCounty911/sc911-website/rules/22798472 |
| Required status checks | **`validate-site`**, `strict_required_status_checks_policy: true` |
| Pull request rule | present; **`required_approving_review_count: 0`** |
| Force-push | blocked (`non_fast_forward`) |
| Deletion | blocked (`deletion`) |
| bypass_actors | `[]` (`current_user_can_bypass: never` on inspection principal) |

### Classic branch protection (API, HTTP 200)

| Field | Value |
|-------|-------|
| Required checks | `validate-site`, `strict: true` |
| Required PR reviews object | present; approving count **0** |
| `allow_force_pushes` | false |
| `allow_deletions` | false |
| `enforce_admins` | **true** |

**Verified:** Pull requests are required to update `main`, and **`validate-site` must pass** (strict). Admin enforce is on for classic protection; ruleset shows no bypass actors for the inspecting token.

---

## 3. Cloudflare Git integration

### Connection (dashboard evidence + GitHub check evidence)

Owner dashboard after reconnect showed Git repository **`ShelbyCounty911/sc911-website`**, banner *“You can now push a commit…”*, URL param `?new-connection=true`, with:

| Setting | Value (dashboard) |
|---------|-------------------|
| Account | Shelby County 911 District (`fd14180882e36accc0cf6a3c42d3c391`) |
| Worker | **`sc911-website`** (renamed from `sc911-team-review`; same script tag `6c73cbbc730a4521848b467489862b4a`) |
| Connected repository | `ShelbyCounty911/sc911-website` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | None |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Builds for non-production branches | enabled (checkbox) |

Workers Builds REST (`/builds/triggers`, `/builds/repos/connections`) returned **403** with Wrangler OAuth in this environment — connection details above are from dashboard screenshots + successful GitHub check-run metadata, not from listing triggers via API.

### Target Worker name — important correction

**The live target is `sc911-website`, not `sc911-team-review`.**  
Evidence: Cloudflare Workers list shows `sc911-website` only (no `sc911-team-review`); `wrangler.jsonc` on `main` has `"name": "sc911-website"`; old host `https://sc911-team-review.shelby-county-911-district.workers.dev/index.html` returns **404**; new host returns **200**.

### Successful Git-triggered deployment (distinct from manual Wrangler)

| Field | Value |
|-------|-------|
| Source commit | `4b4e283edfb50545289419233d06d86443fa88b4` (merge of PR #2) |
| GitHub check | `Workers Builds: sc911-website` — **success** |
| Check run | https://github.com/ShelbyCounty911/sc911-website/runs/102976838697 |
| Cloudflare Build ID | `7e1f8cde-0775-4b60-a9dc-3c4fcb119a8d` |
| Dashboard build URL | https://dash.cloudflare.com/fd14180882e36accc0cf6a3c42d3c391/workers/services/view/sc911-website/production/builds/7e1f8cde-0775-4b60-a9dc-3c4fcb119a8d |
| Worker Version ID | `860655b2-d9ac-49c6-84e5-aead2eef2306` (created 2026-09-10T17:30:11Z; also listed by `wrangler deployments list --name sc911-website`) |
| Review URL | https://sc911-website.shelby-county-911-district.workers.dev/index.html |

**Manual Wrangler contrast:** Earlier version `777f2635-36b4-4f87-a2db-6bc5f29003a0` (2026-09-10T05:15Z) was a CLI/`wrangler deploy` upload before Git Connect. The `860655b2-…` version is tied to the Cloudflare Workers Builds check on the merge commit.

### Pull request previews

| Topic | Evidence |
|-------|----------|
| Dashboard | “Builds for non-production branches” enabled; version command `npx wrangler versions upload` |
| `wrangler.jsonc` | `"preview_urls": false` on `main` |
| PR #2 branch head `a4b0050…` | Only check present: `validate-site`. **No** `Workers Builds: …` check on that PR head |
| Preview URL / noindex on a PR preview host | **Not demonstrated** in this inspection (no PR preview deployment check-run found for PR #2) |

Production workers.dev review host **does** send `x-robots-tag: noindex, nofollow, noarchive` (verified via live `curl` on HTML/CSS/images/robots.txt).

### Does GitHub Actions also deploy?

**No.** The only Actions workflow runs `node scripts/check-site.mjs` only (no Wrangler/Cloudflare deploy actions). Publishing is via Cloudflare Workers Builds (and optional manual `npm run deploy` / Wrangler).

### Do checks gate publishing or only merging?

| Gate | Fact |
|------|------|
| Merging to `main` | Gated by **`validate-site`** (required + strict) |
| Cloudflare publishing | **Not** gated by GitHub required checks; Workers Builds ran independently on the merge push. Manual Wrangler deploy is also not blocked by GitHub status checks |

---

## 4. Baseline and deployment validation

### Mockup package comparison

| Item | Result |
|------|--------|
| Baseline used | `/workspace/sc911-cursor-review/public` from the GitHub package clone used for the first approved review deploy |
| Compared to | Current `main` `public/` (`git clone` tip `4b4e283…`) |
| Method | `diff -rq` |
| File counts | 221 files each side |
| Differences | **Only** `public/review.html`: added `<meta name="robots" content="noindex,nofollow">` so CI noindex check passes. No other public file content differences reported by `diff -rq` |

### Live checks (review host) — not accessibility acceptance

Host: `https://sc911-website.shelby-county-911-district.workers.dev`

| Check | Result |
|-------|--------|
| EN/ES homes, meetings, resources, past-meetings | HTTP **200** |
| `style.css`, seal + slogan images | HTTP **200** |
| Sample PDF | HTTP **200**, `%PDF-1.4` |
| Sample MP3 | HTTP **200**, MPEG frame sync |
| `X-Robots-Tag` | `noindex, nofollow, noarchive` on sampled responses |
| `robots.txt` | HTTP **200** |
| Local `node scripts/check-site.mjs` on main | **PASS** (see §1) |

Navigation presence was previously validated in browser/layout passes during deploy work; this reporting pass reconfirmed key EN/ES routes and assets over HTTP.

### Production DNS / custom domains / production website

| Item | Result |
|------|--------|
| Custom domains on Worker `sc911-website` | **0** (Cloudflare API) |
| Production website / DNS changes | **None observed**; work stayed on `*.workers.dev` review Worker |

---

## Completion classification

### Completed and independently verified in this session

1. GitHub Actions `Site checks` / `validate-site` on `main` and on PR #2 (workflow YAML + successful runs + local script PASS).  
2. `Protect main` ruleset + classic protection requiring PR + `validate-site` (API-readable).  
3. Cloudflare Git-connected Worker **`sc911-website`** auto-deployed from merge commit `4b4e283…` (Build `7e1f8cde-…`, Version `860655b2-…`, live review URL 200 + noindex).  
4. GitHub Actions does not deploy.  
5. Mockup `public/` parity aside from `review.html` noindex meta.  
6. No custom domains on the review Worker.

### Configured but not yet demonstrated

1. **Non-production / PR preview deployments** (dashboard enables non-production builds; PR #2 head had no Workers Builds check; no preview URL verified).  
2. Direct API listing of Builds triggers/connections (403 with available OAuth).  
3. Human approving reviews as a merge gate (intentionally set to **0** after self-approve blocker).

### Failures, blockers, remaining work

1. Worker rename: documentation or stakeholder language that still says **`sc911-team-review`** must be read as **`sc911-website`**.  
2. Optional: add `Workers Builds: sc911-website` as a required check if publishing must be proven before merge (currently gates merge only, not CF publish).  
3. Optional: demonstrate a PR-branch preview URL and verify noindex on that preview host.  
4. Production cutover, accessibility certification, and content verification remain out of scope for this review setup.

### Exact next action (if any)

None required for the three setup items to be considered **implemented and evidenced**. Optional follow-up: open a no-op PR branch and confirm a Workers Builds non-production run + preview URL/noindex if preview behavior must be proven.
