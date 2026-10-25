#!/usr/bin/env node
// Runs every backend *.test.ts with ts-node, one after the other; exits 1 if any fails.
//   npm test            (all)       npm test -- pathSegments   (files whose name contains the filter)
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const filter = process.argv[2] ?? '';
const files = readdirSync(new URL('.', import.meta.url)).filter((f) => f.endsWith('.test.ts') && f.includes(filter)).sort();
const failed = [];
for (const file of files) {
  const r = spawnSync('npx', ['ts-node', file], { cwd: new URL('.', import.meta.url), stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) failed.push(file);
}
console.log(`\n${files.length - failed.length}/${files.length} backend test files passed${failed.length ? `; FAILED: ${failed.join(', ')}` : ''}`);
process.exit(failed.length ? 1 : 0);
