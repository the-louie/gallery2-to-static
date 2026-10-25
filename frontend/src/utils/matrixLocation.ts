/**
 * What the Matrix frame (classic theme, THEME-01) shows around a page: the album the URL points at
 * and, on a photo URL, the photo. Resolved from the pathname alone, so the frame does not depend on
 * the page component; album files come from dataLoader's cache, so the page's own load is not
 * repeated over the network.
 */
import type { AlbumFile, Child } from '@/types';
import { loadAlbum, resolvePathToAlbumId } from '@/utils/dataLoader';
import { getPhotoSlug } from '@/utils/albumPath';

export interface MatrixLocation {
  album: AlbumFile;
  /** The photo on a photo URL, else null */
  photo: Child | null;
}

const ID_ALBUM_RE = /^\/album\/(\d+)\/?$/;
const ID_PHOTO_RE = /^\/album\/(\d+)\/image\/(\d+)\/?$/;
const PATH_PHOTO_ID_RE = /^(.*)\/image\/(\d+)\/?$/;

async function albumWithPhoto(albumId: number, match: (c: Child) => boolean): Promise<MatrixLocation | null> {
  const album = await loadAlbum(albumId);
  const photo = album.children.find((c) => c.type !== 'GalleryAlbumItem' && match(c));
  return photo ? { album, photo } : null;
}

/**
 * The album (and photo) at `pathname`, or null for pages that are not an album or photo
 * (search, not-found) and for unknown paths. Rejects only when an album file cannot be loaded.
 */
export async function loadMatrixLocation(pathname: string): Promise<MatrixLocation | null> {
  let path: string;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const idPhoto = path.match(ID_PHOTO_RE);
  if (idPhoto) return albumWithPhoto(Number(idPhoto[1]), (c) => c.id === Number(idPhoto[2]));
  const idAlbum = path.match(ID_ALBUM_RE);
  if (idAlbum) return { album: await loadAlbum(Number(idAlbum[1])), photo: null };

  const albumId = await resolvePathToAlbumId(path);
  if (albumId !== null) return { album: await loadAlbum(albumId), photo: null };
  if (path.endsWith('/')) return null;

  const pathPhotoId = path.match(PATH_PHOTO_ID_RE);
  if (pathPhotoId) {
    const parentId = await resolvePathToAlbumId(pathPhotoId[1] || '/');
    return parentId === null ? null : albumWithPhoto(parentId, (c) => c.id === Number(pathPhotoId[2]));
  }
  const cut = path.lastIndexOf('/');
  const parentId = await resolvePathToAlbumId(cut <= 0 ? '/' : path.slice(0, cut));
  if (parentId === null) return null;
  const slug = path.slice(cut + 1);
  return albumWithPhoto(parentId, (c) => getPhotoSlug(c) === slug);
}
