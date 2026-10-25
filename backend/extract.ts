/**
 * The extraction itself (TEST-03): walks the Gallery 2 tree through an `sql` object and writes the
 * JSON data tree. index.ts is the CLI around it (config, database connection, exit code); tests call
 * runExtraction() with a fake `sql`.
 */
import * as fs from 'fs/promises'
import * as path from 'path'
import sqlUtils from './sqlUtils.ts'
import type { Config, Child, AlbumFile, BreadcrumbItem, AlbumMetadata } from './types.ts'
import { cleanup_uipathcomponent } from './cleanupUipath.ts'
import { getSegmentForAlbum, appendSegment, addToPathIndex, findPathIndexProblems } from './pathSegments.ts'
import { settleSubtree, formatSubtreeFailures, type SubtreeFailure } from './subtreeFailures.ts'
import { generateThumbnail, readThumbnailSize } from './generateThumbnail.ts'
import { runStamp, prepareStagingDir, listStaleFiles, promoteStagingDir } from './outputDir.ts'
import { computeAllDescendantImageCounts } from './descendantImageCount.ts'
import { runVerification } from './verifyImagePaths.ts'
import { buildPathsFromPathComponent } from './pathResolution.ts'
import { decodeHtmlEntities } from '../shared/decodeHtmlEntities.ts'

/**
 * Build a Set of IDs to ignore from config.ignoreAlbums / config.ignoreItems.
 * Handles missing, null, non-array; normalizes strings/numbers to number; skips invalid entries.
 */
function buildIgnoreSet(raw: Array<string | number> | null | undefined, field = 'ignoreAlbums'): Set<number> {
    const arr = Array.isArray(raw) ? raw : [];
    const set = new Set<number>();
    for (const x of arr) {
        const n = typeof x === 'number' ? x : parseInt(String(x), 10);
        if (!Number.isFinite(n)) {
            console.warn(`${field}: invalid ID "${x}", skipping`);
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

        const paths = buildHighlightPathsFromResult(result, thumbPrefix);
        return paths?.urlPath ?? null;
    } catch (error) {
        console.warn(`Error resolving highlight image for album ${root}:`, error);
        return null;
    }
}

type FirstPhotoResult = { photo: Child; uipath: Array<string>; pathComponent: Array<string> };

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
 * Builds full-size and thumbnail URL paths from a findFirstPhotoRecursive result.
 * Uses pathComponent chain for direct disk path match.
 */
function buildHighlightPathsFromResult(
    result: FirstPhotoResult,
    thumbPrefix: string,
): { urlPath: string; thumbnailUrlPath: string } | null {
    const { photo, pathComponent: pathComponentChain } = result;
    if (!photo.pathComponent) return null;
    const fullChain = pathComponentChain.concat([photo.pathComponent]);
    return buildPathsFromPathComponent(fullChain, thumbPrefix);
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
    path?: string; // Path-based URL for this album (e.g. /albums/photos)
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
    pathIndex: Map<string, number>,
    /** This album's path, computed once by the parent (root: '/'), so index key and parent link agree. */
    ownPath: string,
    /** Every child link emitted into a parent's JSON: album id → path (for the post-run invariant check). */
    emittedChildPaths: Map<number, string>,
    /** Child album walks that failed; collected so one bad subtree doesn't crash the run (LOGIC-21). */
    failures: SubtreeFailure[],
    thumbnailContext: { albumsRoot: string; thumbnailsRoot: string; sem: ReturnType<typeof createSemaphore>; options: { maxWidth: number; maxHeight: number; quality: number }; skip: boolean; generatedCount: number; skippedCount: number; excludedCount: number } | null,
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

        // Build breadcrumbPath for current album with path-based URL
        const isRoot = breadcrumbAncestors.length === 0;
        const currentPath = isRoot ? '/' : ownPath;
        addToPathIndex(pathIndex, currentPath, root);

        const currentBreadcrumbItem: BreadcrumbItem = {
            id: root,
            title: isRoot ? 'Home' : (albumInfo.albumTitle ?? `Album ${root}`),
            path: currentPath,
        };
        const breadcrumbPath: BreadcrumbItem[] = isRoot
            ? [currentBreadcrumbItem]
            : breadcrumbAncestors.concat([currentBreadcrumbItem]);

        // Each child album's segment is computed once, here, in list order, and used both for the
        // child's own path-index key (passed down as ownPath) and for the link in this album's JSON.
        // Computing it twice (in the child and again here) disagreed for duplicate-named siblings.
        const usedForChildren = new Set<string>();
        const childPathByAlbumId = new Map<number, string>();
        for (const child of filtered) {
            if (child.type === 'GalleryAlbumItem') {
                const seg = getSegmentForAlbum(child.title, child.id, usedForChildren);
                childPathByAlbumId.set(child.id, appendSegment(currentPath, seg));
            }
        }
        const pathForChild = (id: number): string => {
            const p = childPathByAlbumId.get(id);
            if (p === undefined) throw new Error(`No path computed for child album ${id} of ${root}`);
            return p;
        };

        const recursivePromises: Promise<void>[] = [];
        filtered.forEach((child) => {
            if (child.hasChildren && child.pathComponent) {
                const title = cleanup_uipathcomponent(child.title ?? child.pathComponent ?? '');
                recursivePromises.push(settleSubtree(
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
                        pathIndex,
                        pathForChild(child.id),
                        emittedChildPaths,
                        failures,
                        thumbnailContext,
                    ),
                    child.id,
                    failures,
                ));
            }
        });
        const processedChildrenRaw = await Promise.all(
            filtered.map(async (child) => {
                if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                    const pathComponentChain = pathComponent.concat([child.pathComponent]);
                    const fullPath = pathComponentChain.join('/');
                    const { urlPath, thumbnailUrlPath: highlightThumbnailUrlPath } =
                        buildPathsFromPathComponent(pathComponentChain, thumbPrefix);

                    // Size of the generated thumbnail; null when there is none (or generation is skipped).
                    let thumbSize: { width: number; height: number } | null = null;
                    let thumbFailed = false;
                    if (thumbnailContext && !thumbnailContext.skip) {
                        const albumsRoot = thumbnailContext.albumsRoot;
                        const thumbnailsRoot = thumbnailContext.thumbnailsRoot;
                        const sourcePath = path.join(albumsRoot, fullPath);
                        const destPath = path.join(thumbnailsRoot, highlightThumbnailUrlPath);
                        await thumbnailContext.sem.acquire();
                        try {
                            const result = await generateThumbnail(sourcePath, destPath, thumbnailContext.options);
                            if (result === 'generated' || result === 'skipped') {
                                thumbSize = await readThumbnailSize(destPath);
                            }
                            if (result === 'missing') {
                                console.warn(`Missing source image: ${sourcePath}`);
                            } else if (result === 'invalid') {
                                // Keep the photo (title, description, full-size link); only its thumbnail is missing.
                                console.warn(`No thumbnail (source cannot be decoded), photo kept: ${sourcePath}`);
                                thumbnailContext.excludedCount++;
                                thumbFailed = true;
                            } else if (result === 'generated') {
                                thumbnailContext.generatedCount++;
                            } else if (result === 'skipped') {
                                thumbnailContext.skippedCount++;
                            }
                        } catch (err) {
                            console.warn(`Thumbnail generation failed for ${sourcePath}, photo kept:`, err instanceof Error ? err.message : String(err));
                            thumbnailContext.excludedCount++;
                            thumbFailed = true;
                        } finally {
                            thumbnailContext.sem.release();
                        }
                    }

                    return {
                        ...child,
                        thumb_width: thumbSize?.width ?? null,
                        thumb_height: thumbSize?.height ?? null,
                        ...(thumbFailed ? { thumbnailMissing: true } : {}),
                        pathComponent: fullPath,
                        urlPath,
                        thumbnailUrlPath: highlightThumbnailUrlPath,
                        highlightThumbnailUrlPath,
                    };
                }
                return child;
            }),
        );
        const processedChildren = processedChildrenRaw.filter((c): c is Child => c !== null);
        await Promise.all(recursivePromises);

        const processedChildrenWithThumbnails = await Promise.all(
            processedChildren.map(async (child) => {
                if (child.type === 'GalleryAlbumItem') {
                    const childPath = pathForChild(child.id);
                    emittedChildPaths.set(child.id, childPath);
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
                            const paths = buildHighlightPathsFromResult(highlightResult, thumbPrefix);
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
                        const pathComponentChain =
                            firstPhoto.pathComponent && child.pathComponent
                                ? pathComponent.concat([child.pathComponent, firstPhoto.pathComponent])
                                : firstPhoto.pathComponent
                                  ? [firstPhoto.pathComponent]
                                  : [];
                        const { thumbnailUrlPath } = buildPathsFromPathComponent(pathComponentChain, thumbPrefix);
                        return {
                            ...child,
                            path: childPath,
                            ...thumbnailInfo,
                            thumbnailUrlPath,
                            ...highlightSpread,
                            ...countSpread,
                        };
                    }
                    return { ...child, path: childPath, ...highlightSpread, ...countSpread };
                }
                if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                    return child;
                }
                return child;
            }),
        );

        for (const child of processedChildrenWithThumbnails) {
            if (child.type === 'GalleryAlbumItem') {
                const childPath = childPathByAlbumId.get(child.id);
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
                if (childPath != null) searchItem.path = childPath;
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
        const albumTitle = albumInfo.albumTitle ?? `Album ${root}`;
        const fullPath = uipath.slice(1).filter(Boolean).join('/') || (isRoot ? 'Home' : albumTitle);
        console.log(`Writing ${root}.json (${fullPath})`);
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

/** The query object runExtraction needs (sqlUtils' factory result; tests pass a fake). */
export type ExtractionSql = ReturnType<typeof sqlUtils>;

export interface ExtractionOptions {
    sql: ExtractionSql;
    config: Config;
    /** Project root: data/ is written here, albumsRoot/thumbnailsRoot are relative to it. */
    projectRoot: string;
    /** Run the image-path verification after extraction (default true). */
    verify?: boolean;
}

export interface ExtractionResult {
    /** false when a subtree failed or the path index check failed: data/ was left unchanged */
    ok: boolean;
    /** <projectRoot>/data */
    finalDataDir: string;
    /** where this run's output is (finalDataDir after a successful promotion) */
    dataDir: string;
}

export async function runExtraction(options: ExtractionOptions): Promise<ExtractionResult> {
    const { config, projectRoot } = options;
    // Single photos hidden by ID (config.ignoreItems): dropped from every child list, so they are
    // never written, counted, used as album thumbnails or put in the search index (SEC-18).
    const ignoreItems = buildIgnoreSet(config.ignoreItems, 'ignoreItems');
    const sql: ExtractionSql = ignoreItems.size === 0 ? options.sql : {
        ...options.sql,
        getChildren: async (id: number) => (await options.sql.getChildren(id)).filter((c) => !ignoreItems.has(c.id)),
    };
    let failed = false;
    // Output goes to a fresh staging directory; data/ is only replaced if the run succeeds (LOGIC-22).
    const finalDataDir = path.join(projectRoot, 'data');
    const stamp = runStamp();
    const dataDir = await prepareStagingDir(finalDataDir, stamp);
    const searchDir = path.join(dataDir, 'search');
    console.log(`Writing output to ${dataDir}`);

    const rootId = config.rootId ?? await sql.getRootAlbumId();
    console.log(`Using root album ID: ${rootId}`);

    const ignoreSet = buildIgnoreSet(config.ignoreAlbums);
    if (isBlacklisted(rootId, ignoreSet)) {
        console.log('Root album is blacklisted; skipping export.');
        return { ok: true, finalDataDir, dataDir };
    }

    // Initialize search index accumulator
    const searchIndex = new Map<number, SearchIndexItem>();

    const thumbPrefix = config.thumbPrefix ?? 't__';

    const albumsRoot = path.join(
        projectRoot,
        config.albumsRoot ?? 'frontend/public/g2data/albums',
    );
    const thumbnailsRoot = path.join(
        projectRoot,
        config.thumbnailsRoot ?? 'frontend/public/g2data/thumbnails',
    );
    const skipThumbnailGeneration = config.skipThumbnailGeneration === true;
    let thumbnailContext: {
        albumsRoot: string;
        thumbnailsRoot: string;
        sem: ReturnType<typeof createSemaphore>;
        options: { maxWidth: number; maxHeight: number; quality: number };
        skip: boolean;
        generatedCount: number;
        skippedCount: number;
        excludedCount: number;
    } | null = null;
    if (!skipThumbnailGeneration) {
        try {
            await fs.mkdir(thumbnailsRoot, { recursive: true });
            const concurrency = Math.max(1, config.thumbnailConcurrency ?? 5);
            thumbnailContext = {
                albumsRoot,
                thumbnailsRoot,
                sem: createSemaphore(concurrency),
                options: {
                    maxWidth: config.thumbnailMaxWidth ?? 400,
                    maxHeight: config.thumbnailMaxHeight ?? 400,
                    quality: config.thumbnailQuality ?? 80,
                },
                skip: false,
                generatedCount: 0,
                skippedCount: 0,
                excludedCount: 0,
            };
            console.log(`Thumbnail generation enabled: ${albumsRoot} -> ${thumbnailsRoot}`);
        } catch (err) {
            console.warn('Could not create thumbnails directory, skipping thumbnail generation:', err);
        }
    }

    console.log('Computing albums with image descendants...');
    const albumsWithImageDescendants = await computeAlbumsWithImageDescendants(rootId, sql, ignoreSet);
    console.log('Computing descendant image counts...');
    const descendantImageCounts = await computeAllDescendantImageCounts(
        rootId,
        (id) => sql.getChildren(id),
        ignoreSet,
        albumsWithImageDescendants,
    );
    const pathIndex = new Map<string, number>();
    const emittedChildPaths = new Map<number, string>();
    const failures: SubtreeFailure[] = [];
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
        pathIndex,
        '/',
        emittedChildPaths,
        failures,
        thumbnailContext,
    );

    if (thumbnailContext) {
        const parts = [`${thumbnailContext.generatedCount} generated`, `${thumbnailContext.skippedCount} skipped`];
        if (thumbnailContext.excludedCount > 0) {
            parts.push(`${thumbnailContext.excludedCount} failed (photo kept without thumbnail)`);
        }
        console.log(`Thumbnails: ${parts.join(', ')}`);
    }

    console.log('Generating search index...');
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

    const failureLines = formatSubtreeFailures(failures);
    if (failureLines.length > 0) {
        for (const line of failureLines) console.error(line);
        failed = true;
    }

    // Every emitted child link must resolve to its own album, and every album must have one path.
    const pathProblems = findPathIndexProblems(pathIndex, emittedChildPaths);
    if (pathProblems.length > 0) {
        console.error(`Path index check FAILED (${pathProblems.length}):`);
        for (const problem of pathProblems) console.error(`  - ${problem}`);
        failed = true;
    } else {
        console.log(`Path index check OK (${pathIndex.size} albums, ${emittedChildPaths.size} child links)`);
    }

    // Generate index.json with root album metadata and path index
    const rootAlbumInfo = await sql.getRootAlbumInfo(rootId);
    const pathIndexObj: Record<string, number> = {};
    pathIndex.forEach((albumId, pathKey) => {
        pathIndexObj[pathKey] = albumId;
    });
    const override = config.layoutHeaderDescriptionOverride;
    const rawDescription =
        typeof override === 'string' && override.trim().length > 0
            ? override.trim()
            : rootAlbumInfo.description;
    const siteDescription = decodeHtmlEntities(rawDescription ?? '');

    const indexData = {
        rootAlbumId: rootId,
        rootAlbumFile: `${rootId}.json`,
        siteName: rootAlbumInfo.title,
        siteDescription,
        generatedAt: new Date().toISOString(),
        pathIndex: pathIndexObj,
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

    if (options.verify !== false) try {
        console.log('Verifying image paths...');
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

    if (failed) {
        console.error(`Extraction had errors: ${finalDataDir} is unchanged; this run's output is in ${dataDir}`);
        return { ok: false, finalDataDir, dataDir };
    }
    const stale = await listStaleFiles(finalDataDir, dataDir);
    const previous = await promoteStagingDir(finalDataDir, dataDir, stamp);
    if (previous) console.log(`Previous output kept as ${previous}`);
    if (stale.length > 0) {
        console.warn(`${stale.length} file(s) from the previous output are not in this one (no longer published):`);
        for (const f of stale.slice(0, 50)) console.warn(`  - ${f}`);
        if (stale.length > 50) console.warn(`  ... and ${stale.length - 50} more (see ${previous})`);
    }
    console.log(`Extraction complete: ${finalDataDir}`);
    return { ok: true, finalDataDir, dataDir: finalDataDir };
}
