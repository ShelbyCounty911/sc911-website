#!/usr/bin/env node
/**
 * Checks the EmDash site's search-engine settings for both builds (cms/scripts/site-env.mjs):
 *  - test build (sc911-cms-spike): every page noindex, review footer label kept, robots.txt Disallow: /,
 *    _headers X-Robots-Tag noindex, no sitemap.
 *  - production build (CLOUDFLARE_ENV=production): no noindex, no review label, canonical link on every
 *    page, robots.txt allows crawling and names the sitemap, _headers without X-Robots-Tag, sitemap lists
 *    every page.
 * Runs the two cms prebuild scripts that need only Node built-ins, so CI does not install cms/.
 * The test build runs last, so cms/public and cms/src/generated end in the test-site state.
 *
 * Usage: node scripts/check-emdash-indexing.mjs   (exit 1 on any failure)
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const cms = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../cms');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

function build(production) {
  const env = { ...process.env };
  delete env.CLOUDFLARE_ENV;
  if (production) env.CLOUDFLARE_ENV = 'production';
  for (const s of ['sync-assets.mjs', 'build-static.mjs']) {
    execFileSync(process.execPath, [path.join(cms, 'scripts', s)], { cwd: cms, env, stdio: 'ignore' });
  }
  const read = (p) => (fs.existsSync(path.join(cms, p)) ? fs.readFileSync(path.join(cms, p), 'utf8') : null);
  return {
    pages: JSON.parse(read('src/generated/static-pages.json')),
    site: JSON.parse(read('src/generated/site.json')),
    robots: read('public/robots.txt'),
    headers: read('public/_headers'),
    sitemap: read('public/sitemap.xml'),
  };
}

const NOINDEX = /<meta name="robots"[^>]*noindex/i;
const LABEL = / · (?:Review site|Sitio de revisión)</;

// Production
{
  const b = build(true);
  const label = 'production build';
  check(b.site.production === true, `${label}: site.json production should be true`);
  for (const [key, p] of Object.entries(b.pages)) {
    check(!NOINDEX.test(p.html), `${label}: ${key} still has a noindex robots meta`);
    check(!LABEL.test(p.html), `${label}: ${key} still shows the review-site footer label`);
    check(p.html.includes('<meta name="format-detection" content="telephone=no">'), `${label}: ${key} lets iPhone Safari turn numbers into phone links`);
    if (key.startsWith('/')) {
      check(p.html.includes(`<link rel="canonical" href="https://shelbycounty911.org${key}">`), `${label}: ${key} has no canonical link`);
      check(b.sitemap?.includes(`<loc>https://shelbycounty911.org${key}</loc>`), `${label}: ${key} missing from sitemap.xml`);
    }
  }
  check(b.robots && !/Disallow:\s*\/\s*$/m.test(b.robots), `${label}: robots.txt must not disallow the whole site`);
  check(b.robots?.includes('Sitemap: https://shelbycounty911.org/sitemap.xml'), `${label}: robots.txt must name the sitemap`);
  check(b.headers && !/X-Robots-Tag/i.test(b.headers), `${label}: _headers must not send X-Robots-Tag`);
}

// Test site (last, so the working tree ends in this state)
{
  const b = build(false);
  const label = 'test build';
  check(b.site.production === false, `${label}: site.json production should be false`);
  for (const [key, p] of Object.entries(b.pages)) {
    check(NOINDEX.test(p.html), `${label}: ${key} is missing the noindex robots meta`);
    check(!p.html.includes('rel="canonical"'), `${label}: ${key} should not have a canonical link`);
  }
  check(/Disallow:\s*\/\s*$/m.test(b.robots ?? ''), `${label}: robots.txt must contain "Disallow: /"`);
  check(/X-Robots-Tag:.*noindex/i.test(b.headers ?? ''), `${label}: _headers must send X-Robots-Tag noindex`);
  check(b.sitemap === null, `${label}: there should be no sitemap.xml`);
}

if (failures.length) {
  console.error(`EmDash indexing check: ${failures.length} failure(s)`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('EmDash indexing check: test build is noindex; production build is indexable with canonical links and a sitemap');
