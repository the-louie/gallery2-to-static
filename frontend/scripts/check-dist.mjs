#!/usr/bin/env node
// Release check for frontend/dist: fails if the build ships anything it must not.
//   node scripts/check-dist.mjs [distDir]
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve(process.argv[2] ?? 'dist');
const problems = [];
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p);
    else files.push(path.relative(dist, p));
  }
})(dist);

if (files.some((f) => f.startsWith('g2data' + path.sep) || f === 'g2data')) problems.push('g2data/ (image tree) is in dist');
if (files.some((f) => /\.(jpe?g|png|gif|webp|avif|tiff?|bmp)$/i.test(f))) problems.push('image files are in dist');
for (const f of ['index.html', 'album-themes.json']) if (!files.includes(f)) problems.push(`missing ${f}`);

const bytes = files.reduce((n, f) => n + fs.statSync(path.join(dist, f)).size, 0);
if (problems.length) {
  console.error(`check-dist: FAIL (${dist})\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`check-dist: OK (${files.length} files, ${(bytes / 1024).toFixed(0)} KB)`);
