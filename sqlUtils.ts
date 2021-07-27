import type mysql from '@types/mysql'
const config = {
    tp: 'g2_', // table prefix
    cp: 'g_',  // column prefix
}

const SQL_GET_CHILDREN = `
SELECT
    ce.${config.cp}id as id,    -- main id
    e.${config.cp}entityType as type,
    i.${config.cp}canContainChildren as hasChildren,

    i.${config.cp}title as title,
    i.${config.cp}description as description,

    fse.${config.cp}pathComponent as pathComponent,
    i.${config.cp}originationTimestamp as timestamp,

    pi.${config.cp}width as width,
    pi.${config.cp}height as height,

    di.${config.cp}width as thumb_width,
    di.${config.cp}height as thumb_height


-- relations table
FROM ${config.tp}ChildEntity ce

-- master table
LEFT JOIN ${config.tp}Entity e ON e.${config.cp}id=ce.${config.cp}id

-- item information
LEFT JOIN ${config.tp}Item i ON i.${config.cp}id=ce.${config.cp}id

-- file system information
LEFT JOIN ${config.tp}FileSystemEntity fse ON fse.${config.cp}id = ce.${config.cp}id

-- photo-info
LEFT JOIN ${config.tp}PhotoItem pi ON pi.${config.cp}id=ce.${config.cp}id

-- thumbinfo
LEFT JOIN ${config.tp}DerivativeImage di on di.${config.cp}id = ce.${config.cp}id

WHERE ${config.cp}parentId = %s`

interface grandChildren {
    id: number;
    type: string;
    hasChildren: boolean;
    title: string;
    description: string;
    pathComponent: string;
    timestamp: number;
    width: number;
    height: number;
    thumb_width: number;
    thumb_height: number;
}

export default (connection: mysql.Connection) => ({
    getGrandChildren: (itemId: number): Promise<Array<grandChildren>> => new Promise((resolve, reject) => {
       connection.query(SQL_GET_CHILDREN, [itemId], (error, results) => {
           if (error) return reject(error);
           resolve(results)
       })
    })
}