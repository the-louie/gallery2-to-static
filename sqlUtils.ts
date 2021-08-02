import type mysql from 'mysql2'
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

WHERE
    e.${config.cp}entityType in ('GalleryAlbumItem', 'GalleryPhotoItem') AND
    ${config.cp}parentId = ?`

export interface Children {
    id: number;
    type: string;
    hasChildren: boolean;
    title: string;
    description: string;
    pathComponent: string;
    timestamp: number;
    width: number | null;
    height: number | null;
    thumb_width: number | null;
    thumb_height: number | null;
}


export default (connection: mysql.Connection) => ({
    getChildren: (itemId: number): Promise<Array<Children>> => new Promise((resolve, reject) => {
       connection.query(SQL_GET_CHILDREN, [itemId], (error, results) => {
           if (error) return reject(error);
           resolve(results as Array<Children>)
       })
    })
})