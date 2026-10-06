import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const pages=fs.readdirSync('public').filter(n=>n.endsWith('.html'));
for(const name of pages){const h=fs.readFileSync('public/'+name,'utf8');assert(!h.includes('{{HEADER}}'));assert(!h.includes('href="review.html"'));assert.equal((h.match(/<header>/g)||[]).length,1);assert.equal((h.match(/<footer/g)||[]).length,1);if(/^(es-)?(careers|rfps|media)\.html$/.test(name))assert(h.includes('resources.html" aria-current="location"'));}
for(const line of fs.readFileSync('public/_redirects','utf8').split(/\r?\n/).filter(Boolean)){const [from,to]=line.trim().split(/\s+/);const target=to.split('#')[0].slice(1);assert(fs.existsSync('public/'+target),from+' missing redirect target');const id=to.split('#')[1];if(id)assert(fs.readFileSync('public/'+target,'utf8').includes('id="'+id+'"'),from+' missing fragment');}
const before=pages.map(n=>fs.readFileSync('public/'+n,'utf8'));execFileSync(process.execPath,['scripts/build-site.mjs']);assert.deepEqual(pages.map(n=>fs.readFileSync('public/'+n,'utf8')),before,'Build must be repeatable');
console.log('PASS: shared layouts, navigation, redirects and repeatable generation');
