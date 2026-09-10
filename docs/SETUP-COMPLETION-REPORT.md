# Setup completion report — ShelbyCounty911/sc911-website

**Updated:** 2026-09-10T19:50Z (PR #4 preview rebuild re-verified from Cloudflare check summary)  
**PRs kept open for independent review:** [#4](https://github.com/ShelbyCounty911/sc911-website/pull/4) (implementation), [#3](https://github.com/ShelbyCounty911/sc911-website/pull/3) (this report)

---

## Latest verification — PR #4 preview rebuild (authoritative)

Values below were copied from the **Workers Builds: sc911-website** check summary on tip `7c8cdfa24d14ad0b6d25edf3dc45639fdd27a683` (not constructed hostnames).

| Field | Value |
|------|--------|
| Tip commit | [`7c8cdfa24d14ad0b6d25edf3dc45639fdd27a683`](https://github.com/ShelbyCounty911/sc911-website/commit/7c8cdfa24d14ad0b6d25edf3dc45639fdd27a683) |
| Rebuild trigger | README note only; `public/` unchanged vs prior tip |
| Build ID | [`e2313c9a-20dc-4a42-bf08-1cbe6073defa`](https://dash.cloudflare.com/fd14180882e36accc0cf6a3c42d3c391/workers/services/view/sc911-website/production/builds/e2313c9a-20dc-4a42-bf08-1cbe6073defa) |
| Version ID (preview) | `858c2e5f-7dd0-4984-99fd-c0f19afb9799` |
| **Preview URL** | https://858c2e5f-sc911-website.shelby-county-911-district.workers.dev |
| Preview Alias URL | https://cursor-enable-pr-previews-32e4-sc911-website.shelby-county-911-district.workers.dev |
| Workers Builds check | https://github.com/ShelbyCounty911/sc911-website/runs/103023463922 — **success** |
| `validate-site` | **success** |
| Main review host | https://sc911-website.shelby-county-911-district.workers.dev |
| Last known main Version ID | `860655b2-d9ac-49c6-84e5-aead2eef2306` (≠ preview Version ID) |

### HTTP verification (2026-09-10T19:49Z)

Preview + alias:

| Path | Status | `X-Robots-Tag` |
|------|--------|----------------|
| `/index.html` | 200 | `noindex` |
| `/es-index.html` | 200 | `noindex` |
| `/style.css` | 200 | `noindex` |
| `/images/sc911-seal-transparent.png` | 200 | `noindex` |
| `/images/911WhenLifeRed.png` | 200 | `noindex` |
| `/documents/06-30-2010-Audit.pdf` | 200 | `noindex` |
| `/robots.txt` | 200 | `noindex` |

Main review host (unchanged):

| Path | Status | `X-Robots-Tag` |
|------|--------|----------------|
| `/index.html` | 200 | `noindex, nofollow, noarchive` |
| `/es-index.html` | 200 | `noindex, nofollow, noarchive` |
| Sample CSS / seal / PDF | 200 | `noindex, nofollow, noarchive` |

Content SHA-256 for `/index.html`, `/es-index.html`, `/style.css` matched tip `public/` bit-for-bit on preview, alias, and main (PR does not change `public/`). Preview hostname ≠ main hostname.

### Discoverability

- Workers Builds check summary on tip `7c8cdfa…` (Preview URL + Alias URL)
- PR #4 description + verification comments
- Cloudflare bot PR comment may lag / still reference an older commit — **not a blocker**; check summary is authoritative

### Required checks (both PRs)

| PR | Tip | `validate-site` | `Workers Builds: sc911-website` |
|----|-----|-----------------|----------------------------------|
| [#4](https://github.com/ShelbyCounty911/sc911-website/pull/4) | `7c8cdfa…` | success | success |
| [#3](https://github.com/ShelbyCounty911/sc911-website/pull/3) | `cec7f2c…` | success | success |

### Remaining blockers / open items

1. **Independent review and merge** of PR #4, then PR #3 (kept unmerged intentionally).
2. Cloudflare bot comment may lag behind check summary.
3. Wrangler CLI OAuth expired in agent VMs — use interactive `wrangler login --device` (no tokens in chat). Git Builds path works without local Wrangler.
4. Optional: Windows Codex deliverable SHA-256 compare when that path is available.
5. Production DNS/custom domains / cutover remain out of scope.

---

## Approved decisions (owner)

| Decision | Status |
|----------|--------|
| Worker name **`sc911-website`** | **Approved** — live target |
| Review URL `https://sc911-website.shelby-county-911-district.workers.dev/index.html` | **Approved** — active review host |
| `required_approving_review_count: 0` on Protect main + classic protection | **Intentional** — GitHub does **not** enforce human Approve as a merge gate |
| PR preview URLs for non-`main` / PR branches | **Required** — demonstrated live on PR #4 (pending independent review/merge) |

**Project policy (outside GitHub’s merge gate):** Consequential changes still require **recorded owner approval**.

---

## 1. GitHub Actions

| Item | Evidence |
|------|----------|
| Workflow | `.github/workflows/site-checks.yml` |
| Check name | **`validate-site`** |
| Role | Validation only — **does not deploy** |
| Covers | Local links/fragments, assets, EN/ES pairs (`review.html` unpaired allowed), noindex meta + `robots.txt` + `_headers` |

---

## 2. Protection of `main`

| Field | Value |
|-------|-------|
| Ruleset | Protect main `22798472` |
| Required checks | **`validate-site`**, **`Workers Builds: sc911-website`** (strict) |
| Approving reviews | **0** (intentional) |
| Force-push / deletion | blocked |
| `enforce_admins` (classic) | true |

---

## 3. Cloudflare publish paths

| Path | Command | Role |
|------|---------|------|
| Main | `npx wrangler deploy` | Active review Worker |
| PR / non-main | `npx wrangler versions upload` | Versioned preview URLs when `preview_urls: true` |
| Manual CLI | local wrangler | Optional |

First Git main deploy (reference): Build `7e1f8cde-0775-4b60-a9dc-3c4fcb119a8d`, Version `860655b2-d9ac-49c6-84e5-aead2eef2306`.

`preview_urls: true` is on PR #4 (`wrangler.jsonc`); remains `false` on `main` until merge. Worker Settings → Domains & Routes → Preview URLs enabled by owner.

---

## 4. Baseline

Windows Codex deliverable path inaccessible from cloud agents — bit-for-bit equality **not claimed**. See PR #4 `docs/BASELINE-MANIFEST.md` / `docs/public-sha256-main.txt` for reproducible SHA-256 procedure. Intentional `public/review.html` robots noindex meta for CI.

---

## Completion classification

### Completed and verified

1. Actions `validate-site` (validation-only).
2. Protect main + classic: required checks, force-push/deletion blocked, zero approving reviews intentional.
3. Owner-approved Worker `sc911-website` + review host live 200 + noindex.
4. First Git main deploy recorded.
5. **PR preview demonstrated and re-verified** on PR #4 tip `7c8cdfa…` with Cloudflare-returned Preview URL `https://858c2e5f-sc911-website.shelby-county-911-district.workers.dev`.
6. Main review host remains distinct and serving.

### Pending

1. Independent review/merge of PR #4 then PR #3.
2. Optional Windows baseline compare.
3. Production cutover / a11y certification out of scope.


## Independent review update — September 10, 2026

This update supersedes the pending baseline and merge statements above. Codex compared the original prepared Windows deliverable with the PR #4 manifest at 7c8cdfa24d14ad0b6d25edf3dc45639fdd27a683: 221 files; none added or missing; 217 exact SHA-256 matches, including all PDFs. _headers, robots.txt, and style.css differ only in CRLF/LF line endings. review.html differs only by the intended noindex meta tag. The baseline comparison is complete.

The owner approved the merge sequence after independent review. PR #4 was merged as 81af7d33bf7283cd203aee1aa7e6d1b0b8f6cdaa. Its required checks passed in GitHub before merging. The earlier PR #3 check table is historical; its corrected pre-update tip was 1dfb275a35f54cfc37b25a944f159a9931944da3, with a successful Cloudflare bot deployment comment. Final report-branch checks must pass again after updating against main. PR #3 merge and final deployment validation remain pending at this document commit.
