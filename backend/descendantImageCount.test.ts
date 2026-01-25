/**
 * Unit tests for computeAllDescendantImageCounts.
 * Run with: ts-node descendantImageCount.test.ts (or add to test runner).
 */

import assert from 'assert';
import { computeAllDescendantImageCounts } from './descendantImageCount';
import type { Child } from './types';

function photo(id: number, pathComponent: string): Child {
    return {
        id,
        type: 'GalleryPhotoItem',
        hasChildren: false,
        title: null,
        description: null,
        pathComponent,
        timestamp: null,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
    };
}

function album(
    id: number,
    pathComponent: string,
    hasChildren: boolean = true,
): Child {
    return {
        id,
        type: 'GalleryAlbumItem',
        hasChildren,
        title: `Album ${id}`,
        description: null,
        pathComponent,
        timestamp: null,
        width: null,
        height: null,
        thumb_width: null,
        thumb_height: null,
    };
}

async function run(): Promise<void> {
    const ignoreSet = new Set<number>();

    // Album with only direct photos
    const albumsWithOnlyPhotos = new Set<number>([1]);
    const getChildrenOnlyPhotos = async (id: number): Promise<Child[]> => {
        if (id === 1) {
            return [
                photo(10, 'a.jpg'),
                photo(11, 'b.jpg'),
            ];
        }
        return [];
    };
    const map1 = await computeAllDescendantImageCounts(
        1,
        getChildrenOnlyPhotos,
        ignoreSet,
        albumsWithOnlyPhotos,
    );
    assert.strictEqual(map1.get(1), 2, 'album with 2 direct photos → count 2');

    // Album with nested albums
    const albumsWithNested = new Set<number>([1, 2, 3]);
    const getChildrenNested = async (id: number): Promise<Child[]> => {
        if (id === 1) return [album(2, 'sub1'), photo(10, 'a.jpg')];
        if (id === 2) return [album(3, 'sub2'), photo(20, 'b.jpg')];
        if (id === 3) return [photo(30, 'c.jpg'), photo(31, 'd.jpg')];
        return [];
    };
    const map2 = await computeAllDescendantImageCounts(
        1,
        getChildrenNested,
        ignoreSet,
        albumsWithNested,
    );
    assert.strictEqual(map2.get(3), 2, 'leaf album has 2 photos');
    assert.strictEqual(map2.get(2), 3, 'album 2: 1 direct + 2 from album 3');
    assert.strictEqual(map2.get(1), 4, 'album 1: 1 direct + 3 from album 2');

    // Blacklisted subtree excluded from count
    const ignoreSetBlacklist = new Set<number>([2]);
    const albumsWithBlacklist = new Set<number>([1, 2, 3]);
    const getChildrenBlacklist = async (id: number): Promise<Child[]> => {
        if (id === 1) return [album(2, 'sub1'), photo(10, 'a.jpg')];
        if (id === 2) return [photo(20, 'b.jpg')];
        return [];
    };
    const map3 = await computeAllDescendantImageCounts(
        1,
        getChildrenBlacklist,
        ignoreSetBlacklist,
        albumsWithBlacklist,
    );
    // Album 2 is blacklisted so filtered children of 1 are only [photo(10)]; album 2 not recursed.
    assert.strictEqual(map3.get(1), 1, 'album 1: only direct photo counts (album 2 blacklisted)');

    // Empty album
    const albumsEmpty = new Set<number>([1]);
    const getChildrenEmpty = async (_id: number): Promise<Child[]> => [];
    const map4 = await computeAllDescendantImageCounts(
        1,
        getChildrenEmpty,
        ignoreSet,
        albumsEmpty,
    );
    assert.strictEqual(map4.get(1), 0, 'empty album → count 0');

    console.log('descendantImageCount tests passed');
}

run().catch((err) => {
    console.error(err);
    process.exit(1);
});
