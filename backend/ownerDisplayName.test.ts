/**
 * Unit tests for normalizeOwnerDisplayName.
 */

import assert from 'assert';
import { normalizeOwnerDisplayName } from './ownerDisplayName';

function run(): void {
  // null → null
  assert.strictEqual(normalizeOwnerDisplayName(null), null);

  // "Gallery Administrator" → "The Louie"
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrator'), 'The Louie');

  // "The Louie" → "The Louie" (idempotent)
  assert.strictEqual(normalizeOwnerDisplayName('The Louie'), 'The Louie');

  // "Other User" → "Other User"
  assert.strictEqual(normalizeOwnerDisplayName('Other User'), 'Other User');

  // Empty string → unchanged
  assert.strictEqual(normalizeOwnerDisplayName(''), '');

  // Similar string not replaced
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrator '), 'Gallery Administrator ');
  assert.strictEqual(normalizeOwnerDisplayName('Gallery Administrators'), 'Gallery Administrators');

  console.log('ownerDisplayName tests passed');
}

run();
