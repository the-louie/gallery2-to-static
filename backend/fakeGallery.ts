/**
 * The fake Gallery 2 tree shared by the extraction, importer and generator tests (TEST-03, Sprint 15).
 */
import type { Child, Config } from './types.ts';
import type { ExtractionSql } from './extract.ts';

type Node = { id: number; type: 'GalleryAlbumItem' | 'GalleryPhotoItem'; title: string | null; pc: string; children?: Node[]; w?: number; h?: number };

const photo = (id: number, title: string, pc: string, w = 64, h = 48): Node => ({ id, type: 'GalleryPhotoItem', title, pc, w, h });
const album = (id: number, title: string | null, pc: string, children: Node[]): Node => ({ id, type: 'GalleryAlbumItem', title, pc, children });

export const TREE: Node = album(7, 'Lanbilder', '', [
    album(10, 'Dreamhack', 'dreamhack', [
        album(11, 'Lördag', 'lordag1', [photo(105, 'Secret', 'secret.jpg'), photo(101, 'A', 'a.jpg')]), // 105 in ignoreItems
        album(16, 'Only hidden', 'onlyhidden', [photo(106, 'Secret 2', 'secret2.jpg')]), // only an ignored photo
        album(12, 'Lördag', 'lordag2', [photo(102, 'B', 'b.jpg'), photo(107, 'Big', 'big.jpg', 1300, 900)]), // duplicate title; a photo above 1024px
        album(13, '', 'blank', [photo(103, 'Broken', 'bad.jpg')]), // blank title, truncated JPEG
        album(14, 'image', 'image', [album(15, '2005', '2005', [photo(104, 'Logo', 'c.png')])]), // LOGIC-28 shape
    ]),
    album(20, 'Empty', 'empty', []), // no image descendants: not exported
    album(30, 'Hidden', 'hidden', [photo(301, 'H', 'h.jpg')]), // in ignoreAlbums
]);

export function byId(n: Node, id: number): Node | null {
    if (n.id === id) return n;
    for (const c of n.children ?? []) {
        const f = byId(c, id);
        if (f) return f;
    }
    return null;
}

function toChild(n: Node): Child {
    return {
        id: n.id, type: n.type, hasChildren: (n.children?.length ?? 0) > 0, title: n.title, description: null,
        pathComponent: n.pc, timestamp: 1_130_000_000 + n.id, width: n.w ?? null, height: n.h ?? null, thumb_width: null, thumb_height: null,
        ownerName: null, summary: null,
    } as Child;
}

// Gallery 2's chosen highlights (PRIO-THEME-02): album -> photo + the albums in between
const HIGHLIGHTS: Record<number, { photoId: number; chain: number[] }> = {
    7: { photoId: 104, chain: [10, 14, 15] }, // root: c.png three levels down
    10: { photoId: 102, chain: [12] }, // Dreamhack: b.jpg in the second Lördag
    11: { photoId: 105, chain: [] }, // Lördag: the hidden photo -> falls back to a.jpg
    14: { photoId: 104, chain: [15] },
};
export const fakeSql = {
    getAlbumHighlight: async (id: number) => {
        const h = HIGHLIGHTS[id];
        if (!h) return null;
        return { photoId: h.photoId, chain: h.chain.map((a) => ({ id: a, pathComponent: byId(TREE, a)!.pc, title: byId(TREE, a)!.title })) };
    },
    getChildren: async (id: number) => (byId(TREE, id)?.children ?? []).map(toChild),
    getRootAlbumId: async () => 7,
    getRootAlbumInfo: async (id: number) => ({ id, title: 'Lanbilder', description: 'Bilder', timestamp: 1_130_000_000 }),
    getAlbumInfo: async (id: number) => {
        const n = byId(TREE, id)!;
        return { albumId: id, albumTitle: n.title, albumDescription: null, albumTimestamp: 1_130_000_000, ownerName: null };
    },
} as unknown as ExtractionSql;


/** The config the extraction test runs with (paths relative to a temp project root). */
export const TREE_CONFIG = {
    mysqlSettings: { host: 'x', user: 'x', database: 'x' },
    gallerySettings: { tablePrefix: 'g2_', columnPrefix: 'g_' },
    thumbPrefix: 't__', rootId: 7, ignoreAlbums: [30], ignoreItems: [105, '106'],
    albumsRoot: 'g2/albums', thumbnailsRoot: 'g2/thumbs', resizedRoot: 'g2/resized', verifyImagePaths: false,
} as Config;
