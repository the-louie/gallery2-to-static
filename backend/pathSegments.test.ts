/**
 * Unit tests for pathSegments.
 */

import assert from 'assert';
import {
  fallbackSegment,
  isUnusableSegment,
  addToPathIndex,
  titleToSegment,
  getSegmentForAlbum,
  buildPathFromBreadcrumb,
  appendSegment,
} from './pathSegments';
import type { BreadcrumbItem } from './types';

function run(): void {
  // titleToSegment
  assert.strictEqual(titleToSegment(null), '');
  assert.strictEqual(titleToSegment(undefined), '');
  assert.strictEqual(titleToSegment(''), '');
  assert.strictEqual(titleToSegment('Photos'), 'photos');
  // Dots stay legal (old lanbilder.se URLs use them, e.g. /badalan/badalan_v1.0/); same as test-vectors/nordic-path-normalization.json
  assert.strictEqual(titleToSegment('Backspace 2.0'), 'backspace_2.0');
  assert.ok(/^[a-z0-9_\-]+$/.test(titleToSegment('A/B\\C?')), 'illegal chars → _');

  // getSegmentForAlbum – no collision
  const used1 = new Set<string>();
  assert.strictEqual(getSegmentForAlbum('Photos', 1, used1), 'photos');
  assert.strictEqual(getSegmentForAlbum('Albums', 2, used1), 'albums');
  assert.deepStrictEqual(Array.from(used1).sort(), ['albums', 'photos']);

  // getSegmentForAlbum – duplicate title, disambiguate
  const used2 = new Set<string>();
  assert.strictEqual(getSegmentForAlbum('Photos', 10, used2), 'photos');
  assert.strictEqual(getSegmentForAlbum('Photos', 20, used2), 'photos--20');
  assert.strictEqual(getSegmentForAlbum('Photos', 30, used2), 'photos--30');
  assert.deepStrictEqual(Array.from(used2).sort(), ['photos', 'photos--20', 'photos--30']);

  // getSegmentForAlbum – unusable segments fall back to album_<id> (LOGIC-11)
  const used3 = new Set<string>();
  assert.strictEqual(getSegmentForAlbum('', 507876, used3), 'album_507876');
  assert.strictEqual(getSegmentForAlbum(null, 71175, used3), 'album_71175');
  assert.strictEqual(getSegmentForAlbum(undefined, 3, used3), 'album_3');
  assert.strictEqual(getSegmentForAlbum('.', 5, used3), 'album_5');
  assert.strictEqual(getSegmentForAlbum('..', 6, used3), 'album_6');
  assert.strictEqual(getSegmentForAlbum('[b][/b]', 8, used3), 'album_8', 'markup-only title cleans to empty');
  assert.ok(isUnusableSegment('') && isUnusableSegment('.') && isUnusableSegment('..'));
  assert.ok(!isUnusableSegment('...') && !isUnusableSegment('v1.0'));
  assert.strictEqual(fallbackSegment(9), 'album_9');

  // getSegmentForAlbum – disambiguated segment taken by a sibling's own title (a, a--3, a)
  const used4 = new Set<string>();
  assert.strictEqual(getSegmentForAlbum('a', 1, used4), 'a');
  assert.strictEqual(getSegmentForAlbum('a--3', 9, used4), 'a--3');
  assert.strictEqual(getSegmentForAlbum('a', 3, used4), 'a--3--2');
  assert.strictEqual(used4.size, 3, 'all three segments distinct');

  // addToPathIndex – same id is idempotent, a different id throws instead of overwriting
  const index = new Map<string, number>();
  addToPathIndex(index, '/a', 1);
  addToPathIndex(index, '/a', 1);
  assert.throws(() => addToPathIndex(index, '/a', 2), /collision.*"\/a".*album 1 and album 2/);
  assert.strictEqual(index.get('/a'), 1);

  // buildPathFromBreadcrumb
  assert.strictEqual(buildPathFromBreadcrumb([]), '/');
  const rootOnly: BreadcrumbItem[] = [{ id: 7, title: 'Home', path: '/' }];
  assert.strictEqual(buildPathFromBreadcrumb(rootOnly), '/');
  const withChild: BreadcrumbItem[] = [
    { id: 7, title: 'Home', path: '/' },
    { id: 8, title: 'Albums', path: '/albums' },
  ];
  assert.strictEqual(buildPathFromBreadcrumb(withChild), '/albums');
  const deep: BreadcrumbItem[] = [
    { id: 7, title: 'Home', path: '/' },
    { id: 8, title: 'A', path: '/a' },
    { id: 9, title: 'B', path: '/a/b' },
  ];
  assert.strictEqual(buildPathFromBreadcrumb(deep), '/a/b');

  // appendSegment
  assert.strictEqual(appendSegment('', 'albums'), '/albums');
  assert.strictEqual(appendSegment('/', 'albums'), '/albums');
  assert.strictEqual(appendSegment('/a', 'b'), '/a/b');
  assert.strictEqual(appendSegment('/a/', 'b'), '/a/b');
  assert.strictEqual(appendSegment('/a', ''), '/a');

  console.log('pathSegments.test.ts: all assertions passed');
}

run();
