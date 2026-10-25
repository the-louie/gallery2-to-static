#!/usr/bin/env node
// Release check for CVE-2026-111497 (Brotli C decoder 1.0.3–1.2.0; SEC-18).
// Lists every place a Brotli decoder could come from and fails if one is known-vulnerable.
//   node scripts/check-brotli.mjs        (from the repo root; run again on the build/serving host)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const problems = [];
const ok = (msg) => console.log(`  ok    ${msg}`);
const bad = (msg) => { console.log(`  FAIL  ${msg}`); problems.push(msg); };
const info = (msg) => console.log(`  info  ${msg}`);

// 1. Node.js bundles brotli. Fixed releases per line (the version string stays 1.1.0 on 22.x).
const FIXED_NODE = { 22: [22, 23, 4], 24: [24, 22, 1], 26: [26, 12, 1] };
const v = process.versions.node.split('.').map(Number);
const fixed = FIXED_NODE[v[0]];
const atLeast = (a, b) => a[0] > b[0] || (a[0] === b[0] && (a[1] > b[1] || (a[1] === b[1] && a[2] >= b[2])));
console.log(`Node.js ${process.version} (bundled brotli ${process.versions.brotli})`);
if (!fixed) bad(`Node ${v[0]}.x: no known fixed release; use 22.23.4+, 24.22.1+ or 26.12.1+`);
else if (!atLeast(v, fixed)) bad(`Node ${process.version} < ${fixed.join('.')} (vulnerable bundled brotli)`);
else ok(`Node ${process.version} >= ${fixed.join('.')}`);

// 2. npm packages that bring their own brotli (none expected)
console.log('npm lockfiles');
for (const dir of ['frontend', 'backend']) {
  const lock = path.join(root, dir, 'package-lock.json');
  if (!fs.existsSync(lock)) { info(`${dir}: no package-lock.json`); continue; }
  const pkgs = Object.keys(JSON.parse(fs.readFileSync(lock, 'utf8')).packages ?? {}).filter((p) => /brotli/i.test(p));
  if (pkgs.length) bad(`${dir}: brotli packages ${pkgs.join(', ')} (check their versions)`);
  else ok(`${dir}: no brotli package`);
}

// 3. sharp's libvips bundle: freetype is built with -Dbrotli=disabled in sharp-libvips (checked for 1.3.4).
console.log('sharp / libvips');
const vipsDir = path.join(root, 'backend/node_modules/@img');
if (fs.existsSync(vipsDir)) {
  for (const d of fs.readdirSync(vipsDir).filter((d) => d.startsWith('sharp-libvips-'))) {
    const pj = JSON.parse(fs.readFileSync(path.join(vipsDir, d, 'package.json'), 'utf8'));
    const vj = path.join(vipsDir, d, 'versions.json');
    const libs = fs.existsSync(vj) ? Object.keys(JSON.parse(fs.readFileSync(vj, 'utf8'))) : [];
    if (libs.some((l) => /brotli/i.test(l))) bad(`${d} ${pj.version}: bundles brotli (${libs.join(', ')})`);
    else ok(`${d} ${pj.version}: no brotli in versions.json (freetype built with -Dbrotli=disabled)`);
  }
} else info('backend/node_modules not installed: run npm ci in backend to check sharp');

// 4. The shipped frontend: no Brotli decoder (JS/WASM) and no pre-compressed .br files.
console.log('frontend/dist');
const dist = path.join(root, 'frontend/dist');
if (fs.existsSync(dist)) {
  const files = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } })(dist);
  const br = files.filter((f) => f.endsWith('.br'));
  const wasm = files.filter((f) => f.endsWith('.wasm'));
  const dec = files.filter((f) => /\.(m?js)$/.test(f) && /BrotliDecode|brotli-dec|decompressBrotli/i.test(fs.readFileSync(f, 'utf8')));
  if (br.length || wasm.length || dec.length) bad(`dist: ${[...br, ...wasm, ...dec].map((f) => path.relative(root, f)).join(', ')}`);
  else ok(`dist: ${files.length} files, no .br, no .wasm, no Brotli decoder in JS`);
} else info('frontend/dist not built: run npm run build to check it');

// 5. System library on this host (Debian 13 fix: 1.1.0-2+deb13u1)
console.log('system');
try {
  const out = execFileSync('dpkg-query', ['-W', '-f=${Version}', 'libbrotli1'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  let fixedPkg = false;
  try { execFileSync('dpkg', ['--compare-versions', out, 'ge', '1.1.0-2+deb13u1']); fixedPkg = true; } catch { /* lower */ }
  if (fixedPkg) ok(`libbrotli1 ${out} (>= 1.1.0-2+deb13u1)`); else bad(`libbrotli1 ${out} < 1.1.0-2+deb13u1`);
} catch {
  info('libbrotli1: not a Debian host or not installed');
}

console.log(problems.length ? `\ncheck-brotli: FAIL (${problems.length})` : '\ncheck-brotli: OK');
process.exit(problems.length ? 1 : 0);
