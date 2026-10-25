/**
 * Total descendant image count for the exported album tree.
 * Uses same traversal and filtering as main export (ignoreSet, albumsWithImageDescendants).
 *
 * @module backend/descendantImageCount
 */

import type { Child } from './types.ts';

function isBlacklisted(id: number, set: Set<number>): boolean {
    return set.has(id);
}

/**
 * Computes total descendant image count per album for the exported tree.
 * Count = direct GalleryPhotoItem in filtered children + sum of child albums' counts (post-order).
 * @param albumId Root album ID to traverse from
 * @param getChildren Async function to get children for an album ID
 * @param ignoreSet Set of album IDs to exclude (blacklist)
 * @param albumsWithImageDescendants Set of album IDs that have at least one image descendant
 * @returns Map of album ID → total descendant image count (only albums in exported tree)
 */
/** Per album id: photos below it, and items (photos + exported sub-albums) below it. */
export interface DescendantCounts {
    images: Map<number, number>;
    /** Gallery 2's `descendentCount` ("(878 items total)", PRIO-THEME-04), counting what the export writes */
    items: Map<number, number>;
}

export async function computeAllDescendantCounts(
    albumId: number,
    getChildren: (id: number) => Promise<Child[]>,
    ignoreSet: Set<number>,
    albumsWithImageDescendants: Set<number>,
): Promise<DescendantCounts> {
    const result = new Map<number, number>();
    const items = new Map<number, number>();

    async function visit(id: number): Promise<number> {
        const children = await getChildren(id);
        const filtered = children.filter(
            (c) =>
                c.type !== 'GalleryAlbumItem' ||
                (!isBlacklisted(c.id, ignoreSet) && albumsWithImageDescendants.has(c.id)),
        );
        const directPhotos = filtered.filter((c) => c.type === 'GalleryPhotoItem').length;
        let childAlbumSum = 0;
        let childItemSum = 0;
        for (const child of filtered) {
            if (child.type === 'GalleryAlbumItem' && child.hasChildren && child.pathComponent) {
                childAlbumSum += await visit(child.id);
                childItemSum += 1 + (items.get(child.id) ?? 0);
            }
        }
        const total = directPhotos + childAlbumSum;
        result.set(id, total);
        items.set(id, directPhotos + childItemSum);
        return total;
    }

    await visit(albumId);
    return { images: result, items };
}

export async function computeAllDescendantImageCounts(
    albumId: number,
    getChildren: (id: number) => Promise<Child[]>,
    ignoreSet: Set<number>,
    albumsWithImageDescendants: Set<number>,
): Promise<Map<number, number>> {
    return (await computeAllDescendantCounts(albumId, getChildren, ignoreSet, albumsWithImageDescendants)).images;
}
