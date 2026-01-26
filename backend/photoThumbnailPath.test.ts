/**
 * Unit tests for highlightThumbnailUrlPath computation.
 * - GalleryPhotoItem: uipath-based dir + getThumbTarget(cleanedTitle, rawPath, thumbPrefix).
 * - GalleryAlbumItem: same formula applied to findFirstPhotoRecursive result (first-descendant image).
 */

import assert from 'assert';
import { cleanup_uipathcomponent } from './cleanupUipath';
import { getThumbTarget } from './legacyPaths';

const THUMB_PREFIX = 't__';

/** Synthetic findFirstPhotoRecursive result for testing album-child highlight thumb formula. */
interface FirstPhotoResult {
    photo: { pathComponent: string; title?: string | null };
    uipath: string[];
}

/**
 * Computes highlightThumbnailUrlPath for album child from a findFirstPhotoRecursive-like result.
 * Same formula as buildHighlightThumbnailUrlPathFromResult in index.ts (dir + getThumbTarget).
 */
function computeAlbumChildHighlightThumbnailUrlPath(
    result: FirstPhotoResult,
    thumbPrefix: string,
): string | null {
    const { photo, uipath: photoUipath } = result;
    if (!photo.pathComponent) return null;
    const cleanedTitle = cleanup_uipathcomponent(photo.title ?? photo.pathComponent ?? '');
    const rawPath = photo.pathComponent;
    const dir = photoUipath.slice(1).join('/');
    const thumbFilename = getThumbTarget(cleanedTitle, rawPath, thumbPrefix);
    return dir ? `${dir}/${thumbFilename}` : thumbFilename;
}

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

    // Album-child highlight thumb: same formula from synthetic findFirstPhotoRecursive result
    const albumHighlightResult: FirstPhotoResult = {
        photo: { pathComponent: 'p000335.jpg', title: 'p000335.jpg' },
        uipath: ['', 'dreamhack', 'dreamhack_97', 'martin_ojes'],
    };
    const albumThumb = computeAlbumChildHighlightThumbnailUrlPath(albumHighlightResult, THUMB_PREFIX);
    assert.strictEqual(albumThumb, 'dreamhack/dreamhack_97/martin_ojes/' + getThumbTarget('p000335.jpg', 'p000335.jpg', THUMB_PREFIX));
    assert.ok(albumThumb !== null && albumThumb.includes(THUMB_PREFIX));

    // Album-child: empty pathComponent returns null (no highlight)
    assert.strictEqual(
        computeAlbumChildHighlightThumbnailUrlPath(
            { photo: { pathComponent: '' }, uipath: ['', 'a'] },
            THUMB_PREFIX,
        ),
        null,
    );

    // When resolved photo is first direct photo, highlightThumbnailUrlPath equals thumbnailUrlPath (same dir + getThumbTarget)
    const firstPhotoResult: FirstPhotoResult = {
        photo: { pathComponent: 'img.jpg', title: 'Image' },
        uipath: ['', 'album1', 'subalbum'],
    };
    const highlightThumb = computeAlbumChildHighlightThumbnailUrlPath(firstPhotoResult, THUMB_PREFIX);
    const sameAsThumbUrlPath = 'album1/subalbum/' + getThumbTarget('image', 'img.jpg', THUMB_PREFIX);
    assert.strictEqual(highlightThumb, sameAsThumbUrlPath);

    console.log('photoThumbnailPath tests passed');
}

run();
