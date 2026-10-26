import { Link } from 'react-router-dom';
import type { Album, Child } from '@/types';
import { getItemPath, withTrailingSlash } from '@/utils/albumPath';
import { getAlbumThumbnailUrl } from '@/utils/imageUrl';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { formatG2Date } from '@/utils/matrixPaging';
import { truncateTitle } from '@/utils/matrixPeers';
import { useSubalbumsMap } from '@/hooks/useSubalbumsMap';

/**
 * Props for the MatrixAlbumList component
 */
export interface MatrixAlbumListProps {
  /** Path of the album the items are in (ends with /) */
  albumPath: string;
  /** All items of the album (no paging) */
  items: Child[];
}

/** One row: the 2013 root page's `giAlbumCell` thumbnail, the info cell, the `td.tree` sub-album list. */
function AlbumRow({ item, albumPath, subalbums }: { item: Child; albumPath: string; subalbums: Album[] | undefined }) {
  const isAlbum = item.type === 'GalleryAlbumItem';
  const href = getItemPath(item, albumPath);
  const src = isAlbum ? getAlbumThumbnailUrl(item as Album) : null;
  const total = item.totalDescendantCount ?? item.totalDescendantImageCount ?? 0;
  const count = item.childCount ?? 0;
  const summary = item.summary?.trim();
  return (
    <tr>
      <td className={isAlbum ? 'giAlbumCell gcBackground1' : 'giItemCell'}>
        <div>
          {src ? (
            <Link to={href}>
              <img src={src} width={150} height={150} className="giThumbnail" alt={item.title ?? ''} loading="lazy" decoding="async" />
            </Link>
          ) : (
            <Link to={href} className="giMissingThumbnail">
              no thumbnail
            </Link>
          )}
        </div>
      </td>
      <td>
        {item.title && (
          <p className="giTitle">
            {isAlbum ? 'Album: ' : ''}
            <Link to={href}>{item.title}</Link>
          </p>
        )}
        {summary && <p className="giDescription">{parseBBCodeDecoded(truncateTitle(summary, 256))}</p>}
        <div className="block-core-ItemInfo giInfo">
          {item.timestamp != null && <span className="date summary">Date: {formatG2Date(item.timestamp)}</span>}
          {isAlbum && count > 0 && (
            <span className="size summary">
              Size: {count} {count === 1 ? 'item' : 'items'}
              {total > count && ` (${total} items total)`}
            </span>
          )}
          {(item.viewCount ?? 0) > 0 && <span className="viewCount summary">Views: {item.viewCount}</span>}
        </div>
      </td>
      <td className="tree">
        {subalbums && subalbums.length > 0 && (
          <>
            <h4> Subalbums: </h4>
            <ul>
              {subalbums.map((sub) => (
                <li key={sub.id}>
                  <Link to={withTrailingSlash(sub.path ?? getItemPath(sub, href))}>{sub.title?.trim() || sub.pathComponent}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </td>
    </tr>
  );
}

/**
 * The root album as lanbilder.se showed it in 2013 (classic-list theme, QA-09): Gallery 2's
 * **Classic** theme `album.tpl` with `columns = 1` and `showSubalbums` — one table row per album
 * with the thumbnail cell, a cell with "Album: title", summary and Date / Size / Views, and a `tree`
 * cell listing the album's sub-albums — and every album on one page, so no navigator or pager.
 * Sub-album lists come from each album's own data file (`useSubalbumsMap`), in the album's order.
 *
 * @example
 * ```tsx
 * <MatrixAlbumList albumPath="/" items={children} />
 * ```
 */
export function MatrixAlbumList({ albumPath, items }: MatrixAlbumListProps) {
  const albumIds = items.filter((c) => c.type === 'GalleryAlbumItem' && c.hasChildren !== false).map((c) => c.id);
  const { subalbumsMap } = useSubalbumsMap(albumIds);
  return (
    <div className="gbBlock">
      <table className="gsThumbMatrix gsAlbumList">
        <tbody>
          {items.map((item) => (
            <AlbumRow key={item.id} item={item} albumPath={albumPath} subalbums={subalbumsMap.get(item.id)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
