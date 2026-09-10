# SC911 website

Approved public review prototype for the Shelby County 911 website migration. This baseline is a design reference, not a production release.

## Contents

- `public/`: approved bilingual mockup, public documents and media.
- `wrangler.jsonc`: Cloudflare Worker configuration for `sc911-website`.
- `docs/`: operational notes (baseline SHA-256 manifest and related records).

The repository name `sc911-website` and public visibility were approved by the project owner on September 9, 2026 (owner-approved rename from the earlier review Worker name).

## Boundaries

Publish only to the existing `sc911-website` Worker during review. Do not change production domain routes or DNS. Keep previews non-indexable. Do not commit WordPress backups, SQL, credentials, private discovery files, or restricted records.

The approved navigation is Using 9-1-1, Meetings, Training, Resources. Meetings shows upcoming meetings only. Resources links to the combined Past meetings and minutes page and a separate Financial audits page. Training shows upcoming events only.

The owner explicitly approved the staff page with names, job titles and business emails, superseding the original charter restriction for these fields. Personal phone numbers and organization-chart metadata are excluded.

## Owner-approved review Worker

- Worker name: `sc911-website`
- Review URL: https://sc911-website.shelby-county-911-district.workers.dev/index.html
- Charter: review-only publishing. No production DNS or custom domain changes.

## CI and Cloudflare publishing

### GitHub Actions (validation only)

- Workflow **Site checks** / job `validate-site` validates local links and assets, EN/ES page pairs, and preview `noindex` protections via `scripts/check-site.mjs` / `npm run check`.
- GitHub Actions does **not** deploy. It remains validation-only.

### Cloudflare Workers Builds (publish)

Workers Builds is the publish path for this repository:

- Pushes to `main` run the deploy command: `npx wrangler deploy` (also available locally as `npm run deploy`).
- Non-main / pull-request branches use the version command: `npx wrangler versions upload` (also available locally as `npm run preview`).
- With `preview_urls` set to `true` in `wrangler.jsonc`, version uploads produce versioned preview URLs for PR review. Worker-level Preview URLs routing follows that Wrangler setting on the next `npx wrangler deploy` to `main` (versions upload alone does not replace the active production deployment).
- Cloudflare posts pull-request comments with preview URLs when those URLs are available.
- PR preview versions must not replace the active `main` deployment on the review URL above.

Expected Workers Builds settings: Worker `sc911-website`, root `/`, build command empty or unused, production branch `main`, deploy command `npx wrangler deploy`, version command `npx wrangler versions upload`, builds for non-production branches enabled.

### Preview rebuild note

Rebuild requested 2026-09-10T19:47Z on this branch to re-verify the Cloudflare-returned Preview URL (check summary), EN/ES + sample assets, and `X-Robots-Tag: noindex`, without changing the active main review deployment.

## Next implementation work

Move the approved design into the approved static framework with reusable components, schema-validated recurring content, automatic date lifecycle and English/Spanish parity. Existing HTML is the review baseline, not the final authoring system.

Use short-lived branches and pull requests with protected `main` and required checks (`validate-site` and `Workers Builds: sc911-website`). Cloudflare handles publishing; GitHub Actions handles validation without a second deployment pipeline.

Production release still requires content verification, accessibility checks including public documents, security and responsive testing, redirect validation, and documented deployment/rollback procedures. Approval of this mockup does not certify those release gates.
