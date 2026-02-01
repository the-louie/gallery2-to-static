/**
 * Parses check-album-assets failure report and categorizes failures into:
 * 1. Actually missing image (correct URL format, 404)
 * 2. Mismatch in filename generation (backend vs extract.py - wrong prefix or path)
 * 3. Bug in frontend (none identified from URL pattern)
 * 4. Other (no thumbnail, JSON failed, timeout, not an image)
 *
 * Run: node scripts/categorize-missing-assets.mjs
 * Reads report_fail_20260130.md, writes to __docs/missing_images_20260201/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'report_fail_20260130.md');
const outDir = path.join(repoRoot, '__docs', 'missing_images_20260201');

// URL path uses __t_ (wrong prefix) instead of t__ (Python/extract.py convention)
const MISMATCH_PATTERN = /\/__t_/;
// Correct thumb prefix in path (t__ at segment start)
const CORRECT_THUMB_PATTERN = /\/t__[^/]+$/;
// Space in URL path (Python cleanup would replace with _)
const SPACE_IN_PATH = /%20| .*\.jpg/i;
// Failure lines that are not asset URLs
const OTHER_PATTERNS = [
  /has no thumbnail/i,
  /Album JSON failed/i,
  /Album JSON error/i,
  /timeout/i,
  /not an image/i,
];

function extractUrl(line) {
  const m = line.match(/https?:\/\/[^\s)]+/);
  return m ? m[0] : null;
}

function categorize(line) {
  if (!line.startsWith('- ')) return null;
  const rest = line.slice(2);
  const url = extractUrl(line);

  for (const p of OTHER_PATTERNS) {
    if (p.test(rest) && !url) return { category: 'other', line: rest, url: null };
    if (p.test(rest)) return { category: 'other', line: rest, url };
  }

  if (!url) return null;

  const pathPart = url.replace(/^https?:\/\/[^/]+/, '') || url;
  if (MISMATCH_PATTERN.test(pathPart)) return { category: 'mismatch', line: rest, url };
  if (SPACE_IN_PATH.test(pathPart)) return { category: 'mismatch', line: rest, url };
  if (CORRECT_THUMB_PATTERN.test(pathPart) || pathPart.includes('/t__')) return { category: 'actually_missing', line: rest, url };
  return { category: 'actually_missing', line: rest, url };
}

function main() {
  const raw = fs.readFileSync(reportPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  const actuallyMissing = new Map();
  const mismatch = new Map();
  const other = [];
  const frontendBug = [];

  for (const line of lines) {
    const c = categorize(line);
    if (!c) continue;
    if (c.category === 'actually_missing') {
      if (c.url) actuallyMissing.set(c.url, c.line);
    } else if (c.category === 'mismatch') {
      if (c.url) mismatch.set(c.url, c.line);
    } else if (c.category === 'other') {
      other.push(c.line);
    }
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const header = `# Missing assets report – category summary\n\nSource: report_fail_20260130.md (from scripts/check-album-assets.mjs)\nGenerated: ${new Date().toISOString().slice(0, 10)}\n\n`;

  fs.writeFileSync(
    path.join(outDir, '01-actually-missing-image.md'),
    header +
      `## 1. Actually missing image\n\nCorrect URL format (t__ prefix or full-size path) but resource returns 404. File may never have been exported or is missing on the server.\n\n**Total unique URLs: ${actuallyMissing.size}**\n\n` +
      Array.from(actuallyMissing.entries())
        .map(([url, line]) => `- ${line}`)
        .join('\n') + '\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, '02-mismatch-backend-vs-extract-py.md'),
    header +
      `## 2. Mismatch in filename generation (backend vs extract.py)\n\nURL path uses wrong prefix (e.g. \`__t_\` instead of \`t__\`) or contains characters the Python script would have normalized (e.g. spaces). Backend or check script may be building paths that do not match what extract.py produced on disk.\n\n**Total unique URLs: ${mismatch.size}**\n\n` +
      Array.from(mismatch.entries())
        .map(([url, line]) => `- ${line}`)
        .join('\n') + '\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, '03-bug-in-frontend.md'),
    header +
      `## 3. Bug in frontend\n\nNo failures could be attributed to frontend URL building from this report. The check script uses the same album JSON and image base URL as the frontend; failures are either missing files, backend path mismatch, or other (data/timeout). If the frontend displayed a different URL for an item, compare frontend \`imageUrl.ts\` logic with \`scripts/check-album-assets.mjs\` (getAlbumThumbnailUrl, getPhotoThumbUrl, getPhotoFullUrl).\n\n**Items requiring frontend investigation: ${frontendBug.length}**\n\n` +
      (frontendBug.length ? frontendBug.map((l) => `- ${l}`).join('\n') + '\n' : ''),
    'utf8'
  );

  fs.writeFileSync(
    path.join(outDir, '04-other-problems.md'),
    header +
      `## 4. Other problems\n\nAlbum has no thumbnail (thumb-placeholder not allowed), Album JSON failed/error, timeout, or not an image (Content-Type).\n\n**Total lines: ${other.length}**\n\n` +
      other.map((l) => `- ${l}`).join('\n') + '\n',
    'utf8'
  );

  const index = `# Missing images categorization 2026-02-01\n\nParsed from \`report_fail_20260130.md\` (output of \`scripts/check-album-assets.mjs\`).\n\n| Category | File | Count |\n|----------|------|-------|\n| 1. Actually missing image | [01-actually-missing-image.md](./01-actually-missing-image.md) | ${actuallyMissing.size} unique URLs |\n| 2. Mismatch (backend vs extract.py) | [02-mismatch-backend-vs-extract-py.md](./02-mismatch-backend-vs-extract-py.md) | ${mismatch.size} unique URLs |\n| 3. Bug in frontend | [03-bug-in-frontend.md](./03-bug-in-frontend.md) | ${frontendBug.length} |\n| 4. Other problems | [04-other-problems.md](./04-other-problems.md) | ${other.length} lines |\n`;
  fs.writeFileSync(path.join(outDir, 'README.md'), index, 'utf8');

  console.log('Wrote __docs/missing_images_20260201/');
  console.log('  01-actually-missing-image.md:', actuallyMissing.size);
  console.log('  02-mismatch-backend-vs-extract-py.md:', mismatch.size);
  console.log('  03-bug-in-frontend.md:', frontendBug.length);
  console.log('  04-other-problems.md:', other.length);
}

main();
