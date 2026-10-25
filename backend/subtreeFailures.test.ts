/**
 * Unit tests for subtreeFailures (LOGIC-21): an early-rejecting child walk is handled at once
 * (no unhandledRejection), recorded, and reported.
 */

import assert from 'assert';
import { settleSubtree, formatSubtreeFailures, type SubtreeFailure } from './subtreeFailures';

async function run(): Promise<void> {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    const origError = console.error;
    console.error = () => {};
    try {
        const failures: SubtreeFailure[] = [];
        // A child walk that rejects immediately, while the "parent" is still busy for a while.
        const early = settleSubtree(Promise.reject(new Error('DB gone')), 42, failures);
        const ok = settleSubtree(Promise.resolve(), 7, failures);
        await new Promise((r) => setTimeout(r, 50)); // parent awaiting its photos
        await Promise.all([early, ok]);
        await new Promise((r) => setImmediate(r));

        assert.deepStrictEqual(unhandled, [], 'no unhandled rejection');
        assert.deepStrictEqual(failures, [{ albumId: 42, message: 'DB gone' }]);
        // non-Error rejection values are recorded too
        await settleSubtree(Promise.reject('boom'), 3, failures);
        assert.strictEqual(failures[1].message, 'boom');

        const lines = formatSubtreeFailures(failures);
        assert.strictEqual(lines[0], '2 album subtree(s) FAILED (output incomplete):');
        assert.deepStrictEqual(lines.slice(1), ['  - album 3: boom', '  - album 42: DB gone']);
        assert.deepStrictEqual(formatSubtreeFailures([]), []);
    } finally {
        console.error = origError;
        process.off('unhandledRejection', onUnhandled);
    }
    console.log('subtreeFailures tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
