import type mysql from 'mysql2/promise'
import type { Child, Config, AlbumMetadata } from './types.ts'
import { stripBBCode } from './bbcode.ts'
import { decodeHtmlEntities } from '../shared/decodeHtmlEntities.ts'
import { normalizeOwnerDisplayName, resolveOwnerName } from './ownerDisplayName.ts'
import {
    validateNullableString,
    validateRequiredString,
    validateNullableNumber,
    validateRequiredNumber,
    MAX_LENGTHS,
} from './validateRow.ts'

export default (connection: mysql.Connection, config: Config) => {
    const SQL_GET_CHILDREN = `
        SELECT
            ce.${config.gallerySettings.columnPrefix}id as id,    -- main id
            e.${config.gallerySettings.columnPrefix}entityType as type,
            i.${config.gallerySettings.columnPrefix}canContainChildren as hasChildren,

            i.${config.gallerySettings.columnPrefix}title as title,
            i.${config.gallerySettings.columnPrefix}description as description,
            i.${config.gallerySettings.columnPrefix}ownerId as ownerId,
            i.${config.gallerySettings.columnPrefix}summary as summary,
            u.${config.gallerySettings.columnPrefix}fullName as ownerFullName,
            u.${config.gallerySettings.columnPrefix}userName as ownerUserName,

            fse.${config.gallerySettings.columnPrefix}pathComponent as pathComponent,
            i.${config.gallerySettings.columnPrefix}originationTimestamp as timestamp,

            pi.${config.gallerySettings.columnPrefix}width as width,
            pi.${config.gallerySettings.columnPrefix}height as height,

            di.${config.gallerySettings.columnPrefix}width as thumb_width,
            di.${config.gallerySettings.columnPrefix}height as thumb_height,

            iam.${config.gallerySettings.columnPrefix}orderWeight as \`order\`

        -- relations table
        FROM ${config.gallerySettings.tablePrefix}ChildEntity ce

        -- master table
        LEFT JOIN ${config.gallerySettings.tablePrefix}Entity e ON e.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id

        -- item information
        LEFT JOIN ${config.gallerySettings.tablePrefix}Item i ON i.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        LEFT JOIN ${config.gallerySettings.tablePrefix}User u ON u.${config.gallerySettings.columnPrefix}id = i.${config.gallerySettings.columnPrefix}ownerId

        -- file system information
        LEFT JOIN ${config.gallerySettings.tablePrefix}FileSystemEntity fse ON fse.${config.gallerySettings.columnPrefix}id = ce.${config.gallerySettings.columnPrefix}id

        -- photo-info
        LEFT JOIN ${config.gallerySettings.tablePrefix}PhotoItem pi ON pi.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id

        -- thumbinfo
        LEFT JOIN ${config.gallerySettings.tablePrefix}DerivativeImage di on di.${config.gallerySettings.columnPrefix}id = ce.${config.gallerySettings.columnPrefix}id

        -- item attributes (order weight)
        LEFT JOIN ${config.gallerySettings.tablePrefix}ItemAttributesMap iam ON iam.${config.gallerySettings.columnPrefix}itemId = ce.${config.gallerySettings.columnPrefix}id

        WHERE
            e.${config.gallerySettings.columnPrefix}entityType in ('GalleryAlbumItem', 'GalleryPhotoItem') AND
            ce.${config.gallerySettings.columnPrefix}parentId = ?
        ORDER BY COALESCE(iam.${config.gallerySettings.columnPrefix}orderWeight, 999999) ASC, ce.${config.gallerySettings.columnPrefix}id ASC`

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

    const SQL_GET_ALBUM_INFO = `
        SELECT
            ce.${config.gallerySettings.columnPrefix}id as id,
            i.${config.gallerySettings.columnPrefix}title as title,
            i.${config.gallerySettings.columnPrefix}description as description,
            i.${config.gallerySettings.columnPrefix}originationTimestamp as timestamp,
            u.${config.gallerySettings.columnPrefix}fullName as ownerFullName,
            u.${config.gallerySettings.columnPrefix}userName as ownerUserName
        FROM ${config.gallerySettings.tablePrefix}ChildEntity ce
        LEFT JOIN ${config.gallerySettings.tablePrefix}Entity e ON e.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        LEFT JOIN ${config.gallerySettings.tablePrefix}Item i ON i.${config.gallerySettings.columnPrefix}id=ce.${config.gallerySettings.columnPrefix}id
        LEFT JOIN ${config.gallerySettings.tablePrefix}User u ON u.${config.gallerySettings.columnPrefix}id = i.${config.gallerySettings.columnPrefix}ownerId
        WHERE
            ce.${config.gallerySettings.columnPrefix}id = ?`

    return {
        getChildren: async (itemId: number): Promise<Array<Child>> => {
            const [results] = await connection.execute(SQL_GET_CHILDREN, [itemId]);
            if (!Array.isArray(results)) {
                throw new Error('Unexpected query result format');
            }
            const children = results as Array<unknown>;
            return children.map((row: unknown, index: number) => {
                if (typeof row !== 'object' || row === null) {
                    throw new Error('Invalid row format in query results');
                }
                const child = row as Record<string, unknown>;
                const rowContext = `album ${itemId}, child index ${index}`;

                // Required fields - throw on failure
                const id = validateRequiredNumber(child.id, 'id', rowContext);
                const type = validateRequiredString(child.type, 'type', 255, rowContext);

                // Validate type is a known entity type
                if (type !== 'GalleryAlbumItem' && type !== 'GalleryPhotoItem') {
                    throw new Error(`[${rowContext}] Unknown entity type: '${type}'`);
                }

                // Boolean from MySQL integer
                if (typeof child.hasChildren !== 'number' && typeof child.hasChildren !== 'boolean' && child.hasChildren != null) {
                    throw new Error(`[${rowContext}] Invalid hasChildren field type: ${typeof child.hasChildren}`);
                }
                const hasChildren = child.hasChildren == null
                    ? false
                    : typeof child.hasChildren === 'number'
                        ? child.hasChildren !== 0
                        : Boolean(child.hasChildren);

                // Nullable string fields with length limits
                const rawTitle = validateNullableString(child.title, 'title', MAX_LENGTHS.title, rowContext);
                const title = rawTitle != null ? stripBBCode(decodeHtmlEntities(rawTitle)) : null;
                const description = validateNullableString(child.description, 'description', MAX_LENGTHS.description, rowContext);
                const decodedDescription = description != null ? decodeHtmlEntities(description) : null;
                const summary = validateNullableString(child.summary, 'summary', MAX_LENGTHS.summary, rowContext);
                const decodedSummary = summary != null ? decodeHtmlEntities(summary) : null;
                const pathComponent = validateNullableString(child.pathComponent, 'pathComponent', MAX_LENGTHS.pathComponent, rowContext);

                // Owner name
                const ownerFullName = validateNullableString(child.ownerFullName, 'ownerFullName', MAX_LENGTHS.ownerName, rowContext);
                const ownerUserName = validateNullableString(child.ownerUserName, 'ownerUserName', MAX_LENGTHS.ownerName, rowContext);
                const ownerName = normalizeOwnerDisplayName(resolveOwnerName(ownerFullName, ownerUserName));

                // Nullable number fields
                const timestamp = validateNullableNumber(child.timestamp, 'timestamp', rowContext);
                const width = validateNullableNumber(child.width, 'width', rowContext);
                const height = validateNullableNumber(child.height, 'height', rowContext);
                const thumb_width = validateNullableNumber(child.thumb_width, 'thumb_width', rowContext);
                const thumb_height = validateNullableNumber(child.thumb_height, 'thumb_height', rowContext);
                const order = validateNullableNumber(child.order, 'order', rowContext);

                const result: Child = {
                    id,
                    type,
                    hasChildren,
                    title,
                    description: decodedDescription,
                    pathComponent,
                    timestamp,
                    width,
                    height,
                    thumb_width,
                    thumb_height,
                    ownerName,
                    summary: decodedSummary,
                };

                // Only include order if present (optional field)
                if (order != null) {
                    result.order = order;
                }

                return result;
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
            const row = results[0] as Record<string, unknown>;
            const rowContext = `root album ${rootId}`;

            const id = validateRequiredNumber(row.id, 'id', rowContext);
            const rawTitle = validateNullableString(row.title, 'title', MAX_LENGTHS.title, rowContext);
            const rawDescription = validateNullableString(row.description, 'description', MAX_LENGTHS.description, rowContext);
            const timestamp = validateNullableNumber(row.timestamp, 'timestamp', rowContext);

            return {
                id,
                title: rawTitle != null ? stripBBCode(decodeHtmlEntities(rawTitle)) : null,
                description: rawDescription != null ? decodeHtmlEntities(rawDescription) : null,
                timestamp,
            };
        },
        getAlbumInfo: async (albumId: number): Promise<AlbumMetadata> => {
            const [results] = await connection.execute(SQL_GET_ALBUM_INFO, [albumId]);
            if (!Array.isArray(results) || results.length === 0) {
                throw new Error(`Album ${albumId} not found`);
            }
            const row = results[0] as Record<string, unknown>;
            const rowContext = `album info ${albumId}`;

            const id = validateRequiredNumber(row.id, 'id', rowContext);
            const rawTitle = validateNullableString(row.title, 'title', MAX_LENGTHS.title, rowContext);
            const rawDescription = validateNullableString(row.description, 'description', MAX_LENGTHS.description, rowContext);
            const timestamp = validateNullableNumber(row.timestamp, 'timestamp', rowContext);
            const ownerFullName = validateNullableString(row.ownerFullName, 'ownerFullName', MAX_LENGTHS.ownerName, rowContext);
            const ownerUserName = validateNullableString(row.ownerUserName, 'ownerUserName', MAX_LENGTHS.ownerName, rowContext);

            return {
                albumId: id,
                albumTitle: rawTitle != null ? stripBBCode(decodeHtmlEntities(rawTitle)) : null,
                albumDescription: rawDescription != null ? decodeHtmlEntities(rawDescription) : null,
                albumTimestamp: timestamp,
                ownerName: normalizeOwnerDisplayName(resolveOwnerName(ownerFullName, ownerUserName)),
            };
        }
    }
}
