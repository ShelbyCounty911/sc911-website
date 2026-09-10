# SC911 website

Approved public review prototype for the Shelby County 911 website migration. This baseline is a design reference, not a production release.

## Contents

- `public/`: approved bilingual mockup, public documents and media.
- `wrangler.jsonc`: existing Cloudflare review Worker configuration.

The repository name `sc911-website` and public visibility were approved by the project owner on September 9, 2026. Repository creation and remote configuration remain pending verification.

## Boundaries

Publish only to the existing `sc911-team-review` Worker during review. Do not change production domain routes or DNS. Keep previews non-indexable. Do not commit WordPress backups, SQL, credentials, private discovery files, or restricted records.

The approved navigation is Using 9-1-1, Meetings, Training, Resources. Meetings shows upcoming meetings only. Resources links to the combined Past meetings and minutes page and a separate Financial audits page. Training shows upcoming events only.

The owner explicitly approved the staff page with names, job titles and business emails, superseding the original charter restriction for these fields. Personal phone numbers and organization-chart metadata are excluded.

## Next implementation work

Move the approved design into the approved static framework with reusable components, schema-validated recurring content, automatic date lifecycle and English/Spanish parity. Existing HTML is the review baseline, not the final authoring system.

Use short-lived branches and pull requests with protected main and required checks. Cloudflare handles publishing; GitHub Actions handles checks without a second deployment pipeline. Remote protections and publishing integration are not yet verified.

Production release still requires content verification, accessibility checks including public documents, security and responsive testing, redirect validation, and documented deployment/rollback procedures. Approval of this mockup does not certify those release gates.
