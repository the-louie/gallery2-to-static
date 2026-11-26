import type { AlbumMetadata, Child } from '@/types';
import { useAlbumData } from '@/hooks/useAlbumData';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { getAlbumPath } from '@/utils/albumPath';
import { formatG2Date } from '@/utils/matrixPaging';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MatrixThumbMatrix } from './MatrixThumbMatrix';
import { MatrixAlbumList } from './MatrixAlbumList';
import './MatrixAlbum.css';

/**
 * Props for the MatrixAlbum component
 */
export interface MatrixAlbumProps {
  /** Album to show */
  albumId: number;
  /** The 2013 list layout (the root album, QA-09 / THEME-02): every item on one page, one row per item, sub-albums listed */
  list?: boolean;
}

/**
 * Item count for "Size:": Gallery 2 showed the album's own items, plus "(N items total)" when its
 * subtree held more. The export carries that total (totalDescendantCount: photos and albums below);
 * older data has only the photo count, so the total is then the photos below plus the own items.
 */
function getSize(metadata: AlbumMetadata, children: Child[]): { count: number; total: number } {
  if (metadata.totalDescendantCount != null) return { count: children.length, total: metadata.totalDescendantCount };
  const ownPhotos = children.filter((c) => c.type !== 'GalleryAlbumItem').length;
  const subtreePhotos = children.reduce((n, c) => n + (c.type === 'GalleryAlbumItem' ? (c.totalDescendantImageCount ?? 0) : 0), 0);
  const albums = children.length - ownPhotos;
  const total = metadata.totalDescendantImageCount != null && albums === 0
    ? metadata.totalDescendantImageCount
    : ownPhotos + albums + subtreePhotos;
  return { count: children.length, total };
}

/**
 * An album page in the classic (Matrix) theme (THEME-01; spec `frontend/docs/theme-matrix.md`):
 * header block with title, description, Date / Owner / Size, then the thumbnails. Since GRID-01
 * (operator 2026-11-26) all items are on one page in a width-driven grid (no pager; thumbnails are
 * lazy-loaded). With `list` (the root album in the classic theme) the items are the 2013
 * one-row-per-album list instead.
 *
 * @example
 * ```tsx
 * <MatrixAlbum albumId={57207} />
 * ```
 */
export function MatrixAlbum({ albumId, list = false }: MatrixAlbumProps) {
  const { data: children, metadata, isLoading, error, refetch } = useAlbumData(albumId);

  if (error) {
    return (
      <div className="gbBlock giError" role="alert">
        <p>Could not load this album: {error.message}</p>
        <button type="button" onClick={refetch}>Retry</button>
      </div>
    );
  }
  if (isLoading || !metadata || !children || metadata.albumId !== albumId) {
    return (
      <div className="gbBlock" role="status" aria-label="Loading album">
        <LoadingSpinner />
      </div>
    );
  }

  const path = getAlbumPath(metadata.breadcrumbPath ?? []);
  const size = getSize(metadata, children);
  const description = metadata.albumDescription?.trim();

  return (
    <div className="g2-matrix-album">
      <div className="gbBlock gcBackground1">
        <table className="gbHeader">
          <tbody>
            <tr>
              <td>
                {metadata.albumTitle && <h2> {metadata.albumTitle} </h2>}
                {description && <p className="giDescription">{parseBBCodeDecoded(description)}</p>}
              </td>
              <td className="gbHeaderInfo">
                <div className="block-core-ItemInfo giInfo">
                  {metadata.albumTimestamp != null && (
                    <span className="date summary">Date: {formatG2Date(metadata.albumTimestamp)}</span>
                  )}
                  {metadata.ownerName && <span className="owner summary">Owner: {metadata.ownerName}</span>}
                  {size.count > 0 && (
                    <span className="size summary">
                      Size: {size.count} {size.count === 1 ? 'item' : 'items'}
                      {size.total > size.count && ` (${size.total} items total)`}
                    </span>
                  )}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {children.length === 0 ? (
        <div className="gbBlock giDescription gbEmptyAlbum">
          <h3 className="emptyAlbum">This album is empty.</h3>
        </div>
      ) : list ? (
        <MatrixAlbumList albumPath={path} items={children} />
      ) : (
        <MatrixThumbMatrix albumPath={path} items={children} />
      )}
    </div>
  );
}
