import * as fs from 'fs'
import mysql from 'mysql2'
import sqlUtils from './sqlUtils'
import config from './config.json'
import { Config } from './types'

const connection = mysql.createConnection(config.mysqlSettings);
const sql = sqlUtils(connection, config as Config)

const main = async (root: number, pathComponent: Array<string> = [], depth: number = 0) => {
    const children = await sql.getChildren(root);
    if (children.length > 0) {
        const recursivePromises: Promise<void>[] = [];
        children.forEach(child => {
            if (child.hasChildren) {
                recursivePromises.push(main(child.id, pathComponent.concat([child.pathComponent]), depth + 1));
            } else if (child.type === 'GalleryPhotoItem') {
                child.pathComponent = pathComponent.concat([child.pathComponent]).join('/');
            }
        });
        await Promise.all(recursivePromises);
        fs.writeFileSync(`../data/${root}.json`, JSON.stringify(children))
    }
}

(async () => {
    try {
        await main(7);
    } catch (error) {
        console.error('Error in main:', error);
        process.exit(1);
    } finally {
        connection.end();
    }
})();
