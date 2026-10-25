import { Link, Navigate, useSearchParams } from 'react-router-dom';
import type { AlbumMetadata, Child } from '@/types';
import { useAlbumData } from '@/hooks/useAlbumData';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { getAlbumPath } from '@/utils/albumPath';
import { formatG2Date, jumpRange, MATRIX_PER_PAGE, pageHref, parsePage } from '@/utils/matrixPaging';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { MatrixThumbMatrix } from './MatrixThumbMatrix';
import './MatrixAlbum.css';

/**
 * Props for the MatrixAlbum component
 */
export interface MatrixAlbumProps {
  /** Album to show */
  albumId: number;
}

/**
 * Item count for "Size:": Gallery 2 showed the album's own items, plus "(N items total)" when its
 * subtree held more. We know photos per subtree (totalDescendantImageCount), not sub-albums, so the
 * total counts the photos below plus the album's own items.
 */
function getSize(metadata: AlbumMetadata, children: Child[]): { count: number; total: number } {
  const ownPhotos = children.filter((c) => c.type !== 'GalleryAlbumItem').length;
  const subtreePhotos = children.reduce((n, c) => n + (c.type === 'GalleryAlbumItem' ? (c.totalDescendantImageCount ?? 0) : 0), 0);
  const albums = children.length - ownPhotos;
  const total = metadata.totalDescendantImageCount != null && albums === 0
    ? metadata.totalDescendantImageCount
    : ownPhotos + albums + subtreePhotos;
  return { count: children.length, total };
}

/** Gallery 2's album navigator: first/previous on the left, next/last on the right (markup of 2006). */
function Navigator({ path, page, totalPages }: { path: string; page: number; totalPages: number }) {
  const hasPrevious = page > 1;
  const hasNext = page < totalPages;
  return (
    <div className="gbBlock gcBackground2 gbNavigator">
      <div className="block-core-Navigator">
        <div className={hasPrevious ? 'next-and-last' : 'next-and-last no-previous'}>
          {hasNext && (
            <>
              <Link to={pageHref(path, page + 1)} className="next">next</Link>
              <Link to={pageHref(path, totalPages)} className="last">last</Link>
            </>
          )}
        </div>
        <div className="first-and-previous">
          {hasPrevious && (
            <>
              <Link to={pageHref(path, 1)} className="first">first</Link>
              <Link to={pageHref(path, page - 1)} className="previous">previous</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Page: 1 2 3 4 5 6 ... 24": a gap of one page shows that page, a longer gap "...". */
function Pager({ path, page, totalPages }: { path: string; page: number; totalPages: number }) {
  const range = jumpRange(page, totalPages);
  const items: React.ReactNode[] = [];
  let last = 0;
  for (const p of range) {
    if (p - last >= 2) {
      items.push(
        <span key={`gap-${p}`}>{p - last === 2 ? <Link to={pageHref(path, p - 1)}>{p - 1}</Link> : '...'}</span>,
      );
    }
    items.push(
      <span key={p}>{p === page ? <span aria-current="page">{p}</span> : <Link to={pageHref(path, p)}>{p}</Link>}</span>,
    );
    last = p;
  }
  return (
    <div className="gsPages gbBlock gcBackground1">
      <nav className="block-core-Pager" aria-label="Pages">
        Page: {items}
      </nav>
    </div>
  );
}

/**
 * An album page in Gallery 2's Matrix theme (classic theme, THEME-01; spec
 * `frontend/docs/theme-matrix.md`): header block with title, description, Date / Owner / Size,
 * the navigator, the thumbnail matrix (12 per page, `?page=N`), the navigator again and the pager.
 * The navigator shows only with more than one page, as in Gallery 2.
 *
 * @example
 * ```tsx
 * <MatrixAlbum albumId={57207} />
 * ```
 */
export function MatrixAlbum({ albumId }: MatrixAlbumProps) {
  const [searchParams] = useSearchParams();
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
  const totalPages = Math.max(Math.ceil(children.length / MATRIX_PER_PAGE), 1);
  const page = parsePage(searchParams.get('page'));
  // Gallery 2 sent a page past the end to the last page
  if (page > totalPages) return <Navigate to={pageHref(path, totalPages)} replace />;

  const pageChildren = children.slice((page - 1) * MATRIX_PER_PAGE, page * MATRIX_PER_PAGE);
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
      {totalPages > 1 && <Navigator path={path} page={page} totalPages={totalPages} />}
      {children.length === 0 ? (
        <div className="gbBlock giDescription gbEmptyAlbum">
          <h3 className="emptyAlbum">This album is empty.</h3>
        </div>
      ) : (
        <MatrixThumbMatrix albumPath={path} items={pageChildren} />
      )}
      {totalPages > 1 && <Navigator path={path} page={page} totalPages={totalPages} />}
      <Pager path={path} page={page} totalPages={totalPages} />
    </div>
  );
}
