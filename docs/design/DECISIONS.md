# Design decision record — SC911 website

Living record for interactive design refinement. Status values: **approved**, **proposed**, **deferred**, **in progress**.

## Session

| Field | Value |
|------|--------|
| Branch | `cursor/design-home-32e4` |
| PR | https://github.com/ShelbyCounty911/sc911-website/pull/5 |
| Focus | Home page (`index.html` / `es-index.html`) |
| Baseline | `main` @ `da76ea7ac0a598891d0f5e8a8ccfafd69ec74135` |
| Review Worker | https://sc911-website.shelby-county-911-district.workers.dev/index.html (unchanged until merge approval) |

## Approved (owner)

| Decision | Notes |
|----------|--------|
| Top-level nav: Using 9-1-1, Meetings, Training, Resources | Live on `main` |
| Meetings = upcoming only | Past meetings/minutes under Resources |
| Financial audits = separate page under Resources | |
| Training = upcoming training/conferences only | |
| Board and staff = separate pages | Staff: names, titles, approved business emails |
| Careers and RFPs = separate pages | |
| Header: district seal + wordmark | |
| Footer: “When Life Is on the Line” logo left; contact right on wide screens | |
| Stay on static HTML/CSS mockup | No Astro/CMS/forms/trackers/external fonts |
| Home: remove Text-to-911 availability sentence | Requested 2026-09-10 — EN/ES home only |
| Home: say “call or text 9-1-1” instead of “call 9-1-1” | Utility bar + feature eyebrow on EN/ES home |

## In progress

| Item | Status |
|------|--------|
| Home page design refinement | **in progress** |

## Proposed

_(none yet)_

## Deferred

| Item | Notes |
|------|--------|
| Sitewide utility bar “call or text 9-1-1” | Other pages still say “call 9-1-1” until owner asks to apply globally |
