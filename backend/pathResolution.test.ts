/**
 * Unit tests for direct path resolution (pathComponent-based).
 */

import assert from 'assert';
import { buildPathsFromPathComponent } from './pathResolution';

const THUMB_PREFIX = 't__';

function run(): void {
    // Single filename (root-level photo)
    const single = buildPathsFromPathComponent(['photo.jpg'], THUMB_PREFIX);
    assert.strictEqual(single.urlPath, 'photo.jpg');
    assert.strictEqual(single.thumbnailUrlPath, 't__photo.jpg');

    // Album path + filename
    const withDir = buildPathsFromPathComponent(['CV-LAN', 'CVLAN1', 'DSC00800.jpg'], THUMB_PREFIX);
    assert.strictEqual(withDir.urlPath, 'CV-LAN/CVLAN1/DSC00800.jpg');
    assert.strictEqual(withDir.thumbnailUrlPath, 'CV-LAN/CVLAN1/t__DSC00800.jpg');

    // Deep path
    const deep = buildPathsFromPathComponent(
        ['dreamhack', 'BAK.dhw05', 'Louie', '051119', 'p000335.jpg'],
        THUMB_PREFIX,
    );
    assert.strictEqual(deep.urlPath, 'dreamhack/BAK.dhw05/Louie/051119/p000335.jpg');
    assert.strictEqual(deep.thumbnailUrlPath, 'dreamhack/BAK.dhw05/Louie/051119/t__p000335.jpg');

    // Empty chain
    const empty = buildPathsFromPathComponent([], THUMB_PREFIX);
    assert.strictEqual(empty.urlPath, '');
    assert.strictEqual(empty.thumbnailUrlPath, '');

    // Custom thumb prefix
    const custom = buildPathsFromPathComponent(['a', 'b.jpg'], 'thumb_');
    assert.strictEqual(custom.thumbnailUrlPath, 'a/thumb_b.jpg');

    // Leading slash from empty pathComponent is stripped (relative path, no leading slash)
    const withLeading = buildPathsFromPathComponent(['', 'album', 'photo.jpg'], THUMB_PREFIX);
    assert.ok(!withLeading.urlPath.startsWith('/'), 'urlPath must not have leading slash');
    assert.strictEqual(withLeading.urlPath, 'album/photo.jpg');

    // Empty path components in middle are filtered (no double slashes)
    const emptyMiddle = buildPathsFromPathComponent(['a', '', 'b.jpg'], THUMB_PREFIX);
    assert.strictEqual(emptyMiddle.urlPath, 'a/b.jpg');
    assert.strictEqual(emptyMiddle.thumbnailUrlPath, 'a/t__b.jpg');

    console.log('pathResolution tests passed');
}

run();
