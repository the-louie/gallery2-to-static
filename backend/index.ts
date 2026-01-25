import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils'
import { Config, Child, AlbumFile, BreadcrumbItem, AlbumMetadata } from './types'
import { cleanup_uipathcomponent } from './cleanupUipath'
import { getLinkTarget, getThumbTarget } from './legacyPaths'

/**
 * Build a Set of album IDs to ignore from config.ignoreAlbums.
 * Handles missing, null, non-array; normalizes strings/numbers to number; skips invalid entries.
 */
function buildIgnoreSet(raw: Array<string | number> | null | undefined): Set<number> {
    const arr = Array.isArray(raw) ? raw : [];
    const set = new Set<number>();
    for (const x of arr) {
        const n = typeof x === 'number' ? x : parseInt(String(x), 10);
        if (!Number.isFinite(n)) {
            console.warn(`ignoreAlbums: invalid album ID "${x}", skipping`);
            continue;
        }
        set.add(n);
    }
    return set;
}

/**
 * Check whether an album ID is in the ignore set.
 */
function isBlacklisted(id: number, set: Set<number>): boolean {
    return set.has(id);
}

/**
 * Finds the first photo (GalleryPhotoItem) in a children array.
 * @param children Array of child items (albums and photos)
 * @returns The first photo found, or null if no photos exist
 */
const findFirstPhoto = (children: Child[]): Child | null => {
    return children.find(child => child.type === 'GalleryPhotoItem') || null;
}

/**
 * Recursively finds the first photo in an album or its sub-albums.
 * Uses breadth-first search: checks direct children first, then recurses into sub-albums.
 * Respects ignoreSet when recursing into sub-albums.
 * @param albumId Album ID to search
 * @param sql SQL utilities instance
 * @param uipath Current UI path array for URL construction
 * @param pathComponent Current path component array for URL construction
 * @param ignoreSet Set of album IDs to ignore
 * @returns Object with photo and its uipath/pathComponent for URL building, or null if none found
 */
async function findFirstPhotoRecursive(
    albumId: number,
    sql: ReturnType<typeof sqlUtils>,
    uipath: Array<string>,
    pathComponent: Array<string>,
    ignoreSet: Set<number>,
): Promise<{ photo: Child; uipath: Array<string>; pathComponent: Array<string> } | null> {
    const children = await sql.getChildren(albumId);
    const filtered = children.filter(
        (c) => c.type !== 'GalleryAlbumItem' || !isBlacklisted(c.id, ignoreSet),
    );
    
    // Check direct children first (photos)
    const firstPhoto = findFirstPhoto(filtered);
    if (firstPhoto) {
        return {
            photo: firstPhoto,
            uipath,
            pathComponent,
        };
    }
    
    // Recurse into sub-albums (breadth-first: process all albums at this level before going deeper)
    for (const child of filtered) {
        if (child.type === 'GalleryAlbumItem' && child.hasChildren && child.pathComponent) {
            const title = cleanup_uipathcomponent(child.title ?? child.pathComponent ?? '');
            const result = await findFirstPhotoRecursive(
                child.id,
                sql,
                uipath.concat([title]),
                pathComponent.concat([child.pathComponent]),
                ignoreSet,
            );
            if (result) {
                return result;
            }
        }
    }
    
    return null;
}

/**
 * Computes the set of album IDs (in the subtree rooted at albumId) that have at least one
 * image descendant (GalleryPhotoItem in the album or any sub-album, recursively).
 * Respects ignoreSet: blacklisted albums are not recursed into.
 * @param albumId Album ID to traverse from
 * @param sql SQL utilities instance
 * @param ignoreSet Set of album IDs to ignore
 * @returns Set of album IDs that have at least one image descendant
 */
async function computeAlbumsWithImageDescendants(
    albumId: number,
    sql: ReturnType<typeof sqlUtils>,
    ignoreSet: Set<number>,
): Promise<Set<number>> {
    const children = await sql.getChildren(albumId);
    const filtered = children.filter(
        (c) => c.type !== 'GalleryAlbumItem' || !isBlacklisted(c.id, ignoreSet),
    );
    const result = new Set<number>();
    if (findFirstPhoto(filtered) !== null) {
        result.add(albumId);
    }
    for (const child of filtered) {
        if (child.type === 'GalleryAlbumItem' && child.hasChildren && child.pathComponent) {
            const childSet = await computeAlbumsWithImageDescendants(child.id, sql, ignoreSet);
            if (childSet.size > 0) {
                result.add(albumId);
                childSet.forEach((id) => result.add(id));
            }
        }
    }
    return result;
}

/**
 * Resolves the highlight image URL for an album.
 * Since highlightId is not available in the database schema, this function
 * uses recursive first-image fallback only.
 * @param root Album ID
 * @param sql SQL utilities instance
 * @param uipath Current UI path array
 * @param pathComponent Current path component array
 * @param ignoreSet Set of album IDs to ignore
 * @returns Highlight image URL string, or null if no image found
 */
async function resolveHighlightImageUrl(
    root: number,
    sql: ReturnType<typeof sqlUtils>,
    uipath: Array<string>,
    pathComponent: Array<string>,
    ignoreSet: Set<number>,
): Promise<string | null> {
    try {
        const result = await findFirstPhotoRecursive(
            root,
            sql,
            uipath,
            pathComponent,
            ignoreSet,
        );
        
        if (!result) {
            return null;
        }
        
        const { photo, uipath: photoUipath } = result;
        
        if (!photo.pathComponent) {
            return null;
        }
        
        const cleanedTitle = cleanup_uipathcomponent(photo.title ?? photo.pathComponent ?? '');
        const rawPath = photo.pathComponent;
        const dir = photoUipath.slice(1).join('/');
        const linkFilename = getLinkTarget(cleanedTitle, rawPath);
        const urlPath = dir ? `${dir}/${linkFilename}` : linkFilename;
        
        return urlPath;
    } catch (error) {
        console.warn(`Error resolving highlight image for album ${root}:`, error);
        return null;
    }
}

/**
 * Extracts thumbnail information from a photo.
 * @param photo The photo to extract thumbnail info from
 * @returns Object containing thumbnail fields extracted from the photo
 */
const extractThumbnailInfo = (photo: Child): {
    thumbnailPathComponent: string | null;
    thumbnailPhotoId: number;
    thumbnailWidth: number | null;
    thumbnailHeight: number | null;
} => {
    return {
        thumbnailPathComponent: photo.pathComponent ?? null,
        thumbnailPhotoId: photo.id,
        thumbnailWidth: photo.thumb_width ?? null,
        thumbnailHeight: photo.thumb_height ?? null
    };
}

/**
 * Search index item structure matching frontend SearchIndexItem interface
 * Note: Only albums (GalleryAlbumItem) are included in the search index to reduce file size.
 * Empty fields like description are omitted to further reduce file size.
 */
interface SearchIndexItem {
    id: number;
    type: 'GalleryAlbumItem' | 'GalleryPhotoItem';
    title: string;
    description?: string; // Optional, only included if non-empty
    parentId?: number;
    pathComponent: string;
    ancestors?: string; // Optional, path of ancestor albums (root omitted), e.g. "dreamhack/dreamhack 08/crew"
}

const main = async (
    sql: ReturnType<typeof sqlUtils>,
    root: number,
    pathComponent: Array<string> = [],
    uipath: Array<string> = [''],
    dataDir: string,
    searchIndex: Map<number, SearchIndexItem>,
    thumbPrefix: string,
    ignoreSet: Set<number>,
    breadcrumbAncestors: BreadcrumbItem[] = [],
    config: Config,
    albumsWithImageDescendants: Set<number>,
) => {
    const children = await sql.getChildren(root);
    // Exclude child albums that are blacklisted or have no image descendant.
    const filtered = children.filter(
        (c) =>
            c.type !== 'GalleryAlbumItem' ||
            (!isBlacklisted(c.id, ignoreSet) && albumsWithImageDescendants.has(c.id)),
    );
    if (filtered.length > 0) {
        const albumInfo = await sql.getAlbumInfo(root);
        
        // Build breadcrumbPath for current album
        const isRoot = breadcrumbAncestors.length === 0;
        const currentBreadcrumbItem: BreadcrumbItem = {
            id: root,
            title: isRoot ? 'Home' : (albumInfo.albumTitle ?? `Album ${root}`),
            path: isRoot ? '/' : `/album/${root}`,
        };
        const breadcrumbPath: BreadcrumbItem[] = isRoot
            ? [currentBreadcrumbItem]
            : breadcrumbAncestors.concat([currentBreadcrumbItem]);
        
        const recursivePromises: Promise<void>[] = [];
        filtered.forEach((child) => {
            if (child.hasChildren && child.pathComponent) {
                const title = cleanup_uipathcomponent(child.title ?? child.pathComponent ?? '');
                recursivePromises.push(
                    main(
                        sql,
                        child.id,
                        pathComponent.concat([child.pathComponent]),
                        uipath.concat([title]),
                        dataDir,
                        searchIndex,
                        thumbPrefix,
                        ignoreSet,
                        breadcrumbPath,
                        config,
                        albumsWithImageDescendants,
                    ),
                );
            }
        });
        const processedChildren = filtered.map((child) => {
            if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                const fullPath = pathComponent.concat([child.pathComponent]).join('/');
                const cleanedTitle = cleanup_uipathcomponent(child.title ?? child.pathComponent ?? '');
                const rawPath = child.pathComponent;
                const dir = uipath.slice(1).join('/');
                const linkFilename = getLinkTarget(cleanedTitle, rawPath);
                const urlPath = dir ? `${dir}/${linkFilename}` : linkFilename;
                return { ...child, pathComponent: fullPath, urlPath };
            }
            return child;
        });
        await Promise.all(recursivePromises);

        const processedChildrenWithThumbnails = await Promise.all(
            processedChildren.map(async (child) => {
                if (child.type === 'GalleryAlbumItem') {
                    const albumTitle = cleanup_uipathcomponent(
                        child.title ?? child.pathComponent ?? '',
                    );
                    const albumUipath = uipath.concat([albumTitle]);
                    const childPathComponent = child.pathComponent
                        ? pathComponent.concat([child.pathComponent])
                        : pathComponent;
                    const highlightImageUrl = child.pathComponent
                        ? await resolveHighlightImageUrl(
                              child.id,
                              sql,
                              albumUipath,
                              childPathComponent,
                              ignoreSet,
                          )
                        : null;
                    const highlightSpread =
                        highlightImageUrl !== null ? { highlightImageUrl } : {};

                    const albumChildren = await sql.getChildren(child.id);
                    const firstPhoto = findFirstPhoto(albumChildren);
                    if (firstPhoto) {
                        const photoPathComponent =
                            firstPhoto.pathComponent && child.pathComponent
                                ? pathComponent
                                      .concat([child.pathComponent, firstPhoto.pathComponent])
                                      .join('/')
                                : firstPhoto.pathComponent;
                        const processedFirstPhoto = {
                            ...firstPhoto,
                            pathComponent: photoPathComponent,
                        };
                        const thumbnailInfo = extractThumbnailInfo(processedFirstPhoto);
                        const cleanedTitle = cleanup_uipathcomponent(
                            firstPhoto.title ?? firstPhoto.pathComponent ?? '',
                        );
                        const rawPath = firstPhoto.pathComponent ?? '';
                        const dir = albumUipath.slice(1).join('/');
                        const thumbFilename = getThumbTarget(
                            cleanedTitle,
                            rawPath,
                            thumbPrefix,
                        );
                        const thumbnailUrlPath = dir
                            ? `${dir}/${thumbFilename}`
                            : thumbFilename;
                        return {
                            ...child,
                            ...thumbnailInfo,
                            thumbnailUrlPath,
                            ...highlightSpread,
                        };
                    }
                    return { ...child, ...highlightSpread };
                }
                return child;
            }),
        );

        for (const child of processedChildrenWithThumbnails) {
            if (child.type === 'GalleryAlbumItem') {
                const searchItem: SearchIndexItem = {
                    id: child.id,
                    type: 'GalleryAlbumItem',
                    title: child.title ?? '',
                    pathComponent: child.pathComponent ?? '',
                };
                if (child.description && child.description.trim().length > 0) {
                    searchItem.description = child.description;
                }
                searchItem.parentId = root;
                if (uipath.length > 1) {
                    searchItem.ancestors = uipath.slice(1).join('/');
                }
                searchIndex.set(child.id, searchItem);
            }
        }

        const metadata: AlbumMetadata = {
            albumId: albumInfo.albumId,
            albumTitle: albumInfo.albumTitle,
            albumDescription: albumInfo.albumDescription,
            albumTimestamp: albumInfo.albumTimestamp,
            ownerName: albumInfo.ownerName,
            breadcrumbPath,
        };
        
        // Resolve highlight image URL (recursive first image fallback)
        const highlightImageUrl = await resolveHighlightImageUrl(
            root,
            sql,
            uipath,
            pathComponent,
            ignoreSet,
        );
        
        if (highlightImageUrl !== null) {
            metadata.highlightImageUrl = highlightImageUrl;
        }
        
        const albumFile: AlbumFile = { metadata, children: processedChildrenWithThumbnails };
        const filePath = path.join(dataDir, `${root}.json`);
        try {
            await fs.writeFile(
                filePath,
                JSON.stringify(albumFile, null, 2),
            );
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            throw error;
        }
    }
}

let connection: mysql.Connection | null = null;

(async () => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        let config: Config;
        try {
            const configFile = await fs.readFile(configPath, 'utf-8');
            config = JSON.parse(configFile) as Config;
            if (!config.mysqlSettings || !config.gallerySettings) {
                throw new Error('Missing required config fields: mysqlSettings or gallerySettings');
            }
            if (!config.mysqlSettings.host || !config.mysqlSettings.user || !config.mysqlSettings.database) {
                throw new Error('Missing required mysqlSettings fields: host, user, or database');
            }
            if (!config.gallerySettings.tablePrefix || !config.gallerySettings.columnPrefix) {
                throw new Error('Missing required gallerySettings fields: tablePrefix or columnPrefix');
            }
        } catch (error) {
            console.error('Error loading config.json:', error);
            process.exit(1);
        }

        connection = await mysql.createConnection(config.mysqlSettings);
        const sql = sqlUtils(connection, config);
        
        const dataDir = path.join(__dirname, '..', 'data');
        try {
            await fs.access(dataDir);
        } catch {
            await fs.mkdir(dataDir, { recursive: true });
        }
        
        // Create search subdirectory
        const searchDir = path.join(dataDir, 'search');
        try {
            await fs.access(searchDir);
        } catch {
            await fs.mkdir(searchDir, { recursive: true });
            console.log('Created search directory');
        }
        
        const rootId = config.rootId ?? await sql.getRootAlbumId();
        console.log(`Using root album ID: ${rootId}`);

        const ignoreSet = buildIgnoreSet(config.ignoreAlbums);
        if (isBlacklisted(rootId, ignoreSet)) {
            console.log('Root album is blacklisted; skipping export.');
            return;
        }

        // Initialize search index accumulator
        const searchIndex = new Map<number, SearchIndexItem>();
        
        const thumbPrefix = config.thumbPrefix ?? 't__';
        const albumsWithImageDescendants = await computeAlbumsWithImageDescendants(rootId, sql, ignoreSet);
        await main(sql, rootId, [], [''], dataDir, searchIndex, thumbPrefix, ignoreSet, [], config, albumsWithImageDescendants);
        
        // Generate search index file
        try {
            const searchIndexArray = Array.from(searchIndex.values());
            const searchIndexData = {
                version: 1,
                generatedAt: new Date().toISOString(),
                itemCount: searchIndexArray.length,
                items: searchIndexArray
            };
            const searchIndexPath = path.join(searchDir, 'index.json');
            await fs.writeFile(searchIndexPath, JSON.stringify(searchIndexData, null, 2));
            console.log(`Generated search index with ${searchIndexArray.length} items`);
        } catch (error) {
            console.error('Error generating search index:', error);
            // Don't fail extraction if search index generation fails
        }
        
        // Generate index.json with root album metadata
        const rootAlbumInfo = await sql.getRootAlbumInfo(rootId);
        const indexData = {
            rootAlbumId: rootId,
            rootAlbumFile: `${rootId}.json`,
            siteName: rootAlbumInfo.title,
            siteDescription: rootAlbumInfo.description,
            generatedAt: new Date().toISOString(),
            metadata: {
                rootAlbumId: rootAlbumInfo.id,
                rootAlbumTitle: rootAlbumInfo.title,
                rootAlbumDescription: rootAlbumInfo.description,
                rootAlbumTimestamp: rootAlbumInfo.timestamp
            }
        };
        const indexPath = path.join(dataDir, 'index.json');
        await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
        console.log(`Generated index.json with root album reference`);
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
})();
