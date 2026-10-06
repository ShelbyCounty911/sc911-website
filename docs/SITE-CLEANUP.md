# Static-site cleanup — October 6, 2026

Owner requested prototype retirement, shared-layout/style consolidation, secondary navigation corrections and meeting wording cleanup.

- Retired 21 obsolete HTML files, including old archive/document wrappers, demos and stale review notes. URLs redirect to current meetings, training, Resources or the corresponding archive year. PDFs and media unchanged.
- Source pages now live in site/pages; bilingual shared headers and footers in site/shared. Node build writes committed static public HTML. CI checks synchronization; no runtime framework or client-side dependency added.
- Common navigation generated consistently; resource descendants highlight Resources. Standard review banner/footer removes outdated prototype labels.
- Remove archived-materials and published-notice references in both languages; upcoming agenda/material sections retained as previously approved.
- Reduce duplicate exact CSS declarations in the accumulated Using 9-1-1 and district styles, removing unused emergency-banner styling while retaining conditional cascade and shorthand declarations.
- Validation: build synchronization, repeatable generation, all redirect targets/fragments, correct navigation, existing links/assets/language/noindex checks. Preview visual review required before release.

Authoring: edit site/pages and site/shared, run npm run build, then npm run check and node scripts/check-cleanup.mjs. Do not edit generated public HTML.
