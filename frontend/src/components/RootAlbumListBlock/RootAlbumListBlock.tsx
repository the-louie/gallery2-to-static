/**
 * RootAlbumListBlock Component
 *
 * Renders a single root-level album as a rich block. The block (title, description, metadata,
 * and in classic theme the thumb) is a single link to the album page; the optional event
 * website link and the subalbums section are excluded so they keep their own behavior.
 *
 * Contains: album title (bold), description, optional website link from summary/description,
 * metadata (Date, Owner), and subalbums list. Subalbums show at most the latest 10 (by
 * timestamp descending); when more exist, "...and more!" is shown. Original theme shows all
 * subalbums. Two-column layout (album left, subalbums right); stacks on narrow viewports.
 *
 * Block background uses the album highlight image when present (faded, blurred layer).
 *
 * @module frontend/src/components/RootAlbumListBlock
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { parseBBCodeDecoded, extractUrlFromBBCode } from '@/utils/bbcode';
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities';
import { formatAlbumDate } from '@/utils/dateUtils';
import { getAlbumHighlightImageUrl, getAlbumThumbnailUrl } from '@/utils/imageUrl';
import { titleToSegment } from '@/utils/albumPath';
import { sortItems } from '@/utils/sorting';
import { useTheme } from '@/contexts/ThemeContext';
import type { Album } from '@/types';
import './RootAlbumListBlock.css';

const ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT = 10;

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

  const parsedTitle = useMemo(() => {
    const t = album.title?.trim();
    return t ? parseBBCodeDecoded(t) : 'Untitled Album';
  }, [album.title]);

  const extUrl = useMemo(
    () => extractUrlFromBBCode(album.summary ?? album.description ?? ''),
    [album.summary, album.description],
  );

  const dateStr = useMemo(() => formatAlbumDate(album.timestamp ?? null), [album.timestamp]);
  const showOwner = Boolean(album.ownerName?.trim());
  const showDescription = Boolean(album.description?.trim());
  const { isClassic } = useTheme();
  const showSubalbums = subalbums.length > 0;

  const displaySubalbums = useMemo(() => {
    const sorted = sortItems([...subalbums], 'date-desc');
    if (isClassic) {
      return sorted;
    }
    return sorted.slice(0, ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT);
  }, [subalbums, isClassic]);
  const hasMoreSubalbums =
    !isClassic && subalbums.length > ROOT_ALBUM_SUBALBUMS_DISPLAY_LIMIT;

  const linkTo = album.path ?? `/${titleToSegment(album.title)}`;
  const highlightImageUrl = getAlbumHighlightImageUrl(album);
  const thumbnailUrl = getAlbumThumbnailUrl(album);
  const safeBgUrl =
    highlightImageUrl != null
      ? `url("${highlightImageUrl.replace(/"/g, '\\"')}")`
      : undefined;

  return (
    <article
      className={className ? `root-album-list-block ${className}` : 'root-album-list-block'}
      aria-labelledby={`root-album-title-${album.id}`}
    >
      {highlightImageUrl != null && !isClassic && (
        <div
          className="root-album-list-block-bg"
          role="presentation"
          aria-hidden="true"
          style={{ backgroundImage: safeBgUrl }}
        />
      )}
      <div className="root-album-list-block-inner">
        <div className="root-album-list-block-main">
          <Link
            to={linkTo}
            className="root-album-list-block-block-link"
            aria-label={`Open album: ${decodeHtmlEntities(album.title || 'Untitled')}`}
          >
            {isClassic && (
              <div className="root-album-list-block-thumb">
                {thumbnailUrl != null ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="root-album-list-block-thumb-img"
                    width={160}
                    height={120}
                  />
                ) : (
                  <span className="root-album-list-block-thumb-placeholder">No image</span>
                )}
              </div>
            )}
            <div className="root-album-list-block-content">
              <h2 id={`root-album-title-${album.id}`} className="root-album-list-block-title">
                {isClassic && <span className="root-album-list-block-title-prefix">Album: </span>}
                <span className="root-album-list-block-title-text">{parsedTitle}</span>
              </h2>
              {showDescription && (
                <p className="root-album-list-block-description">
                  {parseBBCodeDecoded(album.description!.trim())}
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
                    <dd className="root-album-list-block-meta-dd">
                      {decodeHtmlEntities(album.ownerName!)}
                    </dd>
                  </>
                )}
                {album.totalDescendantImageCount != null && (
                  <>
                    <dt className="root-album-list-block-meta-dt">Images</dt>
                    <dd className="root-album-list-block-meta-dd">
                      {album.totalDescendantImageCount}
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </Link>
          {extUrl && (
            <p className="root-album-list-block-website">
              <a
                href={extUrl.url}
                target="_blank"
                rel="noopener noreferrer"
                className="root-album-list-block-website-link"
              >
                {decodeHtmlEntities(extUrl.label ?? extUrl.url)}
              </a>
            </p>
          )}
        </div>
        {showSubalbums && (
          <section
            className="root-album-list-block-subalbums"
            role="region"
            aria-label="Subalbums"
          >
            {isClassic && (
              <strong className="root-album-list-block-subalbums-heading">Subalbums:</strong>
            )}
            <ul className="root-album-list-block-subalbums-list">
              {displaySubalbums.map((sub) => (
                <li key={sub.id}>
                  <Link
                    to={`/album/${sub.id}`}
                    className="root-album-list-block-subalbum-link"
                  >
                    {sub.title?.trim() ? parseBBCodeDecoded(sub.title.trim()) : 'Untitled'}
                  </Link>
                </li>
              ))}
            </ul>
            {hasMoreSubalbums && (
              <span className="root-album-list-block-subalbums-more">
                ...and more!
              </span>
            )}
          </section>
        )}
      </div>
    </article>
  );
}

export default RootAlbumListBlock;
