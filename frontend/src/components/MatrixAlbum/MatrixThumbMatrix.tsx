import { Link } from 'react-router-dom';
import type { Album, Child, Image } from '@/types';
import { getItemPath } from '@/utils/albumPath';
import { getAlbumThumbnailUrl, getImageUrl } from '@/utils/imageUrl';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { formatG2Date } from '@/utils/matrixPaging';
import { truncateTitle } from '@/utils/matrixPeers';
import { displayTitle } from '@/utils/displayTitle';

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
    <div className={isAlbum ? 'giAlbumCell gcBackground1' : 'giItemCell'}>
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
      {item.title && <p className="giTitle">{isAlbum ? item.title : displayTitle(item.title)}</p>}
      {isAlbum && summary && <p className="giDescription">{parseBBCodeDecoded(truncateTitle(summary, 256))}</p>}
      <div className="block-core-ItemInfo giInfo">
        {item.timestamp != null && <span className="date summary">Date: {formatG2Date(item.timestamp)}</span>}
        {!isAlbum && item.photographer?.trim() && (
          <span className="photographer summary">Fotograf: {item.photographer.trim()}</span>
        )}
        {isAlbum && count > 0 && (
          // "(N items total)": Gallery 2 counted all items below; the export counts the photos
          <span className="size summary">
            Size: {count} {count === 1 ? 'item' : 'items'}
            {total > count && ` (${total} items total)`}
          </span>
        )}
        {(item.viewCount ?? 0) > 0 && <span className="viewCount summary">Views: {item.viewCount}</span>}
      </div>
    </div>
  );
}

/**
 * The album's thumbnails (classic theme). Originally Gallery 2's fixed 3-column `gsThumbMatrix` table;
 * since GRID-01 (operator 2026-11-26) a width-driven grid that flows as many columns as the viewport
 * fits (modern screens are far wider than 2006's), albums on the grey `giAlbumCell` background, photos
 * in `giItemCell`. All items on one page, thumbnails lazy-loaded (no pager).
 *
 * @example
 * ```tsx
 * <MatrixThumbMatrix albumPath="/dreamhack/" items={children} />
 * ```
 */
export function MatrixThumbMatrix({ albumPath, items }: MatrixThumbMatrixProps) {
  return (
    <div className="gbBlock">
      <div className="gsThumbMatrix">
        {items.map((item) => (
          <ItemCell key={item.id} item={item} albumPath={albumPath} />
        ))}
      </div>
    </div>
  );
}
