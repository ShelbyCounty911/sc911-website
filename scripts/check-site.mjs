#!/usr/bin/env node
/**
 * Site validation for public/ review mockup.
 *
 * Checks:
 * 1. Local href/src targets exist; #fragments resolve to matching id attributes.
 * 2. EN/ES language page pairs (index.html ↔ es-index.html, foo.html ↔ es-foo.html).
 *    Intentional unpaired exception: review.html only (EN review notes, no ES pair).
 * 3. Preview noindex: robots meta on every HTML page, robots.txt Disallow: /, _headers X-Robots-Tag noindex.
 *
 * Usage: node scripts/check-site.mjs
 * Exit 1 on any failure.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');

const UNPAIRED_ALLOWED = new Set(['review.html']);

/** @type {string[]} */
const failures = [];
/** @type {string[]} */
const passes = [];

function fail(msg) {
  failures.push(msg);
}

function pass(msg) {
  passes.push(msg);
}

function listHtmlFiles(dir) {
  /** @type {string[]} */
  const out = [];
  function walk(d) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
    }
  }
  walk(dir);
  return out.sort();
}

function isExternalOrSpecial(url) {
  const u = url.trim();
  if (!u || u === '#') return true;
  const lower = u.toLowerCase();
  return (
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('mailto:') ||
    lower.startsWith('tel:') ||
    lower.startsWith('data:') ||
    lower.startsWith('javascript:')
  );
}

function extractAttrs(html, attrName) {
  const re = new RegExp(
    `\\b${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    'gi'
  );
  /** @type {string[]} */
  const values = [];
  let m;
  while ((m = re.exec(html)) !== null) {
    values.push(m[1] ?? m[2] ?? m[3] ?? '');
  }
  return values;
}

function extractIds(html) {
  const ids = new Set();
  const re = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const id = m[1] ?? m[2] ?? m[3] ?? '';
    if (id) ids.add(id);
  }
  return ids;
}

function hasNoindexRobotsMeta(html) {
  // Match <meta ... name="robots" ... content="...noindex..."> in either attribute order
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of metas) {
    const nameMatch = tag.match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const name = (nameMatch?.[1] ?? nameMatch?.[2] ?? nameMatch?.[3] ?? '').toLowerCase();
    if (name !== 'robots') continue;
    const contentMatch = tag.match(/\bcontent\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    const content = (contentMatch?.[1] ?? contentMatch?.[2] ?? contentMatch?.[3] ?? '').toLowerCase();
    if (content.includes('noindex')) return true;
  }
  return false;
}

function checkLinksAndAssets(htmlFiles) {
  let linkErrors = 0;
  const idCache = new Map();

  function getIds(filePath) {
    if (!idCache.has(filePath)) {
      idCache.set(filePath, extractIds(fs.readFileSync(filePath, 'utf8')));
    }
    return idCache.get(filePath);
  }

  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    const relFile = path.relative(PUBLIC, filePath);
    const baseDir = path.dirname(filePath);
    const refs = [...extractAttrs(html, 'href'), ...extractAttrs(html, 'src')];

    for (const raw of refs) {
      if (isExternalOrSpecial(raw)) continue;

      const hashIndex = raw.indexOf('#');
      let pathPart = hashIndex === -1 ? raw : raw.slice(0, hashIndex);
      const fragment = hashIndex === -1 ? '' : raw.slice(hashIndex + 1);

      // Query strings on local assets are unusual; strip if present
      const qIndex = pathPart.indexOf('?');
      if (qIndex !== -1) pathPart = pathPart.slice(0, qIndex);

      let targetFile = filePath;
      if (pathPart) {
        // Decode percent-encoding for filesystem lookup
        let decoded = pathPart;
        try {
          decoded = decodeURIComponent(pathPart);
        } catch {
          // keep as-is
        }
        targetFile = path.resolve(baseDir, decoded);
        if (!targetFile.startsWith(PUBLIC + path.sep) && targetFile !== PUBLIC) {
          fail(`${relFile}: path escapes public/: ${raw}`);
          linkErrors++;
          continue;
        }
        if (!fs.existsSync(targetFile)) {
          fail(`${relFile}: missing target for ${raw}`);
          linkErrors++;
          continue;
        }
      }

      if (fragment) {
        // Only require id match when the target is an HTML file (or same-page)
        const isHtmlTarget =
          !pathPart || targetFile.endsWith('.html') || fs.statSync(targetFile).isDirectory();
        let htmlTarget = targetFile;
        if (fs.existsSync(targetFile) && fs.statSync(targetFile).isDirectory()) {
          htmlTarget = path.join(targetFile, 'index.html');
          if (!fs.existsSync(htmlTarget)) {
            fail(`${relFile}: fragment #${fragment} but no index.html at ${path.relative(PUBLIC, targetFile)}`);
            linkErrors++;
            continue;
          }
        }
        if (isHtmlTarget && htmlTarget.endsWith('.html')) {
          const ids = getIds(htmlTarget);
          if (!ids.has(fragment)) {
            fail(
              `${relFile}: fragment #${fragment} not found in ${path.relative(PUBLIC, htmlTarget)}`
            );
            linkErrors++;
          }
        }
      }
    }
  }

  if (linkErrors === 0) {
    pass(`Links/assets: all local href/src targets resolve (${htmlFiles.length} HTML files)`);
  } else {
    fail(`Links/assets: ${linkErrors} broken reference(s)`);
  }
}

function checkLanguagePairs(htmlFiles) {
  const basenames = htmlFiles
    .filter((f) => path.dirname(f) === PUBLIC)
    .map((f) => path.basename(f));

  const english = basenames.filter((n) => !n.startsWith('es-'));
  const spanish = basenames.filter((n) => n.startsWith('es-'));

  let pairErrors = 0;

  for (const en of english) {
    if (UNPAIRED_ALLOWED.has(en)) continue;
    const es = en === 'index.html' ? 'es-index.html' : `es-${en}`;
    if (!spanish.includes(es)) {
      fail(`Language pair: missing Spanish page for ${en} (expected ${es})`);
      pairErrors++;
    }
  }

  for (const es of spanish) {
    const en = es === 'es-index.html' ? 'index.html' : es.replace(/^es-/, '');
    if (UNPAIRED_ALLOWED.has(en)) continue;
    if (!english.includes(en)) {
      fail(`Language pair: missing English page for ${es} (expected ${en})`);
      pairErrors++;
    }
  }

  // Nested HTML under public/ (if any) are not part of EN/ES pairing rules
  const nested = htmlFiles.filter((f) => path.dirname(f) !== PUBLIC);
  if (nested.length) {
    pass(
      `Language pairs: skipped ${nested.length} nested HTML file(s) outside public/ root pairing`
    );
  }

  if (pairErrors === 0) {
    pass(
      `Language pairs: EN/ES matched (${english.length} EN, ${spanish.length} ES; unpaired allowed: ${[...UNPAIRED_ALLOWED].join(', ')})`
    );
  }
}

function checkPreviewIndexing(htmlFiles) {
  let metaErrors = 0;
  for (const filePath of htmlFiles) {
    const html = fs.readFileSync(filePath, 'utf8');
    if (!hasNoindexRobotsMeta(html)) {
      fail(`${path.relative(PUBLIC, filePath)}: missing robots meta with noindex`);
      metaErrors++;
    }
  }
  if (metaErrors === 0) {
    pass(`Preview indexing: robots noindex meta present on all ${htmlFiles.length} HTML files`);
  }

  const robotsPath = path.join(PUBLIC, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    fail('Preview indexing: public/robots.txt missing');
  } else {
    const robots = fs.readFileSync(robotsPath, 'utf8');
    if (!/Disallow:\s*\//i.test(robots)) {
      fail('Preview indexing: public/robots.txt must contain "Disallow: /"');
    } else {
      pass('Preview indexing: public/robots.txt contains Disallow: /');
    }
  }

  const headersPath = path.join(PUBLIC, '_headers');
  if (!fs.existsSync(headersPath)) {
    fail('Preview indexing: public/_headers missing');
  } else {
    const headers = fs.readFileSync(headersPath, 'utf8');
    const hasTag = /X-Robots-Tag/i.test(headers);
    const hasNoindex = /noindex/i.test(headers);
    if (!hasTag || !hasNoindex) {
      fail('Preview indexing: public/_headers must contain X-Robots-Tag and noindex');
    } else {
      pass('Preview indexing: public/_headers contains X-Robots-Tag and noindex');
    }
  }
}

function main() {
  if (!fs.existsSync(PUBLIC)) {
    console.error('FAIL: public/ directory not found');
    process.exit(1);
  }

  const htmlFiles = listHtmlFiles(PUBLIC);
  if (htmlFiles.length === 0) {
    console.error('FAIL: no HTML files under public/');
    process.exit(1);
  }

  console.log(`Checking ${htmlFiles.length} HTML file(s) under public/…\n`);

  checkLinksAndAssets(htmlFiles);
  checkLanguagePairs(htmlFiles);
  checkPreviewIndexing(htmlFiles);

  console.log('--- Summary ---');
  for (const msg of passes) console.log(`PASS: ${msg}`);
  for (const msg of failures) console.log(`FAIL: ${msg}`);

  if (failures.length) {
    console.log(`\nResult: FAIL (${failures.length} issue(s))`);
    process.exit(1);
  }
  console.log('\nResult: PASS');
  process.exit(0);
}

main();
