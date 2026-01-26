/**
 * Unit tests for photo child highlightThumbnailUrlPath computation.
 * Verifies the same formula used in index.ts (processedChildrenWithThumbnails)
 * for GalleryPhotoItem: uipath-based dir + getThumbTarget(cleanedTitle, rawPath, thumbPrefix).
 */

import assert from 'assert';
import { cleanup_uipathcomponent } from './cleanupUipath';
import { getThumbTarget } from './legacyPaths';

const THUMB_PREFIX = 't__';

/**
 * Computes highlightThumbnailUrlPath for a photo child (same logic as backend/index.ts).
 * Used here only to test the contract; production code lives in index.ts.
 */
function computePhotoHighlightThumbnailUrlPath(
    uipath: string[],
    pathComponent: string,
    title: string | null,
    thumbPrefix: string,
): string {
    const rawPath = pathComponent.split('/').pop() ?? '';
    const cleanedTitle = cleanup_uipathcomponent(title ?? rawPath ?? '');
    const dir = uipath.slice(1).join('/');
    const thumbFilename = getThumbTarget(cleanedTitle, rawPath, thumbPrefix);
    return dir ? `${dir}/${thumbFilename}` : thumbFilename;
}

function run(): void {
    // uipath: ['', 'dreamhack', 'dreamhack_97', 'martin_ojes'] (current album)
    // pathComponent: full path as set by processedChildren; rawPath = last segment
    const uipath = ['', 'dreamhack', 'dreamhack_97', 'martin_ojes'];
    const pathComponent = 'dreamhack/dh97/dh97ojes/p000335.jpg';
    const title = 'p000335.jpg';

    const result = computePhotoHighlightThumbnailUrlPath(
        uipath,
        pathComponent,
        title,
        THUMB_PREFIX,
    );

    const dir = 'dreamhack/dreamhack_97/martin_ojes';
    const rawPath = 'p000335.jpg';
    const cleanedTitle = cleanup_uipathcomponent(title);
    const thumbFilename = getThumbTarget(cleanedTitle, rawPath, THUMB_PREFIX);

    assert.strictEqual(result, `${dir}/${thumbFilename}`);
    assert.ok(result.includes(THUMB_PREFIX), 'result contains thumb prefix');
    assert.ok(result.endsWith('.jpg'), 'result ends with .jpg');

    // Root album (uipath = ['']): no directory, result is just thumb filename
    const rootResult = computePhotoHighlightThumbnailUrlPath(
        [''],
        'photo.jpg',
        'photo.jpg',
        THUMB_PREFIX,
    );
    assert.strictEqual(rootResult, 't__photo.jpg');

    // Title differs from pathComponent: ___ suffix in thumb filename
    const result2 = computePhotoHighlightThumbnailUrlPath(
        ['', 'a', 'b'],
        'folder/IMG_001.jpg',
        'My Image',
        THUMB_PREFIX,
    );
    const expectedThumb = getThumbTarget('my_image', 'IMG_001.jpg', THUMB_PREFIX);
    assert.strictEqual(result2, `a/b/${expectedThumb}`);
    assert.ok(result2.includes('___'), 'thumb filename includes ___ when title differs');

    console.log('photoThumbnailPath tests passed');
}

run();
