import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils'
import { Config, Child } from './types'

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

const main = async (sql: ReturnType<typeof sqlUtils>, root: number, pathComponent: Array<string> = [], dataDir: string, searchIndex: Map<number, SearchIndexItem>) => {
    const children = await sql.getChildren(root);
    if (children.length > 0) {
        const recursivePromises: Promise<void>[] = [];
        children.forEach((child) => {
            if (child.hasChildren && child.pathComponent) {
                recursivePromises.push(main(sql, child.id, pathComponent.concat([child.pathComponent]), dataDir, searchIndex));
            }
        });
        const processedChildren = children.map((child) => {
            if (child.type === 'GalleryPhotoItem' && child.pathComponent) {
                const fullPath = pathComponent.concat([child.pathComponent]).join('/');
                return { ...child, pathComponent: fullPath };
            }
            return child;
        });
        await Promise.all(recursivePromises);
        
        // Extract thumbnail info for albums from their first photo
        const processedChildrenWithThumbnails = await Promise.all(processedChildren.map(async (child) => {
            if (child.type === 'GalleryAlbumItem') {
                const albumChildren = await sql.getChildren(child.id);
                const firstPhoto = findFirstPhoto(albumChildren);
                if (firstPhoto) {
                    // Build full path for photo: current path + album path + photo filename
                    const photoPathComponent = firstPhoto.pathComponent && child.pathComponent
                        ? pathComponent.concat([child.pathComponent, firstPhoto.pathComponent]).join('/')
                        : firstPhoto.pathComponent;
                    const processedFirstPhoto = { ...firstPhoto, pathComponent: photoPathComponent };
                    const thumbnailInfo = extractThumbnailInfo(processedFirstPhoto);
                    return { ...child, ...thumbnailInfo };
                }
            }
            return child;
        }));
        
        // Add albums to search index (only albums, not photos)
        // Children of the current album have the current album as their parent
        for (const child of processedChildrenWithThumbnails) {
            // Only include albums in search index to reduce file size
            if (child.type === 'GalleryAlbumItem') {
                // Build search item with only non-empty fields to reduce file size
                const searchItem: SearchIndexItem = {
                    id: child.id,
                    type: 'GalleryAlbumItem',
                    title: child.title ?? '',
                    pathComponent: child.pathComponent ?? '',
                };
                
                // Only include description if it has a non-empty value
                if (child.description && child.description.trim().length > 0) {
                    searchItem.description = child.description;
                }
                
                // Always include parentId for navigation
                searchItem.parentId = root;
                
                // Include ancestors path (pathComponent array contains ancestor path components)
                // Root album is omitted (empty pathComponent array)
                if (pathComponent.length > 0) {
                    searchItem.ancestors = pathComponent.join('/');
                }
                
                searchIndex.set(child.id, searchItem);
            }
        }
        
        const filePath = path.join(dataDir, `${root}.json`);
        try {
            await fs.writeFile(filePath, JSON.stringify(processedChildrenWithThumbnails, null, 2));
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
            if (!config.mysqlSettings || !config.gallerySettings || !config.thumbPrefix) {
                throw new Error('Missing required config fields: mysqlSettings, gallerySettings, or thumbPrefix');
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
        
        await main(sql, rootId, [], dataDir, searchIndex);
        
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
