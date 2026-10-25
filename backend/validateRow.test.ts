import assert from 'node:assert/strict';
import {
  validateNullableString,
  validateRequiredString,
  validateNullableNumber,
  validateRequiredNumber,
} from './validateRow.ts';

function run() {
  // validateNullableString
  assert.strictEqual(validateNullableString(null, 'f', 255, 'ctx'), null, 'null returns null');
  assert.strictEqual(validateNullableString(undefined, 'f', 255, 'ctx'), null, 'undefined returns null');
  assert.strictEqual(validateNullableString('hello', 'f', 255, 'ctx'), 'hello', 'string passes through');
  assert.strictEqual(validateNullableString(42, 'f', 255, 'ctx'), '42', 'number converted to string');
  assert.strictEqual(validateNullableString(Buffer.from('test'), 'f', 255, 'ctx'), 'test', 'Buffer decoded to string');
  assert.strictEqual(validateNullableString({ foo: 1 }, 'f', 255, 'ctx'), null, 'object returns null with warning');
  assert.strictEqual(validateNullableString('abcdef', 'f', 3, 'ctx'), 'abc', 'truncates to maxLength');
  assert.strictEqual(validateNullableString('', 'f', 255, 'ctx'), '', 'empty string passes through');
  assert.strictEqual(validateNullableString(0, 'f', 255, 'ctx'), '0', 'zero converted to string');

  // validateRequiredString
  assert.strictEqual(validateRequiredString('hello', 'f', 255, 'ctx'), 'hello', 'valid string passes');
  assert.throws(() => validateRequiredString(null, 'f', 255, 'ctx'), /Required field/);
  assert.throws(() => validateRequiredString(undefined, 'f', 255, 'ctx'), /Required field/);
  assert.throws(() => validateRequiredString({ x: 1 }, 'f', 255, 'ctx'), /Required field/);

  // validateNullableNumber
  assert.strictEqual(validateNullableNumber(null, 'f', 'ctx'), null, 'null returns null');
  assert.strictEqual(validateNullableNumber(undefined, 'f', 'ctx'), null, 'undefined returns null');
  assert.strictEqual(validateNullableNumber(42, 'f', 'ctx'), 42, 'number passes through');
  assert.strictEqual(validateNullableNumber(0, 'f', 'ctx'), 0, 'zero passes through');
  assert.strictEqual(validateNullableNumber(-5, 'f', 'ctx'), -5, 'negative number passes through');
  assert.strictEqual(validateNullableNumber('42', 'f', 'ctx'), 42, 'numeric string parsed');
  assert.strictEqual(validateNullableNumber('3.14', 'f', 'ctx'), 3.14, 'decimal string parsed');
  assert.strictEqual(validateNullableNumber('abc', 'f', 'ctx'), null, 'non-numeric string returns null');
  assert.strictEqual(validateNullableNumber('', 'f', 'ctx'), null, 'empty string returns null');
  assert.strictEqual(validateNullableNumber(Infinity, 'f', 'ctx'), null, 'Infinity returns null');
  assert.strictEqual(validateNullableNumber(-Infinity, 'f', 'ctx'), null, '-Infinity returns null');
  assert.strictEqual(validateNullableNumber(NaN, 'f', 'ctx'), null, 'NaN returns null');
  assert.strictEqual(validateNullableNumber({ x: 1 }, 'f', 'ctx'), null, 'object returns null');
  assert.strictEqual(validateNullableNumber(true, 'f', 'ctx'), null, 'boolean returns null');

  // validateRequiredNumber
  assert.strictEqual(validateRequiredNumber(42, 'f', 'ctx'), 42, 'valid number passes');
  assert.strictEqual(validateRequiredNumber('42', 'f', 'ctx'), 42, 'numeric string coerced');
  assert.throws(() => validateRequiredNumber(null, 'f', 'ctx'), /Required field/);
  assert.throws(() => validateRequiredNumber(undefined, 'f', 'ctx'), /Required field/);
  assert.throws(() => validateRequiredNumber('abc', 'f', 'ctx'), /Required field/);
  assert.throws(() => validateRequiredNumber(NaN, 'f', 'ctx'), /Required field/);

  console.log('validateRow: all tests passed');
}

run();
