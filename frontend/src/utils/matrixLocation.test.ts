import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadMatrixLocation } from './matrixLocation';
import { loadAlbum, resolvePathToAlbumId } from '@/utils/dataLoader';
import type { AlbumFile } from '@/types';

vi.mock('@/utils/dataLoader', () => ({ loadAlbum: vi.fn(), resolvePathToAlbumId: vi.fn() }));

const trails: Record<number, number[]> = { 7: [7], 10: [7, 10], 20: [7, 10, 20] };
const album = (id: number, children: Array<{ id: number; type?: string; pathComponent?: string }> = []) =>
  ({
    metadata: { albumId: id, albumTitle: `A${id}`, breadcrumbPath: (trails[id] ?? [id]).map((t) => ({ id: t, title: `A${t}`, path: '' })) },
    children: children.map((c) => ({ type: 'GalleryPhotoItem', title: null, ...c })),
  }) as unknown as AlbumFile;

const index: Record<string, number> = { '/': 7, '/dh': 10, '/dh/dhw05': 20 };
const albums: Record<number, AlbumFile> = {
  7: album(7),
  10: album(10, [{ id: 20, type: 'GalleryAlbumItem', pathComponent: 'dh/dhw05' }]),
  20: album(20, [{ id: 31, pathComponent: 'dh/dhw05/CIMG0053_.JPG' }, { id: 32, pathComponent: 'dh/dhw05/b.jpg' }]),
};

describe('loadMatrixLocation (THEME-01)', () => {
  beforeEach(() => {
    vi.mocked(resolvePathToAlbumId).mockImplementation(async (p) => index[p.replace(/(.)\/$/, '$1')] ?? null);
    vi.mocked(loadAlbum).mockImplementation(async (id) => {
      if (!albums[id]) throw new Error('404');
      return albums[id];
    });
  });

  it('an album URL gives the album, its parent and no photo', async () => {
    expect(await loadMatrixLocation('/dh/dhw05/')).toEqual({ album: albums[20], photo: null, parent: albums[10] });
    expect(await loadMatrixLocation('/')).toEqual({ album: albums[7], photo: null, parent: null });
  });

  it('a photo URL gives the album and the photo', async () => {
    const loc = await loadMatrixLocation('/dh/dhw05/cimg0053_');
    expect(loc?.album).toBe(albums[20]);
    expect(loc?.photo?.id).toBe(31);
    expect(loc?.parent).toBeNull();
  });

  it('the id forms work too', async () => {
    expect((await loadMatrixLocation('/album/20'))?.album).toBe(albums[20]);
    expect((await loadMatrixLocation('/album/20/image/32'))?.photo?.id).toBe(32);
    expect((await loadMatrixLocation('/dh/dhw05/image/32'))?.photo?.id).toBe(32);
  });

  it('a sub-album is not taken as a photo of its parent', async () => {
    vi.mocked(resolvePathToAlbumId).mockImplementation(async (p) => (p === '/dh' ? 10 : null));
    expect(await loadMatrixLocation('/dh/dhw05')).toBeNull();
  });

  it('null for pages that are not albums or photos, and for bad encodings', async () => {
    expect(await loadMatrixLocation('/search')).toBeNull();
    expect(await loadMatrixLocation('/dh/nope/')).toBeNull();
    expect(await loadMatrixLocation('/dh/dhw05/nope')).toBeNull();
    expect(await loadMatrixLocation('/dh/%ZZ')).toBeNull();
  });

  it('rejects when an album file cannot be loaded', async () => {
    await expect(loadMatrixLocation('/album/99')).rejects.toThrow('404');
  });
});
