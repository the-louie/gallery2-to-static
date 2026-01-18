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
        children.forEach(child => {
            if (child.hasChildren) {
                main(child.id, pathComponent.concat([child.pathComponent]), ++depth)
                --depth
            } else if (child.type === 'GalleryPhotoItem') {
                child.pathComponent = pathComponent.concat([child.pathComponent]).join('/');
            }
        });
        fs.writeFileSync(`./data/${root}.json`, JSON.stringify(children))
    }
}

main(7)
