/**
 * Unit tests for configValidation (LOGIC-23).
 */

import assert from 'assert';
import { findConfigErrors } from './configValidation';
import type { Config } from './types';

const base: Config = {
    mysqlSettings: { host: 'h', user: 'u', database: 'd' },
    gallerySettings: { tablePrefix: 'g2_', columnPrefix: 'g_' },
    thumbPrefix: 't__',
};

function run(): void {
    assert.deepStrictEqual(findConfigErrors(base), [], 'defaults are valid');
    assert.deepStrictEqual(
        findConfigErrors({ ...base, thumbnailConcurrency: 5, verifyConcurrency: 1, thumbnailQuality: 100, rootId: 7 }),
        [],
    );
    assert.deepStrictEqual(findConfigErrors({ ...base, thumbnailConcurrency: null as unknown as number }), [], 'null = default');

    const bad = (patch: Record<string, unknown>) => findConfigErrors({ ...base, ...patch } as Config);
    assert.match(bad({ thumbnailConcurrency: 'x' })[0], /^thumbnailConcurrency must be an integer from 1 to 64 \(got "x"\)$/);
    assert.match(bad({ verifyConcurrency: '5' })[0], /verifyConcurrency.*got "5"/, 'numeric string rejected');
    assert.strictEqual(bad({ thumbnailConcurrency: 0 }).length, 1);
    assert.strictEqual(bad({ thumbnailQuality: 101 }).length, 1);
    assert.strictEqual(bad({ thumbnailMaxWidth: 2.5 }).length, 1, 'non-integer rejected');
    assert.strictEqual(bad({ verifyTimeoutMs: -1 }).length, 1);
    assert.strictEqual(bad({ rootId: 'seven' }).length, 1);
    assert.strictEqual(bad({ thumbnailConcurrency: 'x', verifyConcurrency: 'y' }).length, 2, 'all errors reported');

    console.log('configValidation tests passed');
}

run();
