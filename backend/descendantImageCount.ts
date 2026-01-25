/**
 * Total descendant image count for the exported album tree.
 * Uses same traversal and filtering as main export (ignoreSet, albumsWithImageDescendants).
 *
 * @module backend/descendantImageCount
 */

import type { Child } from './types';

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
export async function computeAllDescendantImageCounts(
    albumId: number,
    getChildren: (id: number) => Promise<Child[]>,
    ignoreSet: Set<number>,
    albumsWithImageDescendants: Set<number>,
): Promise<Map<number, number>> {
    const result = new Map<number, number>();

    async function visit(id: number): Promise<number> {
        const children = await getChildren(id);
        const filtered = children.filter(
            (c) =>
                c.type !== 'GalleryAlbumItem' ||
                (!isBlacklisted(c.id, ignoreSet) && albumsWithImageDescendants.has(c.id)),
        );
        const directPhotos = filtered.filter((c) => c.type === 'GalleryPhotoItem').length;
        let childAlbumSum = 0;
        for (const child of filtered) {
            if (child.type === 'GalleryAlbumItem' && child.hasChildren && child.pathComponent) {
                childAlbumSum += await visit(child.id);
            }
        }
        const total = directPhotos + childAlbumSum;
        result.set(id, total);
        return total;
    }

    await visit(albumId);
    return result;
}
