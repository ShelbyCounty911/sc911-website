# Accessibility and responsive check (launch gate 9)

Checked 2026-11-25 against WCAG 2.1 AA, on the test site (same code as production) and the locally built pages.
All 27 public pages were covered: 13 English, 13 Spanish, plus the 404 page.

## Results

| Check | How | Result |
|---|---|---|
| Automated WCAG 2.1 A/AA and best-practice rules | axe-core 4.10.2 on every page | Pass after this change (it fixed 2 minor issues) |
| Color contrast, text vs. background | Computed for every text element, light and dark mode | Pass |
| Reflow: no sideways scrolling at 320, 375 and 768 px | Every page at each width | Pass |
| Keyboard: skip link first, visible focus outline on links and the menu | Real Tab presses | Pass |
| Page language (`lang`), titles, image alt text, link names | axe plus manual review | Pass |
| Admin screens clerks use (new meeting form) | Labels on every field, visible focus | Pass. The admin is EmDash's own software and we don't change it. |

## Fixed in this change

- **Heading order:** the footer's district name was an `h3`, so pages with only an `h1` skipped a level (Board). It is now an `h2`, with the same look.
- **Landmarks:** the "For emergencies, call 9-1-1" bar sat outside every page region. It is now a labeled region ("Emergency notice" / "Aviso de emergencia").
- **Phone menu:** the Menu button's tap area was 22 px tall. It is now 44 px, and the layout is unchanged.

## Open items (content, not code)

1. **Radio spots need transcripts** (WCAG 1.2.1, Level A). The three radio spots on Media have no text version. They need a transcript under each player, in English and Spanish. The District's ad scripts would work.
2. **Vimeo videos need captions checked** (WCAG 1.2.2, Level A). Media links out to Vimeo videos. Each one must have captions turned on in Vimeo.
3. **"Prototype review" note on Media:** remove it once items 1 and 2 are done.
4. **Third-party widgets:** the BambooHR jobs widget on Careers has light-gray "Powered by" text (4.42:1 in light mode, 3.76:1 in dark; 4.5:1 needed). It shows in English on the Spanish page. Both come from BambooHR, not our code.
5. **Optional, WCAG 2.2:** the year links on Meeting records ("Link to 2026") are 21 px tall. WCAG 2.1 AA doesn't require 24 px, but 2.2 does.

## How to re-run

The scan scripts are not committed. To repeat: install `jsdom` and `axe-core` in a scratch folder, load each entry of `cms/src/generated/static-pages.json` into jsdom, and run `axe.run` with the WCAG 2.1 A/AA tags.
