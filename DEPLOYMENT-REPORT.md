# SC911 website deployment report

- Source: https://github.com/ShelbyCounty911/sc911-website.git (`public/` + supplied `wrangler.jsonc`)
- Target Worker: `sc911-website` (renamed from `sc911-team-review` in the Cloudflare dashboard; `wrangler.jsonc` `name` updated to match)
- Account: Shelby County 911 District (`fd14180882e36accc0cf6a3c42d3c391`)
- Wrangler: 4.130.0
- Previous Version ID (rollback): `be710ffa-09d2-46f9-b60d-415ce73cd768` (recorded while Worker was still named `sc911-team-review`)
- New Version ID: `777f2635-36b4-4f87-a2db-6bc5f29003a0` (recorded while Worker was still named `sc911-team-review`)
- Review URL: https://sc911-website.shelby-county-911-district.workers.dev/index.html
- Prior workers.dev hostname `sc911-team-review.shelby-county-911-district.workers.dev` returns 404 after the rename
- Custom domains bound to this Worker: none
- Production domain/DNS: unchanged
