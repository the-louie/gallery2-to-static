import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseLegacyUrl, resolveLegacyUrl, resetLegacyDataForTests } from './legacyG2';
import { loadAlbum, loadPathIndex } from '@/utils/dataLoader';
import type { AlbumFile } from '@/types';

vi.mock('@/utils/dataLoader', () => ({ loadAlbum: vi.fn(), loadPathIndex: vi.fn() }));

const SID = 'g2_GALLERYSID=e8d44a6b40429d188546e01aa91bf344';
const BF = '/dreamhack/dreamhack_winter_05/battlefrag.com';
const legacy = {
  albums: { '': '/', dreamhack: '/dreamhack', 'dreamhack/dhw05': '/dreamhack/dreamhack_winter_05', 'dreamhack/dhw05/dhphotos': BF },
  photoAlbum: { '57215': 57207 },
};
const pathIndex = { '/': 7, '/dreamhack': 4352, '/dreamhack/dreamhack_winter_05': 23271, [BF]: 57207 };
const battlefrag = {
  metadata: { albumId: 57207, breadcrumbPath: [{ id: 7, title: 'Home', path: '/' }, { id: 57207, title: 'Battlefrag.com', path: BF }] },
  children: [{ id: 57215, type: 'GalleryPhotoItem', title: 'CIMG0053_.JPG', pathComponent: 'dreamhack/dhw05/dhphotos/CIMG0053_.JPG' }],
} as unknown as AlbumFile;

describe('parseLegacyUrl (URL-02)', () => {
  it('album URLs from the 2006 pages', () => {
    expect(parseLegacyUrl('/v/dreamhack/dhw05/dhphotos/', `?g2_page=2&${SID}`)).toEqual({ kind: 'album', g2Path: 'dreamhack/dhw05/dhphotos', page: 2 });
    expect(parseLegacyUrl('/v/dreamhack/dhw05/', '')).toEqual({ kind: 'album', g2Path: 'dreamhack/dhw05', page: 1 });
    expect(parseLegacyUrl('/v/', `?g2_highlightId=4352&${SID}`)).toEqual({ kind: 'album', g2Path: '', page: 1 });
    expect(parseLegacyUrl('/v', '')).toEqual({ kind: 'album', g2Path: '', page: 1 });
  });

  it('photo pages, percent-encoded names, main.php', () => {
    expect(parseLegacyUrl('/v/dreamhack/dhw05/dhphotos/CIMG0053_.JPG.html', `?${SID}`)).toEqual({ kind: 'photo', g2Path: 'dreamhack/dhw05/dhphotos', file: 'CIMG0053_.JPG' });
    expect(parseLegacyUrl('/v/a/Rhodos%20002.jpg.html', '')).toEqual({ kind: 'photo', g2Path: 'a', file: 'Rhodos 002.jpg' });
    expect(parseLegacyUrl('/main.php', `?g2_view=core.ShowItem&g2_itemId=57207&${SID}`)).toEqual({ kind: 'item', id: 57207, page: 1 });
    expect(parseLegacyUrl('/main.php', '?g2_itemId=57207&g2_page=3')).toEqual({ kind: 'item', id: 57207, page: 3 });
    expect(parseLegacyUrl('/main.php', '')).toEqual({ kind: 'album', g2Path: '', page: 1 });
  });

  it('rejects what is not an old URL', () => {
    expect(parseLegacyUrl('/dreamhack/', '')).toBeNull();
    expect(parseLegacyUrl('/vx/a', '')).toBeNull();
    expect(parseLegacyUrl('/main.php', '?g2_itemId=abc')).toBeNull();
    expect(parseLegacyUrl('/v/%E0%A4%A', '')).toBeNull();
  });
});

describe('resolveLegacyUrl (URL-02)', () => {
  beforeEach(() => {
    resetLegacyDataForTests();
    vi.mocked(loadPathIndex).mockResolvedValue(pathIndex);
    vi.mocked(loadAlbum).mockResolvedValue(battlefrag);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => legacy })));
  });

  it('albums, with the page and in any case', async () => {
    expect(await resolveLegacyUrl({ kind: 'album', g2Path: 'dreamhack/dhw05/dhphotos', page: 2 })).toBe(`${BF}/?page=2`);
    expect(await resolveLegacyUrl({ kind: 'album', g2Path: 'DreamHack/DHW05', page: 1 })).toBe('/dreamhack/dreamhack_winter_05/');
    expect(await resolveLegacyUrl({ kind: 'album', g2Path: '', page: 1 })).toBe('/');
    expect(await resolveLegacyUrl({ kind: 'album', g2Path: 'nope', page: 1 })).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('photos by file name', async () => {
    expect(await resolveLegacyUrl({ kind: 'photo', g2Path: 'dreamhack/dhw05/dhphotos', file: 'CIMG0053_.JPG' })).toBe(`${BF}/cimg0053_`);
    expect(await resolveLegacyUrl({ kind: 'photo', g2Path: 'nope', file: 'x.jpg' })).toBeNull();
  });

  it('items by id: an album, a photo (through its album), unknown', async () => {
    expect(await resolveLegacyUrl({ kind: 'item', id: 23271, page: 2 })).toBe('/dreamhack/dreamhack_winter_05/?page=2');
    expect(await resolveLegacyUrl({ kind: 'item', id: 57215, page: 1 })).toBe(`${BF}/cimg0053_`);
    expect(loadAlbum).toHaveBeenCalledWith(57207);
    expect(await resolveLegacyUrl({ kind: 'item', id: 1, page: 1 })).toBeNull();
  });

  it('rejects when legacy.json cannot be fetched, and fetches again next time', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500 })));
    await expect(resolveLegacyUrl({ kind: 'album', g2Path: '', page: 1 })).rejects.toThrow('HTTP 500');
    await expect(resolveLegacyUrl({ kind: 'album', g2Path: '', page: 1 })).rejects.toThrow();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
