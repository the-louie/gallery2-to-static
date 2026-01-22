import type mysql from 'mysql2/promise'
import type { Child, Config } from './types'

export default (connection: mysql.Connection, config: Config) => {
    const SQL_GET_CHILDREN = `
        SELECT
            ce.${config.gallerySettings.columnPrefix}id as id,    -- main id
            e.${config.gallerySettings.columnPrefix}entityType as type,
            i.${config.gallerySettings.columnPrefix}canContainChildren as hasChildren,

            i.${config.gallerySettings.columnPrefix}title as title,
            i.${config.gallerySettings.columnPrefix}description as description,

            fse.${config.gallerySettings.columnPrefix}pathComponent as pathComponent,
            i.${config.gallerySettings.columnPrefix}originationTimestamp as timestamp,

            pi.${config.gallerySettings.columnPrefix}width as width,
            pi.${config.gallerySettings.columnPrefix}height as height,

            di.${config.gallerySettings.columnPrefix}width as thumb_width,
            di.${config.gallerySettings.columnPrefix}height as thumb_height


        -- relations table
        FROM ${config.gallerySettings.tablePrefix}ChildEntity ce

        -- master table
        LEFT JOIN ${config.gallerySettings.tablePrefix}Entity e ON e.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id

        -- item information
        LEFT JOIN ${config.gallerySettings.tablePrefix}Item i ON i.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id

        -- file system information
        LEFT JOIN ${config.gallerySettings.tablePrefix}FileSystemEntity fse ON fse.${config.gallerySettings.columnPrefix}id = ce.${config.gallerySettings.columnPrefix}id

        -- photo-info
        LEFT JOIN ${config.gallerySettings.tablePrefix}PhotoItem pi ON pi.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id

        -- thumbinfo
        LEFT JOIN ${config.gallerySettings.tablePrefix}DerivativeImage di on di.${config.gallerySettings.columnPrefix}id = ce.${config.gallerySettings.columnPrefix}id

        WHERE
            e.${config.gallerySettings.columnPrefix}entityType in ('GalleryAlbumItem', 'GalleryPhotoItem') AND
            ce.${config.gallerySettings.columnPrefix}parentId = ?`
    
    const SQL_GET_ROOT_ALBUM = `
        SELECT
            ce.${config.gallerySettings.columnPrefix}id as id
        FROM ${config.gallerySettings.tablePrefix}ChildEntity ce
        LEFT JOIN ${config.gallerySettings.tablePrefix}Entity e ON e.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        WHERE
            e.${config.gallerySettings.columnPrefix}entityType = 'GalleryAlbumItem'
            AND ce.${config.gallerySettings.columnPrefix}parentId = 0
        ORDER BY ce.${config.gallerySettings.columnPrefix}id
        LIMIT 1`
    
    const SQL_GET_ROOT_ALBUM_INFO = `
        SELECT
            ce.${config.gallerySettings.columnPrefix}id as id,
            i.${config.gallerySettings.columnPrefix}title as title,
            i.${config.gallerySettings.columnPrefix}description as description,
            i.${config.gallerySettings.columnPrefix}originationTimestamp as timestamp
        FROM ${config.gallerySettings.tablePrefix}ChildEntity ce
        LEFT JOIN ${config.gallerySettings.tablePrefix}Entity e ON e.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        LEFT JOIN ${config.gallerySettings.tablePrefix}Item i ON i.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        WHERE
            ce.${config.gallerySettings.columnPrefix}id = ?`

    return {
        getChildren: async (itemId: number): Promise<Array<Child>> => {
            const [results] = await connection.execute(SQL_GET_CHILDREN, [itemId]);
            if (!Array.isArray(results)) {
                throw new Error('Unexpected query result format');
            }
            const children = results as Array<unknown>;
            return children.map((row: unknown) => {
                if (typeof row !== 'object' || row === null) {
                    throw new Error('Invalid row format in query results');
                }
                const child = row as Record<string, unknown>;
                if (typeof child.id !== 'number' || typeof child.type !== 'string') {
                    throw new Error('Missing required fields in query result row');
                }
                // Convert MySQL integer (0/1) to boolean
                if (typeof child.hasChildren !== 'number' && typeof child.hasChildren !== 'boolean') {
                    throw new Error('Invalid hasChildren field type in query result row');
                }
                const hasChildren = typeof child.hasChildren === 'number' ? child.hasChildren !== 0 : child.hasChildren;
                return { ...child, hasChildren } as unknown as Child;
            });
        },
        getRootAlbumId: async (): Promise<number> => {
            const [results] = await connection.execute(SQL_GET_ROOT_ALBUM);
            if (!Array.isArray(results) || results.length === 0) {
                throw new Error('No root album found. Please specify rootId in config.json');
            }
            const row = results[0] as { id: number };
            if (typeof row.id !== 'number') {
                throw new Error('Invalid root album ID format');
            }
            return row.id;
        },
        getRootAlbumInfo: async (rootId: number): Promise<{ id: number; title: string | null; description: string | null; timestamp: number | null }> => {
            const [results] = await connection.execute(SQL_GET_ROOT_ALBUM_INFO, [rootId]);
            if (!Array.isArray(results) || results.length === 0) {
                throw new Error('Root album not found');
            }
            const row = results[0] as { id: number; title: string | null; description: string | null; timestamp: number | null };
            if (typeof row.id !== 'number') {
                throw new Error('Invalid root album ID format');
            }
            return {
                id: row.id,
                title: row.title ?? null,
                description: row.description ?? null,
                timestamp: row.timestamp ?? null
            };
        }
    }
}
