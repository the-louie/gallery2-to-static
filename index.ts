import * as fs from 'fs'
import mysql from 'mysql2'
import * as path from 'path'
import sqlUtils from './sqlUtils'
import config from './config.json'

// import type { Children } from './sqlUtils'

// import type Children from './sqlUtils'

// interface config {
//     thumbPrefix: string;
//     ignoreAlbums: Array<string>;
//     onlyAlbums: Array<string>;
// }

// const config = {
//     thumbPrefix: '__t_',
//     ignoreAlbums: [],
//     onlyAlbums: [],
// }


const connection = mysql.createConnection(config.mysql_settings);
const sql = sqlUtils(connection)

/*
const fixDoubleExt = (filename: string): string => filename.toLocaleLowerCase().replace('.jpg.jpg', '.jpg')

const cleanupUiPathComponent = (uiPathComponent: string): string => {
    // FIXME: remove html, markup, illigal fs-chars and dedupe dashes
    return uiPathComponent.toLocaleLowerCase()
}

const decode = (text: string): string => Buffer.from(text).toString('ascii')

const getThumbTarget = (uiPath: string[], uiPathComponent: string, pathComponent='', fullPath=false) => {
    if (pathComponent !== undefined) {
        pathComponent = '___' + pathComponent
    }

    const fileName = fixDoubleExt(config.thumbPrefix + uiPathComponent + pathComponent)

    if (fullPath) {
        return (path.join(__dirname, 'test', uiPath.join('/').substring(1), fileName).toLocaleLowerCase())
    } else {
        return fileName
    }
}

const getLinkTarget =(uiPath: string[], uiPathComponent: string, pathComponent='', fullPath=false) => {
    let newPathComponent = ''
    if (pathComponent !== '' && uiPathComponent.toLocaleLowerCase() !== pathComponent.toLocaleLowerCase()) {
        newPathComponent = '___' + pathComponent
    }

    const fileName = fixDoubleExt(uiPathComponent + newPathComponent + '.jpg')

    if (fullPath) {
        return (path.join(__dirname, 'test', uiPath.join('/').substring(1), fileName))
    }


}
const generateJson = (filename: string, grandchildren: Array<Array<string>>, pathComponent: string[]) => {
    if (fs.existsSync(filename)) {
        console.log(` -- already done: ${filename}`)
        return
    }

    let result = { hasParent: (pathComponent !== undefined) }

    grandchildren.map(grandChild => {
        const childPath = grandChild[0].toLocaleLowerCase()
        const title = grandChild[1]

        if (grandChild[2] === 'GalleryAlbumItem') {
            return {
                link: childPath,
                img: `${childPath}/${config.thumbPrefix}album.jpg`,
                title: title
            }
        } else {
            return {
                link: getLinkTarget([''], title, childPath, false),
                img: getThumbTarget([''], title, childPath, false),
                title: title,
            }

        }
    })
}

const generateAlbum = async (itemId: number, fsPath: string[], uiPath: string[], depth: number, pathComponent: string[])  => {
    const grandChildren = await getGrandChildren(itemId, fsPath, uiPath, ++depth)
    const fName = path.join(__dirname, 'test', uiPath.join('/').substring(1), 'index.json')
    generateJson(fName, grandChildren, pathComponent)
}

const generateContent = (itemId, fsPath, uiPath, depth, pathComponent)  => {
    return true
}

const getGrandChildren = async (itemId, fsPath = [''], uiPath = [''], depth = 0) => {
    connection.connect();
    const grandChildren = await sql.getGrandChildren(itemId)

    let childObjects = []
    let firstImage = true

    for (const row of grandChildren) {
        const title = cleanupUiPathComponent(row.title ?? row.pathComponent)
        if (!(row.type === 'GalleryAlbumItem' && row.hasChildren) && !(row.type === 'GalleryPhotoItem')) {
            continue
        }

        const pathComponent = decode(row.pathComponent)

        if (row.type === 'GalleryAlbumItem' && row.hasChildren) {
            if (row.pathComponent in config.ignoreAlbums || row.title in config.ignoreAlbums) {
                console.log(`ignoring ${row.pathComponent} / ${row.title}`)
                continue
            } else if (config.onlyAlbums && !(row.pathComponent in config.onlyAlbums)) {
                console.log(`skipping ${row.pathComponent}, not in onlyAlbums`)
            }

            childObjects.push([title, title, row.type])
            fsPath.push(pathComponent)
            uiPath.push(title)

            generateAlbum(row.id, fsPath, uiPath, depth, pathComponent)
        } else if (row.type === 'GalleryPhotoItem') {
            if (generateContent(fsPath, uiPath, title, pathComponent, firstImage)) {
                childObjects.push([pathComponent, title, row.type])
                firstImage = false
            }
        }

    }
    connection.end();

}

const main = async () => {
    const fname = path.join(__dirname, 'test', 'index.json')
    const grandChildren = await getGrandChildren(7)
    generateJson(fname, grandChildren, '')
}


*/

const main = async (root: number, pathComponent: Array<string> = [], depth: number = 0) => {
    const children = await sql.getChildren(root);
    if (children.length > 0) {
        // console.log(root)
        fs.writeFileSync(`./data/${root}.json`, JSON.stringify(children))
        children.forEach(child => {
            if (child.hasChildren) {
                main(child.id, pathComponent.concat([child.pathComponent]), ++depth)
                --depth
            } else {
                console.log(depth, root, child.id, pathComponent.concat([child.pathComponent]).join('/'), 'no child')
                // child.filePath = pathComponent.concat([child.pathComponent]).join('/');
            }
        });
    }
}

main(7)