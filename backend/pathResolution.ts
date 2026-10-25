/**
 * Direct path resolution for images.
 * Uses pathComponent chain from database; matches disk structure under g2data/albums.
 */

/**
 * Thumbnail file name for a source file name (LOGIC-30). Thumbnails are always JPEG: a JPEG source
 * keeps its name (t__photo.jpg), any other source gets ".jpg" appended (t__anim.gif.jpg), so the
 * extension matches the content and "a.png" / "a.jpg" in one album cannot collide.
 * Mirrored in frontend/src/utils/imageUrl.ts (thumbnailFileName).
 */
export function thumbnailFileName(thumbPrefix: string, filename: string): string {
    return /\.jpe?g$/i.test(filename) ? thumbPrefix + filename : `${thumbPrefix}${filename}.jpg`;
}

/**
 * Build urlPath and thumbnailUrlPath from pathComponent chain (direct disk match).
 * pathComponent chain = ancestor album pathComponents + photo pathComponent (filename).
 * Rejects path components containing traversal segments, slashes, or null bytes.
 */
export function buildPathsFromPathComponent(
    pathComponentChain: string[],
    thumbPrefix: string,
): { urlPath: string; thumbnailUrlPath: string } {
    if (!pathComponentChain.length) {
        return { urlPath: '', thumbnailUrlPath: '' };
    }
    for (const component of pathComponentChain) {
        if (!component) continue;
        if (component.includes('\0')) {
            throw new Error(`Invalid path component: contains null byte`);
        }
        if (component.includes('..')) {
            throw new Error(`Invalid path component: contains traversal segment`);
        }
        if (component.includes('/') || component.includes('\\')) {
            throw new Error(`Invalid path component: contains path separator`);
        }
    }
    const relativePath = pathComponentChain.filter(Boolean).join('/').replace(/^\/+/, '');
    const lastSlash = relativePath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : relativePath.slice(0, lastSlash);
    const filename = lastSlash === -1 ? relativePath : relativePath.slice(lastSlash + 1);
    const thumbFilename = thumbnailFileName(thumbPrefix, filename);
    const thumbnailUrlPath = dir ? `${dir}/${thumbFilename}` : thumbFilename;
    return { urlPath: relativePath, thumbnailUrlPath };
}
