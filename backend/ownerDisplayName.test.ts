/**
 * Unit tests for normalizeOwnerDisplayName.
 */

import assert from 'assert';
import { normalizeOwnerDisplayName, resolveOwnerName } from './ownerDisplayName';

function run(): void {
  // null → null
  assert.strictEqual(normalizeOwnerDisplayName(null), null);

  // "Gallery Administrator" → "Unknown"
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrator'), 'Unknown');

  // "Unknown" → "Unknown" (idempotent)
  assert.strictEqual(normalizeOwnerDisplayName('Unknown'), 'Unknown');

  // "Other User" → "Other User"
  assert.strictEqual(normalizeOwnerDisplayName('Other User'), 'Other User');

  // Empty string → unchanged
  assert.strictEqual(normalizeOwnerDisplayName(''), '');

  // Similar string not replaced
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrator '), 'Gallery Administrator ');
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrators'), 'Gallery Administrators');

  // resolveOwnerName: full name wins; blank/space-only full name falls back to user name
  assert.strictEqual(resolveOwnerName('Anna Svensson', 'anna'), 'Anna Svensson');
  assert.strictEqual(resolveOwnerName('  Anna Svensson ', 'anna'), 'Anna Svensson');
  assert.strictEqual(resolveOwnerName(null, 'kalle83'), 'kalle83');
  assert.strictEqual(resolveOwnerName('', 'fotograf'), 'fotograf');
  assert.strictEqual(resolveOwnerName('   ', 'admin'), 'admin');
  assert.strictEqual(resolveOwnerName('   ', ' nick '), 'nick');
  assert.strictEqual(resolveOwnerName(null, '  '), null);
  assert.strictEqual(resolveOwnerName(null, null), null);
  assert.strictEqual(normalizeOwnerDisplayName(resolveOwnerName('Gallery Administrator', 'admin')), 'Unknown');

  console.log('ownerDisplayName tests passed');
}

run();
