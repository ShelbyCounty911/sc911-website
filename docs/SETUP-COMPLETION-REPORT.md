# Setup completion report — ShelbyCounty911/sc911-website

**Updated:** 2026-09-10 (corrections for previews, approvals, and pending work)  
**Main tip at first Git deploy:** `4b4e283edfb50545289419233d06d86443fa88b4`  
**Method:** Live GitHub API / Actions / rulesets / classic branch protection; Cloudflare Worker inventory; live HTTP checks of the workers.dev review host and attempted versioned preview hosts. Dashboard Builds connection settings were evidenced by owner screenshots after reconnect (`?new-connection=true`). Workers Builds trigger list API returned HTTP 403 with the available Wrangler OAuth token (Builds endpoints not readable that way).

This report distinguishes **verified**, **approved decisions**, **in progress (PR #4)**, and **pending demonstration**. It is not an accessibility acceptance review. It does **not** claim that setup is finished with nothing remaining.

---

## Approved decisions (owner)

| Decision | Status |
|----------|--------|
| Worker rename to **`sc911-website`** (from `sc911-team-review`) | **Approved** — live target |
| Review URL `https://sc911-website.shelby-county-911-district.workers.dev/index.html` | **Approved** — active review host |
| `required_approving_review_count: 0` on Protect main + classic protection | **Intentional** — GitHub does **not** enforce human Approve as a merge gate |
| PR preview URLs for non-`main` / PR branches | **Required** project policy (implementation in progress via [PR #4](https://github.com/ShelbyCounty911/sc911-website/pull/4)) |

**Project policy (outside GitHub’s merge gate):** Consequential changes still require **recorded owner approval**, even though GitHub does not require a human Approve click to merge.

Historical Worker / version IDs from before the rename remain valid as history. The **active** target name is always **`sc911-website`**.

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

### Evidence from CI setup (PR #2)

| Item | Value |
|------|-------|
| CI setup PR | https://github.com/ShelbyCounty911/sc911-website/pull/2 (MERGED) |
| Merge commit | `4b4e283edfb50545289419233d06d86443fa88b4` |
| PR head before merge | `a4b0050d3aa4a6b102e7eb1e7d27faf62bb72078` |
| Actions run (PR) | https://github.com/ShelbyCounty911/sc911-website/actions/runs/34505135401 — `pull_request` — **success** |
| Actions run (push/main) | https://github.com/ShelbyCounty911/sc911-website/actions/runs/34508541611 — `push` — **success** |

Local `node scripts/check-site.mjs` on that `main` tip:

```text
Checking 73 HTML file(s) under public/…
PASS: Links/assets: all local href/src targets resolve (73 HTML files)
PASS: Language pairs: EN/ES matched (37 EN, 36 ES; unpaired allowed: review.html)
PASS: Preview indexing: robots noindex meta present on all 73 HTML files
PASS: Preview indexing: public/robots.txt contains Disallow: /
PASS: Preview indexing: public/_headers contains X-Robots-Tag and noindex
Result: PASS
```

### What GitHub Actions does **not** do

- No deploy, Wrangler, or Cloudflare publish steps.
- Publishing the active review Worker is **Cloudflare Workers Builds on `main`** (`npx wrangler deploy`), not Actions.

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
| Required status checks | **`validate-site`**, **`Workers Builds: sc911-website`**, `strict_required_status_checks_policy: true` |
| Pull request rule | present; **`required_approving_review_count: 0`** (intentional) |
| Force-push | blocked (`non_fast_forward`) |
| Deletion | blocked (`deletion`) |
| bypass_actors | `[]` (`current_user_can_bypass: never` on inspection principal) |

Ruleset was updated when preview / Builds gating work landed (API `updated_at` 2026-09-10T18:35:22Z). After [PR #4](https://github.com/ShelbyCounty911/sc911-website/pull/4) merges (or with the current ruleset update already applied), both checks remain the merge gate.

### Classic branch protection (API, HTTP 200)

| Field | Value |
|-------|-------|
| Required checks | `validate-site`, `Workers Builds: sc911-website`, `strict: true` |
| Required PR reviews object | present; approving count **0** (intentional) |
| `allow_force_pushes` | false |
| `allow_deletions` | false |
| `enforce_admins` | **true** |

### What gates merging vs publishing

| Gate | Fact |
|------|------|
| Merging to `main` | Gated by **`validate-site`** and **`Workers Builds: sc911-website`** (required + strict), plus PR requirement |
| Human Approve on GitHub | **Not** enforced (`required_approving_review_count: 0`); recorded owner approval remains project policy |
| Publishing active review Worker | Cloudflare Workers Builds on **`main`** (`wrangler deploy`) — not gated by inventing a separate “main-only” check beyond what already runs on the PR |
| GitHub Actions | Validation only; does not publish |

---

## 3. Cloudflare Git integration and publish paths

### Connection (dashboard evidence + GitHub check evidence)

Owner dashboard after reconnect showed Git repository **`ShelbyCounty911/sc911-website`**, banner *“You can now push a commit…”*, URL param `?new-connection=true`, with:

| Setting | Value (dashboard) |
|---------|-------------------|
| Account | Shelby County 911 District (`fd14180882e36accc0cf6a3c42d3c391`) |
| Worker | **`sc911-website`** (owner-approved rename from `sc911-team-review`; same script tag `6c73cbbc730a4521848b467489862b4a`) |
| Connected repository | `ShelbyCounty911/sc911-website` |
| Production branch | `main` |
| Root directory | `/` |
| Build command | None |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Builds for non-production branches | enabled (checkbox) |

Workers Builds REST (`/builds/triggers`, `/builds/repos/connections`) returned **403** with Wrangler OAuth in this environment — connection details above are from dashboard screenshots + successful GitHub check-run metadata.

### Three distinct publish / upload paths

| Path | Command | Role |
|------|---------|------|
| **Main auto-deploy** | `npx wrangler deploy` (Workers Builds on `main`) | Updates the **active** review Worker / workers.dev production version |
| **PR preview** | `npx wrangler versions upload` (Workers Builds on non-`main` / PR branches) | Uploads a **versioned** preview; must **not** replace the active `main` deployment |
| **Manual Wrangler** | Local `npm run deploy` / `npx wrangler deploy` (or `npm run preview` / versions upload) | Optional CLI path; distinct from Git-triggered Builds |

### First successful Git-triggered main deploy (history + active target)

| Field | Value |
|-------|-------|
| Source commit | `4b4e283edfb50545289419233d06d86443fa88b4` (merge of PR #2) |
| GitHub check | `Workers Builds: sc911-website` — **success** |
| Check run | https://github.com/ShelbyCounty911/sc911-website/runs/102976838697 |
| Cloudflare Build ID | `7e1f8cde-0775-4b60-a9dc-3c4fcb119a8d` |
| Dashboard build URL | https://dash.cloudflare.com/fd14180882e36accc0cf6a3c42d3c391/workers/services/view/sc911-website/production/builds/7e1f8cde-0775-4b60-a9dc-3c4fcb119a8d |
| Worker Version ID | `860655b2-d9ac-49c6-84e5-aead2eef2306` (created 2026-09-10T17:30:11Z) |
| Active review URL | https://sc911-website.shelby-county-911-district.workers.dev/index.html |

**Historical (pre–Git Connect / rename era) version IDs** — keep for rollback history; Worker name then was still `sc911-team-review` in some records:

- Manual Wrangler: `777f2635-36b4-4f87-a2db-6bc5f29003a0` (2026-09-10T05:15Z)
- Earlier rollback reference: `be710ffa-09d2-46f9-b60d-415ce73cd768`

Old host `https://sc911-team-review.shelby-county-911-district.workers.dev/index.html` returns **404** after the approved rename.

### PR previews — required; status as of this update

PR previews are **required**. Current implementation work:

| Item | Status |
|------|--------|
| [PR #4](https://github.com/ShelbyCounty911/sc911-website/pull/4) | Open — tip `58a11ad69d94cda1627592c54bb79b0e1cd2e094` |
| `wrangler.jsonc` on PR #4 | `"preview_urls": true` (still `false` on `main` until merge) |
| Required check | `Workers Builds: sc911-website` (also on Protect main / classic protection) |
| PR #4 Actions | https://github.com/ShelbyCounty911/sc911-website/actions/runs/34516802180 — `validate-site` **success** |
| PR #4 Workers Builds | https://github.com/ShelbyCounty911/sc911-website/runs/103004261294 — **success** |
| Cloudflare Build ID | `c1768118-d170-4ec4-b25e-18747155bee4` |
| Uploaded Version ID | `4c0f9405-8ca5-42b9-80d6-51f437b22d2a` (preview attempt; must not be treated as active `main` version) |

**Worker-level Preview URLs were still disabled (`previews_enabled=false`) after PR-branch `versions upload` alone.** Versioned preview hosts for `4c0f9405…` returned **HTTP 404**. Enabling Preview URLs on the Worker (dashboard **Domains & Routes**) or applying the config via a production Wrangler/`wrangler deploy` on `main` is still required before live preview URLs work. Cloudflare posts PR comments with preview URLs once Preview URLs are enabled.

Production workers.dev review host **does** send `x-robots-tag: noindex, nofollow, noarchive` (verified via live `curl` on HTML).

---

## 4. Baseline and deployment validation

### Windows / Codex baseline

| Item | Result |
|------|--------|
| Windows Codex deliverable path | **Inaccessible** from cloud agent environments |
| Bit-for-bit equality to Windows package | **Not claimed** — cannot be verified here |
| Procedure | Reproducible SHA-256 manifest of `public/` (see PR #4 `docs/BASELINE-MANIFEST.md` / `docs/public-sha256-main.txt` when that branch is available) |
| Intentional drift | `public/review.html` robots `noindex` meta added so CI preview-protection checks pass — not accidental content drift |

Do **not** treat an agent workspace clone (for example `/workspace/sc911-cursor-review/public`) as proof of equality to the Windows deliverable.

### Live checks (active review host) — not accessibility acceptance

Host: `https://sc911-website.shelby-county-911-district.workers.dev`

| Check | Result |
|-------|--------|
| `/index.html`, `/es-index.html` (and other sampled EN/ES routes) | HTTP **200** |
| Sample assets (CSS, images, PDF, MP3) | HTTP **200** with expected content signals |
| `X-Robots-Tag` | `noindex, nofollow, noarchive` on sampled responses |
| `robots.txt` | HTTP **200** |
| Local `node scripts/check-site.mjs` on main tip used for first Git deploy | **PASS** (see §1) |

### Production DNS / custom domains

| Item | Result |
|------|--------|
| Custom domains on Worker `sc911-website` | **0** |
| Production website / DNS changes | **None observed**; work stayed on `*.workers.dev` review Worker |

---

## Completion classification

### Completed and verified

1. GitHub Actions `Site checks` / `validate-site` (workflow YAML + successful PR #2 / main runs + local script PASS).  
2. `Protect main` ruleset `22798472` + classic protection: PR required; checks **`validate-site`** and **`Workers Builds: sc911-website`**; force-push/deletion blocked; admin enforce on classic.  
3. Owner-approved Worker name **`sc911-website`** and review URL live **200** + `x-robots-tag` noindex.  
4. First Git-connected main deploy: merge `4b4e283…`, Build `7e1f8cde-…`, Version `860655b2-…`.  
5. GitHub Actions does not deploy; main publishing is Cloudflare Builds (`wrangler deploy`).  
6. No custom domains on the review Worker.  
7. Intentional `required_approving_review_count: 0` (GitHub does not enforce human Approve).

### Approved / intentional (not “remaining rename work”)

- Worker rename and review URL are **owner-approved** and in use — not leftover rename tasks.  
- Zero required approving reviews is **intentional policy for the GitHub merge gate**; recorded owner approval remains required by project policy for consequential changes.

### In progress

1. **PR previews (required):** [PR #4](https://github.com/ShelbyCounty911/sc911-website/pull/4) tip `58a11ad…` sets `preview_urls: true` and exercises `versions upload` (Build `c1768118-…` / Version `4c0f9405-…`). Live versioned preview URL still **404** until Worker Preview URLs are enabled.

### Pending (do not claim “nothing remains”)

1. Demonstrate a **live PR preview URL** returning 200 with **noindex** after Preview URLs are enabled on the Worker (dashboard Domains & Routes and/or production deploy that applies the config); confirm Cloudflare PR comment with the preview URL.  
2. **Independent review** of PR #4 and of this updated setup report.  
3. **Optional:** baseline SHA-256 compare against the Windows Codex deliverable when that path is available to the reviewer.  
4. Production cutover, accessibility certification, and full content verification remain out of scope for this review setup.

### Configured but API-opaque in this environment

- Direct API listing of Builds triggers/connections (403 with available OAuth) — dashboard + check-run evidence used instead.
