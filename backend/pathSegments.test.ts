/**
 * Unit tests for pathSegments.
 */

import assert from 'assert';
import {
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
  assert.strictEqual(titleToSegment('Backspace 2.0'), 'backspace_2_0');
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
