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

## CI and Cloudflare publishing

- **GitHub Actions** (workflow **Site checks**, job `validate-site`) only validates the site: local links/assets, EN/ES page pairs, and preview `noindex` protections via `scripts/check-site.mjs` / `npm run check`. Actions does **not** deploy.
- **Cloudflare Workers Builds** deploys `main` automatically to the `sc911-website` Worker (`npx wrangler deploy`).
- **Pull request branches** use Workers Builds **versions upload** (`npx wrangler versions upload`) and versioned preview URLs when `preview_urls` is enabled in `wrangler.jsonc`. PR previews must not replace the active `main` deployment.
- Live review URL (production branch / active deployment): https://sc911-website.shelby-county-911-district.workers.dev/index.html
- Manual Wrangler remains available locally: `npm run deploy`, `npm run deploy:dry-run`, and `npm run preview` (`wrangler versions upload` for local use; not used by Actions).

Workers Builds settings (dashboard): Worker `sc911-website`, root `/`, build command empty/unused, deploy command `npx wrangler deploy`, version command `npx wrangler versions upload`, production branch `main`, builds for non-production branches enabled.

## Next implementation work

Move the approved design into the approved static framework with reusable components, schema-validated recurring content, automatic date lifecycle and English/Spanish parity. Existing HTML is the review baseline, not the final authoring system.

Use short-lived branches and pull requests with protected `main` and required checks (`validate-site` and `Workers Builds: sc911-website`). Cloudflare handles publishing; GitHub Actions handles validation without a second deployment pipeline.

Production release still requires content verification, accessibility checks including public documents, security and responsive testing, redirect validation, and documented deployment/rollback procedures. Approval of this mockup does not certify those release gates.
