/**
 * RootAlbumListBlock Component
 *
 * Renders a single root-level album as a rich block: thumbnail (link to album),
 * "Album: [title]" (bold), description, optional website link from summary/description,
 * metadata (Date, Owner), and "Subalbums:" list. The Subalbums section shows at most
 * the latest 5 subalbums (by timestamp descending, nulls last); when more exist,
 * "... And much more" is shown below the list. Two-column layout (album left,
 * subalbums right); stacks on narrow viewports.
 *
 * Size and Views are omitted (not in backend); see dateUtils for note.
 *
 * @module frontend/src/components/RootAlbumListBlock
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAlbumThumbnailUrl } from '@/utils/imageUrl';
import { parseBBCode, extractUrlFromBBCode } from '@/utils/bbcode';
import { formatAlbumDate } from '@/utils/dateUtils';
import { sortItems } from '@/utils/sorting';
import type { Album } from '@/types';
import './RootAlbumListBlock.css';

export interface RootAlbumListBlockProps {
  /** The root-level album to display. */
  album: Album;
  /** Immediate child albums (from loadAlbum). */
  subalbums: Album[];
  /** Optional; reserved for future use. Navigation is via Link. */
  onAlbumClick?: (album: Album) => void;
  /** Optional CSS class name. */
  className?: string;
}

/**
 * RootAlbumListBlock component
 *
 * @param props - Component props
 * @returns React component
 */
export function RootAlbumListBlock({
  album,
  subalbums,
  onAlbumClick: _onAlbumClick,
  className,
}: RootAlbumListBlockProps) {
  const [imageError, setImageError] = useState(false);
  const thumbnailUrl = getAlbumThumbnailUrl(album);
  const shouldShowThumbnail = thumbnailUrl !== null && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [album.id, thumbnailUrl]);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const parsedTitle = useMemo(() => {
    const t = album.title?.trim();
    return t ? parseBBCode(t) : 'Untitled Album';
  }, [album.title]);

  const extUrl = useMemo(
    () => extractUrlFromBBCode(album.summary ?? album.description ?? ''),
    [album.summary, album.description],
  );

  const dateStr = useMemo(() => formatAlbumDate(album.timestamp ?? null), [album.timestamp]);
  const showOwner = Boolean(album.ownerName?.trim());
  const showDescription = Boolean(album.description?.trim());
  const showSubalbums = subalbums.length > 0;

  const displaySubalbums = useMemo(
    () => sortItems([...subalbums], 'date-desc').slice(0, 5),
    [subalbums],
  );
  const hasMoreSubalbums = subalbums.length > 5;

  const linkTo = `/album/${album.id}`;

  return (
    <article
      className={className ? `root-album-list-block ${className}` : 'root-album-list-block'}
      aria-labelledby={`root-album-title-${album.id}`}
    >
      <div className="root-album-list-block-inner">
        <section className="root-album-list-block-main" aria-label="Album info">
          <div className="root-album-list-block-thumbnail">
            <Link
              to={linkTo}
              aria-label={`Open album: ${album.title || 'Untitled'}`}
              className="root-album-list-block-thumb-link"
            >
              {shouldShowThumbnail && thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="root-album-list-block-thumb-img"
                  onError={handleImageError}
                  crossOrigin="anonymous"
                />
              ) : (
                <span className="root-album-list-block-thumb-placeholder" aria-hidden="true">
                  📁
                </span>
              )}
            </Link>
          </div>
          <div className="root-album-list-block-content">
            <h2 id={`root-album-title-${album.id}`} className="root-album-list-block-title">
              Album: {parsedTitle}
            </h2>
            {showDescription && (
              <p className="root-album-list-block-description">{album.description}</p>
            )}
            {extUrl && (
              <p className="root-album-list-block-website">
                <a
                  href={extUrl.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="root-album-list-block-website-link"
                >
                  {extUrl.label ?? extUrl.url}
                </a>
              </p>
            )}
            <dl className="root-album-list-block-meta">
              {dateStr && (
                <>
                  <dt className="root-album-list-block-meta-dt">Date</dt>
                  <dd className="root-album-list-block-meta-dd">{dateStr}</dd>
                </>
              )}
              {showOwner && (
                <>
                  <dt className="root-album-list-block-meta-dt">Owner</dt>
                  <dd className="root-album-list-block-meta-dd">{album.ownerName}</dd>
                </>
              )}
            </dl>
          </div>
        </section>
        {showSubalbums && (
          <section
            className="root-album-list-block-subalbums"
            aria-label="Subalbums"
          >
            <h3 className="root-album-list-block-subalbums-title">Subalbums:</h3>
            <ul className="root-album-list-block-subalbums-list">
              {displaySubalbums.map((sub) => (
                <li key={sub.id}>
                  <Link
                    to={`/album/${sub.id}`}
                    className="root-album-list-block-subalbum-link"
                  >
                    {sub.title ?? 'Untitled'}
                  </Link>
                </li>
              ))}
            </ul>
            {hasMoreSubalbums && (
              <span className="root-album-list-block-subalbums-more">
                ... And much more
              </span>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

export default RootAlbumListBlock;
