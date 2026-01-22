import * as fs from 'fs/promises'
import * as path from 'path'
import mysql from 'mysql2/promise'
import sqlUtils from './sqlUtils'
import { Config } from './types'

const main = async (sql: ReturnType<typeof sqlUtils>, root: number, pathComponent: Array<string> = [], dataDir: string) => {
    const children = await sql.getChildren(root);
    if (children.length > 0) {
        const recursivePromises: Promise<void>[] = [];
        children.forEach((child) => {
            if (child.hasChildren && child.pathComponent) {
                recursivePromises.push(main(sql, child.id, pathComponent.concat([child.pathComponent]), dataDir));
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
        
        const filePath = path.join(dataDir, `${root}.json`);
        try {
            await fs.writeFile(filePath, JSON.stringify(processedChildren, null, 2));
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
        
        const rootId = config.rootId ?? await sql.getRootAlbumId();
        console.log(`Using root album ID: ${rootId}`);
        await main(sql, rootId, [], dataDir);
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
})();
