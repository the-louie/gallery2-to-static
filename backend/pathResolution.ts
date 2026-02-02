/**
 * Direct path resolution for images.
 * Uses pathComponent chain from database; matches disk structure under g2data/albums.
 */

/**
 * Build urlPath and thumbnailUrlPath from pathComponent chain (direct disk match).
 * pathComponent chain = ancestor album pathComponents + photo pathComponent (filename).
 */
export function buildPathsFromPathComponent(
    pathComponentChain: string[],
    thumbPrefix: string,
): { urlPath: string; thumbnailUrlPath: string } {
    if (!pathComponentChain.length) {
        return { urlPath: '', thumbnailUrlPath: '' };
    }
    const relativePath = pathComponentChain.filter(Boolean).join('/').replace(/^\/+/, '');
    const lastSlash = relativePath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : relativePath.slice(0, lastSlash);
    const filename = lastSlash === -1 ? relativePath : relativePath.slice(lastSlash + 1);
    const thumbFilename = thumbPrefix + filename;
    const thumbnailUrlPath = dir ? `${dir}/${thumbFilename}` : thumbFilename;
    return { urlPath: relativePath, thumbnailUrlPath };
}
