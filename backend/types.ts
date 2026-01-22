export interface Child {
    id: number;
    type: string;
    hasChildren: boolean;
    title: string | null;
    description: string | null;
    pathComponent: string | null;
    timestamp: number | null;
    width: number | null;
    height: number | null;
    thumb_width: number | null;
    thumb_height: number | null;
}

interface MysqlSettings {
    host: string;
    user: string;
    password?: string;
    database: string;
}

interface GallerySettings {
    tablePrefix: string;
    columnPrefix: string;
}

export interface Config {
    mysqlSettings: MysqlSettings;
    gallerySettings: GallerySettings;
    thumbPrefix: string;
    rootId?: number;
    ignoreAlbums?: Array<string>;
    onlyAlbums?: Array<string>;
}
