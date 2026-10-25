import { Link } from 'react-router-dom';
import type { Album, Child, Image } from '@/types';
import { getItemPath } from '@/utils/albumPath';
import { getAlbumThumbnailUrl, getImageUrl } from '@/utils/imageUrl';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { formatG2Date, MATRIX_COLUMNS } from '@/utils/matrixPaging';
import { truncateTitle } from '@/utils/matrixPeers';

/**
 * Props for the MatrixThumbMatrix component
 */
export interface MatrixThumbMatrixProps {
  /** Path of the album the items are in (ends with /) */
  albumPath: string;
  /** The items of this page */
  items: Child[];
}

function thumbnailUrl(item: Child): string | null {
  if (item.type === 'GalleryAlbumItem') return getAlbumThumbnailUrl(item as Album);
  return item.thumbnailMissing ? null : getImageUrl(item as Image, true);
}

/** One cell: thumbnail, title, album summary, Date / Size / Views (Gallery 2.0 ItemInfo). */
function ItemCell({ item, albumPath }: { item: Child; albumPath: string }) {
  const isAlbum = item.type === 'GalleryAlbumItem';
  const href = getItemPath(item, albumPath);
  const src = thumbnailUrl(item);
  // Gallery 2 counted every item below (photos and albums); older data has only the photo count
  const total = item.totalDescendantCount ?? item.totalDescendantImageCount ?? 0;
  const count = item.childCount ?? 0;
  const summary = item.summary?.trim();
  return (
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
      {item.title && <p className="giTitle">{item.title}</p>}
      {isAlbum && summary && <p className="giDescription">{parseBBCodeDecoded(truncateTitle(summary, 256))}</p>}
      <div className="block-core-ItemInfo giInfo">
        {item.timestamp != null && <span className="date summary">Date: {formatG2Date(item.timestamp)}</span>}
        {isAlbum && count > 0 && (
          // "(N items total)": Gallery 2 counted all items below; the export counts the photos
          <span className="size summary">
            Size: {count} {count === 1 ? 'item' : 'items'}
            {total > count && ` (${total} items total)`}
          </span>
        )}
        {(item.viewCount ?? 0) > 0 && <span className="viewCount summary">Views: {item.viewCount}</span>}
      </div>
    </td>
  );
}

/**
 * Gallery 2's `gsThumbMatrix` (classic theme, THEME-01): the page's items in rows of three,
 * albums on the grey `giAlbumCell` background, photos in `giItemCell`; a short last row is filled
 * with empty cells like Gallery 2's "flush" section.
 *
 * @example
 * ```tsx
 * <MatrixThumbMatrix albumPath="/dreamhack/" items={pageChildren} />
 * ```
 */
export function MatrixThumbMatrix({ albumPath, items }: MatrixThumbMatrixProps) {
  const rows: Child[][] = [];
  for (let i = 0; i < items.length; i += MATRIX_COLUMNS) rows.push(items.slice(i, i + MATRIX_COLUMNS));
  return (
    <div className="gbBlock">
      <table className="gsThumbMatrix">
        <tbody>
          {rows.map((row) => (
            <tr key={row[0].id}>
              {row.map((item) => (
                <ItemCell key={item.id} item={item} albumPath={albumPath} />
              ))}
              {Array.from({ length: MATRIX_COLUMNS - row.length }, (_, k) => (
                <td key={`flush-${k}`}>&nbsp;</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
