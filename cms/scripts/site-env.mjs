// Which site this build is for. Workers Builds for the production Worker sets the build variable
// CLOUDFLARE_ENV=production, which also makes the Cloudflare adapter use the "production" environment in
// wrangler.jsonc. Every other build (the test site sc911-cms-spike, local dev) is the test site:
// hidden from search engines, with the review label in the footer.
export const PRODUCTION = process.env.CLOUDFLARE_ENV === 'production';
export const ORIGIN = 'https://shelbycounty911.org';
export const HOST = 'shelbycounty911.org';
