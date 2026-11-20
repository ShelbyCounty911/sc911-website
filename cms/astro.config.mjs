import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import { access, d1, r2 } from "@emdash-cms/cloudflare";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";

// Deployed builds sign in only through Cloudflare Access (Entra ID). Access must already protect
// the Worker's hostname before the first deploy: the first person to reach a new site becomes Admin.
// Local `astro dev` keeps EmDash's default sign-in (and the dev-only bypass).
const building = process.argv.includes("build");
const teamDomain = process.env.CF_ACCESS_TEAM_DOMAIN ?? "sc911.cloudflareaccess.com";

export default defineConfig({
	output: "server",
	adapter: cloudflare(),
	image: {
		layout: "constrained",
		responsiveStyles: true,
	},
	integrations: [
		react(),
		emdash({
			database: d1({ binding: "DB", session: "auto", coalesce: true }),
			storage: r2({ binding: "MEDIA" }),
			...(building && {
				// CF_ACCESS_AUDIENCE (the Access application's AUD tag) is read at runtime from a Worker secret.
				// New Access users start as Contributor (20): they can draft but not publish.
				auth: access({ teamDomain, defaultRole: 20 }),
			}),
		}),
	],
	devToolbar: { enabled: false },
});
