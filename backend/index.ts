import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils'
import { Config, Child } from './types'
import { cleanup_uipathcomponent } from './cleanupUipath'
import { getLinkTarget, getThumbTarget } from './legacyPaths'

/**
 * Finds the first photo (GalleryPhotoItem) in a children array.
 * @param children Array of child items (albums and photos)
 * @returns The first photo found, or null if no photos exist
 */
const findFirstPhoto = (children: Child[]): Child | null => {
    return children.find(child => child.type === 'GalleryPhotoItem') || null;
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
) => {
    const children = await sql.getChildren(root);
    if (children.length > 0) {
        const recursivePromises: Promise<void>[] = [];
        children.forEach((child) => {
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
                    ),
                );
            }
        });
        const processedChildren = children.map((child) => {
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
                        const albumTitle = cleanup_uipathcomponent(
                            child.title ?? child.pathComponent ?? '',
                        );
                        const albumUipath = uipath.concat([albumTitle]);
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
                        return { ...child, ...thumbnailInfo, thumbnailUrlPath };
                    }
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

        const filePath = path.join(dataDir, `${root}.json`);
        try {
            await fs.writeFile(
                filePath,
                JSON.stringify(processedChildrenWithThumbnails, null, 2),
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
        
        // Initialize search index accumulator
        const searchIndex = new Map<number, SearchIndexItem>();
        
        const thumbPrefix = config.thumbPrefix ?? 't__';
        await main(sql, rootId, [], [''], dataDir, searchIndex, thumbPrefix);
        
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
