/**
 * Unit tests for getLinkTarget and getThumbTarget.
 * Run with: ts-node legacyPaths.test.ts (or add to test runner).
 */

import assert from 'assert';
import { getLinkTarget, getThumbTarget } from './legacyPaths';

const THUMB = 't__';

function run(): void {
  // getLinkTarget: title vs pathComponent differ → ___ suffix
  assert.strictEqual(
    getLinkTarget('img_0064_001', 'IMG_0064_001.jpg'),
    'img_0064_001___img_0064_001.jpg',
  );
  // same (case-insensitive) → no suffix
  assert.strictEqual(getLinkTarget('img_0064_001', 'img_0064_001.jpg'), 'img_0064_001.jpg');
  // empty pathComponent → no suffix
  assert.strictEqual(getLinkTarget('img_0064_001', ''), 'img_0064_001.jpg');
  // empty uipathcomponent → pathcomponent normalized (no ___ prefix; matches export)
  assert.strictEqual(
    getLinkTarget('', '20090418-IMG_1720.jpg'),
    '20090418-img_1720.jpg',
  );
  // .jpg.jpg fix (differ: suffix added → a___a.jpg; same case covered above)
  assert.strictEqual(getLinkTarget('a', 'a.jpg'), 'a___a.jpg');
  assert.ok(!getLinkTarget('a', 'a.jpg').includes('.jpg.jpg'));

  // getThumbTarget
  assert.strictEqual(
    getThumbTarget('img_0064_001', 'IMG_0064_001.jpg', THUMB),
    't__img_0064_001___img_0064_001.jpg',
  );
  assert.strictEqual(getThumbTarget('img_0064_001', '', THUMB), 't__img_0064_001.jpg');
  // empty uipathcomponent → thumbPrefix + pathcomponent normalized
  assert.strictEqual(
    getThumbTarget('', '20090418-IMG_1720.jpg', THUMB),
    't__20090418-img_1720.jpg',
  );
  assert.ok(!getThumbTarget('a', 'a.jpg', THUMB).includes('.jpg.jpg'));

  console.log('legacyPaths tests passed');
}

run();
