/**
 * Validation of config.json values that the run does arithmetic with (LOGIC-23).
 *
 * JSON gives no type guarantees: `"thumbnailConcurrency": "x"` used to become NaN, the semaphore
 * never granted, and the run exited 0 having written nothing. Each optional numeric field must be
 * absent/null or an integer within its range.
 */

import type { Config } from './types';

interface IntRule {
    field: keyof Config;
    min: number;
    max: number;
}

const INT_RULES: IntRule[] = [
    { field: 'rootId', min: 1, max: Number.MAX_SAFE_INTEGER },
    { field: 'thumbnailConcurrency', min: 1, max: 64 },
    { field: 'verifyConcurrency', min: 1, max: 64 },
    { field: 'verifyTimeoutMs', min: 1, max: 600_000 },
    { field: 'thumbnailMaxWidth', min: 1, max: 10_000 },
    { field: 'thumbnailMaxHeight', min: 1, max: 10_000 },
    { field: 'thumbnailQuality', min: 1, max: 100 },
];

/** Returns one message per invalid field; empty when the config is usable. */
export function findConfigErrors(config: Config): string[] {
    const errors: string[] = [];
    for (const { field, min, max } of INT_RULES) {
        const value = config[field] as unknown;
        if (value === undefined || value === null) continue;
        if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
            errors.push(`${field} must be an integer from ${min} to ${max} (got ${JSON.stringify(value)})`);
        }
    }
    return errors;
}
