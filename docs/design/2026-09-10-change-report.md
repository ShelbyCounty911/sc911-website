# Change report — 10 September 2026

What landed on `main` in [pull request #5](https://github.com/ShelbyCounty911/sc911-website/pull/5).

| | |
|---|---|
| Repository | [ShelbyCounty911/sc911-website](https://github.com/ShelbyCounty911/sc911-website) |
| Pull request | [#5 — Design: home page refinement](https://github.com/ShelbyCounty911/sc911-website/pull/5) |
| Branch | `cursor/design-home-32e4` |
| Base | `da76ea7ac0a598891d0f5e8a8ccfafd69ec74135` |
| Merged commit | [`ba2aa1ed96c7613a0fa8d3aac3c492807587de42`](https://github.com/ShelbyCounty911/sc911-website/commit/ba2aa1ed96c7613a0fa8d3aac3c492807587de42) |
| Merged | 10 September 2026, 22:13 UTC |
| Diff | 12 files, +201 / −9 |
| Review site | https://sc911-website.shelby-county-911-district.workers.dev/index.html |

Both required checks passed before the merge: `validate-site` and `Workers Builds: sc911-website`. After the merge, the review Worker was serving the new home copy, the BambooHR careers embed, the teacher and parent pages, and a Using 9-1-1 page with that section removed.

Three owner-requested changes are in this merge. Navigation, page chrome, and existing document files were left as they were.

## 1. Home copy (English and Spanish)

On `public/index.html` and `public/es-index.html` only.

Removed the feature sentence:

- English: “Text-to-911 is available in Shelby County. Call 9-1-1 if you can.”
- Spanish: “Text-to-911 está disponible en el condado de Shelby. Llame al 9-1-1 si puede.”

The home utility bar and the feature eyebrow now say call or text:

- “For emergencies, **call or text 9-1-1.**”
- “When you **call or text** 9-1-1”
- “Para emergencias, **llame o envíe un texto al 9-1-1.**”
- “Al **llamar o enviar un texto** al 9-1-1”

The feature link still reads “What to expect when you call” / “Qué esperar al llamar”.

Every other page still says “call 9-1-1” / “llame al 9-1-1” in the utility bar. That sitewide wording was left for a later decision.

The home quick link “Teacher and parent resources” / “Recursos para docentes y padres” now goes to the new Resources pages instead of `using-911.html#topic-6`.

## 2. Careers: BambooHR embed

On `public/careers.html` and `public/es-careers.html`, the prototype notice (“awaiting confirmation” / “pendientes de confirmación”) was replaced with the district’s BambooHR job board:

```html
<div class="bamboo-jobs">
  <div id="BambooHR"
       data-domain="shelbycounty911.bamboohr.com"
       data-version="1.0.0"
       data-departmentId=""></div>
  <script src="https://shelbycounty911.bamboohr.com/js/embed.js"
          type="text/javascript" async defer></script>
</div>
```

`public/style.css` adds spacing for `.bamboo-jobs`. This embed is the owner-requested exception to the “no new services” rule. The Spanish careers page loads the same English BambooHR listings.

## 3. Teacher and parent resources moved under Resources

The section that had been `topic-6` on Using 9-1-1 is now its own page pair:

- `public/teacher-parent-resources.html`
- `public/es-teacher-parent-resources.html`

The copy, cover images, and file links are the same materials that were on Using 9-1-1. The Word and PDF files were not edited. They still open from the existing `shelbycounty911.org` addresses.

English page contents:

- Children’s 9-1-1 curriculum (Word)
- Sample letter to parents (Word)
- 9-1-1 Responders comic book (PDF)
- 9-1-1 Responders coloring book (PDF)
- 9-1-1 comic book 2 (PDF)
- 9-1-1 comic book — Phase 3 (PDF)

The Spanish page uses the existing Spanish titles and marks those files “En inglés”.

Where it is linked:

- Resources hub, under **Public education media** / **Medios educativos**, ahead of TV and radio spots
- Home quick link for residents and families

Using 9-1-1 (`public/using-911.html` and `public/es-using-911.html`) no longer contains the section, and it has no pointer back to the new page.

Cover layout CSS moved from `#topic-6` to `.teacher-resources`.

## Files

| File | Change |
|---|---|
| `public/index.html` | Home copy; teacher/parent link retargeted |
| `public/es-index.html` | Spanish home copy; teacher/parent link retargeted |
| `public/careers.html` | BambooHR embed |
| `public/es-careers.html` | BambooHR embed |
| `public/teacher-parent-resources.html` | New English page |
| `public/es-teacher-parent-resources.html` | New Spanish page |
| `public/resources.html` | Hub link under Public education media |
| `public/es-resources.html` | Hub link under Medios educativos |
| `public/using-911.html` | Teacher/parent section removed |
| `public/es-using-911.html` | Teacher/parent section removed |
| `public/style.css` | `.teacher-resources` and `.bamboo-jobs` |
| `docs/design/DECISIONS.md` | Decision record for this session |

## Left unchanged

- Top-level navigation: Using 9-1-1, Meetings, Training, Resources
- Utility-bar wording on pages other than home
- Public PDFs and Word documents (links only; files not rewritten)
- Dashboard, metrics, GIS, and ArcGIS systems
- Production DNS, custom domains, and Worker configuration

## Still open

Apply “call or text 9-1-1” to the utility bar on every page, or keep that wording on the home page only.
