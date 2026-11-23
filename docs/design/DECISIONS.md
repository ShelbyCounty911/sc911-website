# Design decision record — SC911 website

Living record for interactive design refinement. Status values: **approved**, **proposed**, **deferred**, **in progress**.

## Session

| Field | Value |
|------|--------|
| Branch | `cursor/design-home-32e4` |
| PR | https://github.com/ShelbyCounty911/sc911-website/pull/5 |
| Focus | Home page + Resources IA (teacher/parent page) |
| Baseline | `main` @ `da76ea7ac0a598891d0f5e8a8ccfafd69ec74135` |
| Review Worker | https://sc911-website.shelby-county-911-district.workers.dev/index.html (unchanged until merge approval) |

## Approved (owner)

| Decision | Notes |
|----------|--------|
| Top-level nav: Using 9-1-1, Meetings, Training, Resources, Dashboards | Dashboards added 2026-11-20 (owner request): links to the public Dashboard Launch Pad at `https://dashboard.shelbycounty911.org/launch` (Spanish label "Paneles"; menu items no longer wrap; the dashboards are English only). Not embedded: the dashboards are full-screen wallboards |
| Meetings = upcoming only | Past meetings/minutes under Resources |
| Meeting cards: one "Meeting materials" section, no separate Agenda | Approved 2026-11-23 (owner request): the agenda arrives with the meeting materials, so it is uploaded as the first material (Spanish "Materiales de la reunión"). Meeting records link the materials of past meetings |
| Financial audits = separate page under Resources | |
| Training = upcoming training/conferences only | |
| Board and staff = separate pages | Staff: names, titles, approved business emails |
| Careers and RFPs = separate pages | |
| Header: district seal + wordmark | |
| Footer: “When Life Is on the Line” logo left; contact right on wide screens | |
| ~~Stay on static HTML/CSS mockup~~ | **Superseded 2026-11-20** by the EmDash decision below. Still no forms, trackers or external fonts |
| Move the site to EmDash (Cloudflare CMS on Astro) | Approved 2026-11-20. New short URLs (`/meetings/`, Spanish under `/es/`), with old WordPress addresses redirected. Approved pages kept as-is at first. Staff sign in through Cloudflare Access (Entra). Workflow: clerks are Editors, approval by habit. No notice-date lock (legal notice runs in local newspapers). Details in `docs/EMDASH-SPIKE.md`, PR #29 |
| Home: remove Text-to-911 availability sentence | Requested 2026-09-10 — EN/ES home only |
| Home: say “call or text 9-1-1” instead of “call 9-1-1” | Utility bar + feature eyebrow on EN/ES home |
| Careers: BambooHR job-board embed | Owner-requested exception to “no new services”; EN/ES careers pages load `shelbycounty911.bamboohr.com/js/embed.js` |
| Teacher and parent resources = separate page under Resources | Moved off Using 9-1-1 with no leftover pointer; EN/ES pair at `teacher-parent-resources.html` / `es-teacher-parent-resources.html` |

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
