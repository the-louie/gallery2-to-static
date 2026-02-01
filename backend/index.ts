import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils'
import { Config, Child, AlbumFile, BreadcrumbItem, AlbumMetadata } from './types'
import { cleanup_uipathcomponent, normalizePathcomponentForFilename } from './cleanupUipath'
import { getLinkTarget, getThumbTarget } from './legacyPaths'
import { computeAllDescendantImageCounts } from './descendantImageCount'
import {
    runVerification,
    loadImageConfigForVerification,
    verifyImageUrl,
} from './verifyImagePaths'
import {
    loadFileList,
    buildFileIndex,
    resolveFuzzy,
    type FileIndex,
    type FuzzyStrategy,
} from './fuzzyMatch'

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

const ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS = 20;

/**
 * Truncates text to at most maxWords words; if longer, returns first maxWords words joined by space plus "...".
 * Caller must not pass null/undefined/empty (leave those unchanged).
 */
function truncateDescriptionToWords(text: string, maxWords: number): string {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    if (words.length <= maxWords) {
        return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
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
 */
async function resolveHighlightImageUrl(
    root: number,
    sql: ReturnType<typeof sqlUtils>,
    uipath: Array<string>,
    pathComponent: Array<string>,
    ignoreSet: Set<number>,
    thumbPrefix: string,
    resolveImagePath?: ResolveImagePathFn | null,
): Promise<string | null> {
    try {
        const result = await findFirstPhotoRecursive(
            root,
            sql,
            uipath,
            pathComponent,
            ignoreSet,
        );

        if (!result) return null;
        if (!result.photo.pathComponent) return null;

        const paths = await buildHighlightPathsFromResult(result, thumbPrefix, resolveImagePath);
        return paths?.urlPath ?? null;
    } catch (error) {
        console.warn(`Error resolving highlight image for album ${root}:`, error);
        return null;
    }
}

type FirstPhotoResult = { photo: Child; uipath: Array<string>; pathComponent: Array<string> };

export type ResolveImagePathFn = (
    dirSegments: string[],
    linkFilename: string,
    thumbFilename: string,
) => Promise<{ urlPath: string; thumbnailUrlPath: string }>;

function buildFullImageUrl(baseUrl: string, pathSegment: string): string {
    const p = (pathSegment || '').replace(/^\/+/, '');
    const base = baseUrl.replace(/\/+$/, '');
    return base && p ? `${base}/${p}` : '';
}

function createSemaphore(max: number): { acquire: () => Promise<void>; release: () => void } {
    let inFlight = 0;
    const queue: Array<() => void> = [];
    return {
        acquire: () =>
            new Promise<void>((resolve) => {
                if (inFlight < max) {
                    inFlight++;
                    resolve();
                } else {
                    queue.push(() => {
                        inFlight++;
                        resolve();
                    });
                }
            }),
        release: () => {
            inFlight--;
            const next = queue.shift();
            if (next) next();
        },
    };
}

/**
 * Creates resolveImagePath that uses naive path first, HTTP check, then fuzzy+HTTP fallback.
 * When baseUrl is null, returns naive paths only (no HTTP check, no fuzzy).
 * Limits concurrent HTTP checks to avoid overwhelming the server.
 */
function createResolveImagePath(
    fileIndex: FileIndex,
    strategy: FuzzyStrategy,
    thumbPrefix: string,
    baseUrl: string | null,
    timeoutMs: number,
    concurrency: number,
): ResolveImagePathFn {
    const sem = createSemaphore(concurrency);
    return async (
        dirSegments: string[],
        linkFilename: string,
        thumbFilename: string,
    ): Promise<{ urlPath: string; thumbnailUrlPath: string }> => {
        const dir = dirSegments.join('/');
        const naiveUrlPath = dir ? `${dir}/${linkFilename}` : linkFilename;
        const naiveThumbPath = dir ? `${dir}/${thumbFilename}` : thumbFilename;

        if (!baseUrl || !baseUrl.startsWith('http')) {
            return { urlPath: naiveUrlPath, thumbnailUrlPath: naiveThumbPath };
        }

        const naiveFullUrl = buildFullImageUrl(baseUrl, naiveUrlPath);
        if (naiveFullUrl) {
            await sem.acquire();
            try {
                const check = await verifyImageUrl(naiveFullUrl, timeoutMs);
                if (check.ok) {
                    return { urlPath: naiveUrlPath, thumbnailUrlPath: naiveThumbPath };
                }
            } finally {
                sem.release();
            }
        }

        const resolved = resolveFuzzy(
            { dirSegments, baseFilename: linkFilename },
            fileIndex,
            strategy,
        );
        if (resolved) {
            const lastSlash = resolved.lastIndexOf('/');
            const resolvedDir = lastSlash === -1 ? '' : resolved.slice(0, lastSlash);
            const resolvedFile = lastSlash === -1 ? resolved : resolved.slice(lastSlash + 1);
            const resolvedThumb = thumbPrefix + resolvedFile;
            const fuzzyUrlPath = resolved;
            const fuzzyThumbPath = resolvedDir ? `${resolvedDir}/${resolvedThumb}` : resolvedThumb;
            const fuzzyFullUrl = buildFullImageUrl(baseUrl, fuzzyUrlPath);
            if (fuzzyFullUrl) {
                await sem.acquire();
                try {
                    const check = await verifyImageUrl(fuzzyFullUrl, timeoutMs);
                    if (check.ok) {
                        return { urlPath: fuzzyUrlPath, thumbnailUrlPath: fuzzyThumbPath };
                    }
                } finally {
                    sem.release();
                }
            }
        }

        return { urlPath: naiveUrlPath, thumbnailUrlPath: naiveThumbPath };
    };
}

/**
 * Builds full-size and thumbnail URL paths from a findFirstPhotoRecursive result.
 * Uses resolveImagePath when available (naive→HTTP check→fuzzy→HTTP check).
 */
async function buildHighlightPathsFromResult(
    result: FirstPhotoResult,
    thumbPrefix: string,
    resolveImagePath?: ResolveImagePathFn | null,
): Promise<{ urlPath: string; thumbnailUrlPath: string } | null> {
    const { photo, uipath: photoUipath } = result;
    if (!photo.pathComponent) return null;
    const cleanedTitle = cleanup_uipathcomponent(photo.title ?? photo.pathComponent ?? '');
    const normalizedPath = normalizePathcomponentForFilename(photo.pathComponent);
    const dirSegments = photoUipath.slice(1);
    const linkFilename = getLinkTarget(cleanedTitle, normalizedPath);
    const thumbFilename = getThumbTarget(cleanedTitle, normalizedPath, thumbPrefix);
    if (resolveImagePath) {
        return resolveImagePath(dirSegments, linkFilename, thumbFilename);
    }
    const dir = dirSegments.join('/');
    return {
        urlPath: dir ? `${dir}/${linkFilename}` : linkFilename,
        thumbnailUrlPath: dir ? `${dir}/${thumbFilename}` : thumbFilename,
    };
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
    rootAlbumId: number,
    albumsWithImageDescendants: Set<number>,
    descendantImageCounts: Map<number, number>,
    resolveImagePath?: ResolveImagePathFn | null,
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
                        rootAlbumId,
                        albumsWithImageDescendants,
                        descendantImageCounts,
                        resolveImagePath,
                    ),
                );
            }
        });
        const processedChildren = await Promise.all(
            filtered.map(async (child) => {
                if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                    const fullPath = pathComponent.concat([child.pathComponent]).join('/');
                    const cleanedTitle = cleanup_uipathcomponent(child.title ?? child.pathComponent ?? '');
                    const normalizedPath = normalizePathcomponentForFilename(child.pathComponent);
                    const dirSegments = uipath.slice(1);
                    const linkFilename = getLinkTarget(cleanedTitle, normalizedPath);
                    const thumbFilename = getThumbTarget(cleanedTitle, normalizedPath, thumbPrefix);
                    let urlPath: string;
                    let highlightThumbnailUrlPath: string;
                    if (resolveImagePath) {
                        const resolved = await resolveImagePath(dirSegments, linkFilename, thumbFilename);
                        urlPath = resolved.urlPath;
                        highlightThumbnailUrlPath = resolved.thumbnailUrlPath;
                    } else {
                        const dir = dirSegments.join('/');
                        urlPath = dir ? `${dir}/${linkFilename}` : linkFilename;
                        highlightThumbnailUrlPath = dir ? `${dir}/${thumbFilename}` : thumbFilename;
                    }
                    return {
                        ...child,
                        pathComponent: fullPath,
                        urlPath,
                        highlightThumbnailUrlPath,
                    };
                }
                return child;
            }),
        );
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
                    let highlightImageUrl: string | null = null;
                    let highlightThumbnailUrlPath: string | null = null;
                    if (child.pathComponent) {
                        const highlightResult = await findFirstPhotoRecursive(
                            child.id,
                            sql,
                            albumUipath,
                            childPathComponent,
                            ignoreSet,
                        );
                        if (highlightResult) {
                            const paths = await buildHighlightPathsFromResult(
                                highlightResult,
                                thumbPrefix,
                                resolveImagePath,
                            );
                            if (paths) {
                                highlightImageUrl = paths.urlPath;
                                highlightThumbnailUrlPath = paths.thumbnailUrlPath;
                            }
                        }
                    }
                    const highlightSpread: { highlightImageUrl?: string; highlightThumbnailUrlPath?: string } = {};
                    if (highlightImageUrl !== null) highlightSpread.highlightImageUrl = highlightImageUrl;
                    if (highlightThumbnailUrlPath !== null) highlightSpread.highlightThumbnailUrlPath = highlightThumbnailUrlPath;
                    const totalCount = descendantImageCounts.get(child.id);
                    const countSpread =
                        totalCount !== undefined ? { totalDescendantImageCount: totalCount } : {};

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
                        const normalizedPath = normalizePathcomponentForFilename(firstPhoto.pathComponent ?? '');
                        const dirSegments = albumUipath.slice(1);
                        const linkFilename = getLinkTarget(cleanedTitle, normalizedPath);
                        const thumbFilename = getThumbTarget(
                            cleanedTitle,
                            normalizedPath,
                            thumbPrefix,
                        );
                        let thumbnailUrlPath: string;
                        if (resolveImagePath) {
                            const resolved = await resolveImagePath(
                                dirSegments,
                                linkFilename,
                                thumbFilename,
                            );
                            thumbnailUrlPath = resolved.thumbnailUrlPath;
                        } else {
                            const dir = dirSegments.join('/');
                            thumbnailUrlPath = dir ? `${dir}/${thumbFilename}` : thumbFilename;
                        }
                        return {
                            ...child,
                            ...thumbnailInfo,
                            thumbnailUrlPath,
                            ...highlightSpread,
                            ...countSpread,
                        };
                    }
                    return { ...child, ...highlightSpread, ...countSpread };
                }
                if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                    return child;
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

        const childrenForFile =
            root === rootAlbumId
                ? processedChildrenWithThumbnails.map((child) => {
                      if (
                          child.type === 'GalleryAlbumItem' &&
                          child.description != null &&
                          child.description.trim().length > 0
                      ) {
                          return {
                              ...child,
                              description: truncateDescriptionToWords(
                                  child.description,
                                  ROOT_ALBUM_CHILD_DESCRIPTION_MAX_WORDS,
                              ),
                          };
                      }
                      return child;
                  })
                : processedChildrenWithThumbnails;

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
            thumbPrefix,
            resolveImagePath,
        );

        if (highlightImageUrl !== null) {
            metadata.highlightImageUrl = highlightImageUrl;
        }
        // Total descendant image count for non-root albums (root omitted; frontend shows for non-root only).
        if (root !== rootAlbumId) {
            const count = descendantImageCounts.get(root);
            if (count !== undefined) {
                metadata.totalDescendantImageCount = count;
            }
        }

        const albumFile: AlbumFile = { metadata, children: childrenForFile };
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
        if (thumbPrefix === '__t_') {
            console.warn('thumbPrefix "__t_" does not match extract.py convention (t__); thumb URLs may 404.');
        }

        const projectRoot = path.join(__dirname, '..');
        let resolveImagePath: ResolveImagePathFn | null = null;
        const baseUrl = await loadImageConfigForVerification(projectRoot, config.imageConfigPath);
        const timeoutMs = config.verifyTimeoutMs ?? 10_000;
        const fileListPath = config.fileListPath ?? 'backend/all-lanbilder-files.txt';
        const fuzzyStrategyPath = config.fuzzyStrategyPath ?? 'fuzzy-match-strategy.json';
        const enableFuzzy = config.enableFuzzyMatch !== false;
        if (enableFuzzy && fileListPath && fuzzyStrategyPath) {
            try {
                const fileListFullPath = path.isAbsolute(fileListPath)
                    ? fileListPath
                    : path.join(projectRoot, fileListPath);
                const strategyFullPath = path.isAbsolute(fuzzyStrategyPath)
                    ? fuzzyStrategyPath
                    : path.join(projectRoot, fuzzyStrategyPath);
                const [fileListContent, strategyContent] = await Promise.all([
                    fs.readFile(fileListFullPath, 'utf-8'),
                    fs.readFile(strategyFullPath, 'utf-8'),
                ]);
                const entries = loadFileList(fileListContent);
                const fileIndex = buildFileIndex(entries);
                const strategy = JSON.parse(strategyContent) as FuzzyStrategy;
                if (
                    strategy &&
                    typeof strategy.type === 'string' &&
                    typeof strategy.algorithm === 'string'
                ) {
                    const concurrency = Math.max(1, config.verifyConcurrency ?? 5);
                    resolveImagePath = createResolveImagePath(
                        fileIndex,
                        strategy,
                        thumbPrefix,
                        baseUrl,
                        timeoutMs,
                        concurrency,
                    );
                    const mode = baseUrl ? 'HTTP-check (naive→fuzzy fallback)' : 'disabled (no baseUrl)';
                    console.log(`Fuzzy matching enabled: ${entries.length} files, strategy "${strategy.algorithm}", ${mode}`);
                }
            } catch (err) {
                console.warn(
                    'Fuzzy matching disabled (file list or strategy load failed):',
                    err instanceof Error ? err.message : String(err),
                );
            }
        }

        const albumsWithImageDescendants = await computeAlbumsWithImageDescendants(rootId, sql, ignoreSet);
        const descendantImageCounts = await computeAllDescendantImageCounts(
            rootId,
            (id) => sql.getChildren(id),
            ignoreSet,
            albumsWithImageDescendants,
        );
        await main(
            sql,
            rootId,
            [],
            [''],
            dataDir,
            searchIndex,
            thumbPrefix,
            ignoreSet,
            [],
            config,
            rootId,
            albumsWithImageDescendants,
            descendantImageCounts,
            resolveImagePath ?? undefined,
        );

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

        try {
            const verification = await runVerification(
                dataDir,
                projectRoot,
                {
                    verifyImagePaths: config.verifyImagePaths !== false,
                    imageConfigPath: config.imageConfigPath,
                    verifyTimeoutMs: config.verifyTimeoutMs,
                    verifyConcurrency: config.verifyConcurrency,
                },
            );
            if (verification) {
                console.log(`Verified ${verification.verifiedCount} image URLs; ${verification.deviationCount} deviations.`);
                if (verification.reportPath) {
                    console.log(`Deviation report: ${verification.reportPath}`);
                }
            }
        } catch (verificationError) {
            console.warn('Image path verification failed (extraction succeeded):', verificationError);
        }
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
})();
