/**
 * Unit tests for decode and cleanup_uipathcomponent.
 * Run with: ts-node cleanupUipath.test.ts (or add to test runner).
 */

import assert from 'assert';
import { decode, cleanup_uipathcomponent } from './cleanupUipath';

function run(): void {
  // decode
  assert.strictEqual(decode(null), '');
  assert.strictEqual(decode(undefined), '');
  assert.strictEqual(decode(''), '');
  assert.strictEqual(decode('ascii'), 'ascii');
  assert.ok(decode('Café').includes('Cafe') || decode('Café') === 'Cafe');

  // cleanup_uipathcomponent
  assert.strictEqual(cleanup_uipathcomponent(null), '');
  assert.strictEqual(cleanup_uipathcomponent(undefined), '');
  assert.strictEqual(cleanup_uipathcomponent(''), '');
  assert.strictEqual(cleanup_uipathcomponent('IMG 0064 001'), 'img_0064_001');
  assert.strictEqual(cleanup_uipathcomponent('a [tag] b'), 'a_b');
  assert.strictEqual(cleanup_uipathcomponent('a__b'), 'a_b');
  assert.strictEqual(cleanup_uipathcomponent('a_-_b'), 'a-b');
  assert.ok(/^[a-z0-9_\-]+$/.test(cleanup_uipathcomponent('A/B\\C?')), 'illegal chars → _');

  console.log('cleanupUipath tests passed');
}

run();
