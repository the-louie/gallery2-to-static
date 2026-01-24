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
    /**
     * Order weight for sorting items within their parent album. Lower values appear first. Only present when item has explicit ordering configured in Gallery 2.
     */
    order?: number | null;
    /**
     * Legacy URL path for images (uipath-based dir + link filename). Present for photos when backend emits legacy paths.
     */
    urlPath?: string | null;
    /**
     * Thumbnail path component extracted from the first photo in the album.
     * Only present for albums (GalleryAlbumItem) that contain photos.
     */
    thumbnailPathComponent?: string | null;
    /**
     * Legacy URL path for album thumbnail (uipath-based dir + thumb filename). Present for albums with thumbnails when backend emits legacy paths.
     */
    thumbnailUrlPath?: string | null;
    /**
     * ID of the photo used as the album thumbnail.
     * Only present for albums (GalleryAlbumItem) that contain photos.
     */
    thumbnailPhotoId?: number | null;
    /**
     * Thumbnail width extracted from the first photo in the album.
     * Only present for albums (GalleryAlbumItem) that contain photos.
     */
    thumbnailWidth?: number | null;
    /**
     * Thumbnail height extracted from the first photo in the album.
     * Only present for albums (GalleryAlbumItem) that contain photos.
     */
    thumbnailHeight?: number | null;
    /**
     * Owner display name resolved from Item.ownerId → User (fullName or userName). Null when user missing or ownerId invalid.
     */
    ownerName?: string | null;
    /**
     * Item summary from Gallery 2 (distinct from description). Null when not set.
     */
    summary?: string | null;
}

/**
 * Breadcrumb item representing a single level in the navigation hierarchy
 */
export interface BreadcrumbItem {
    /** Unique identifier for the album */
    id: number;
    /** Display title for the breadcrumb (raw, not decoded) */
    title: string;
    /** URL path for navigation */
    path: string;
}

/**
 * Album metadata embedded in each album JSON file.
 * Matches the shape produced by getAlbumInfo and consumed by the frontend.
 */
export interface AlbumMetadata {
    albumId: number;
    albumTitle: string | null;
    albumDescription: string | null;
    albumTimestamp: number | null;
    ownerName: string | null;
    /** Breadcrumb path from root to this album */
    breadcrumbPath?: BreadcrumbItem[];
    /**
     * Highlight image URL for the album (from highlightId if present, or first image recursively).
     * Uses same URL format as photo urlPath (getLinkTarget, uipath-based directory).
     * Omitted when no image can be found.
     */
    highlightImageUrl?: string | null;
}

/**
 * Album JSON file structure: metadata for the album plus its children.
 */
export interface AlbumFile {
    metadata: AlbumMetadata;
    children: Child[];
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
    ignoreAlbums?: Array<string | number>;
    onlyAlbums?: Array<string>;
}
