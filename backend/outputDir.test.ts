/**
 * Unit tests for outputDir (LOGIC-22): staging, stale-file listing, promotion without deleting.
 */

import assert from 'assert';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { runStamp, prepareStagingDir, listStaleFiles, promoteStagingDir } from './outputDir.ts';

async function run(): Promise<void> {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'outputDir-'));
    try {
        assert.strictEqual(runStamp(new Date(2026, 9, 25, 7, 5, 9)), '20261025-070509');
        const data = path.join(tmp, 'data');

        // First run: no previous output
        const s1 = await prepareStagingDir(data, 'r1');
        assert.strictEqual(s1, `${data}.new-r1`);
        await fs.access(path.join(s1, 'search'));
        await assert.rejects(() => prepareStagingDir(data, 'r1'), 'stamp collision refused');
        await fs.writeFile(path.join(s1, '7.json'), '{"a":1}');
        await fs.writeFile(path.join(s1, '8.json'), '{}');
        await fs.writeFile(path.join(s1, 'search', 'index.json'), '{}');
        assert.deepStrictEqual(await listStaleFiles(data, s1), [], 'nothing stale without previous output');
        assert.strictEqual(await promoteStagingDir(data, s1, 'r1'), null);
        assert.strictEqual(await fs.readFile(path.join(data, '7.json'), 'utf-8'), '{"a":1}');

        // Failed run: staging written, never promoted → data/ unchanged
        const sFail = await prepareStagingDir(data, 'rfail');
        await fs.writeFile(path.join(sFail, '7.json'), '{"broken":true}');
        assert.strictEqual(await fs.readFile(path.join(data, '7.json'), 'utf-8'), '{"a":1}', 'data/ untouched by a failed run');

        // Second run: album 8 is gone (deleted / ignored / no longer public)
        const s2 = await prepareStagingDir(data, 'r2');
        await fs.writeFile(path.join(s2, '7.json'), '{"a":2}');
        await fs.writeFile(path.join(s2, 'search', 'index.json'), '{}');
        assert.deepStrictEqual(await listStaleFiles(data, s2), ['8.json']);
        const prev = await promoteStagingDir(data, s2, 'r2');
        assert.strictEqual(prev, `${data}.prev-r2`);
        assert.strictEqual(await fs.readFile(path.join(data, '7.json'), 'utf-8'), '{"a":2}');
        await assert.rejects(() => fs.access(path.join(data, '8.json')), 'stale album not published');
        assert.strictEqual(await fs.readFile(path.join(prev!, '8.json'), 'utf-8'), '{}', 'previous output kept, not deleted');
        await assert.rejects(() => fs.access(s2), 'staging dir became data/');
        await fs.access(sFail); // failed run's output still there for inspection
    } finally {
        await fs.rm(tmp, { recursive: true, force: true });
    }
    console.log('outputDir tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
