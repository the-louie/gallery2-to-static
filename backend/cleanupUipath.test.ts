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

  // Nordic: entity form → ASCII, no semicolons or entity names in path
  assert.strictEqual(cleanup_uipathcomponent('Martin &ouml;jes'), 'martin_ojes');
  assert.strictEqual(cleanup_uipathcomponent('n&auml;sslan_3'), 'nasslan_3');
  assert.strictEqual(cleanup_uipathcomponent('&aring;ngstrom'), 'angstrom');
  const ojesOut = cleanup_uipathcomponent('Martin &ouml;jes');
  assert.ok(!ojesOut.includes('ouml'), 'no ouml in output');
  assert.ok(!ojesOut.includes(';'), 'no semicolon in output');
  const nasslanOut = cleanup_uipathcomponent('n&auml;sslan_3');
  assert.ok(!nasslanOut.includes('auml'), 'no auml in output');
  const angstromOut = cleanup_uipathcomponent('&aring;ngstrom');
  assert.ok(!angstromOut.includes('aring'), 'no aring in output');

  // Nordic: entity without trailing semicolon (edge case)
  assert.strictEqual(cleanup_uipathcomponent('Martin &oumljes'), 'martin_ojes');

  // Nordic: uppercase entities
  assert.strictEqual(cleanup_uipathcomponent('&Ouml;jes'), 'ojes');
  assert.strictEqual(cleanup_uipathcomponent('&Auml;sslan'), 'asslan');
  assert.strictEqual(cleanup_uipathcomponent('&Aring;ngstrom'), 'angstrom');

  // Nordic: Unicode form → ASCII
  assert.strictEqual(cleanup_uipathcomponent('Martin Öjes'), 'martin_ojes');
  assert.strictEqual(cleanup_uipathcomponent('Nässlan'), 'nasslan');
  assert.strictEqual(cleanup_uipathcomponent('Ångström'), 'angstrom');

  console.log('cleanupUipath tests passed');
}

run();
