/**
 * RootAlbumListBlock Component
 *
 * Renders a single root-level album as a rich block: album title (bold), description,
 * optional website link from summary/description, metadata (Date, Owner), and "Subalbums:" list.
 * The Subalbums section shows at most the latest 6 subalbums (by timestamp descending, nulls last)
 * in a 2-column grid layout; when more exist, "... And much more" is shown below the list.
 * Two-column layout (album left, subalbums right); stacks on narrow viewports.
 *
 * Block background uses the album highlight image when present (faded, blurred layer); when
 * no highlight image is available the block uses the gradient fallback only.
 *
 * Size and Views are omitted (not in backend); see dateUtils for note.
 *
 * @module frontend/src/components/RootAlbumListBlock
 */

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { parseBBCodeDecoded, extractUrlFromBBCode } from '@/utils/bbcode';
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities';
import { formatAlbumDate } from '@/utils/dateUtils';
import { getAlbumHighlightImageUrl } from '@/utils/imageUrl';
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
  const showSubalbums = subalbums.length > 0;

  const displaySubalbums = useMemo(
    () => sortItems([...subalbums], 'date-desc').slice(0, 6),
    [subalbums],
  );
  const hasMoreSubalbums = subalbums.length > 6;

  const linkTo = `/album/${album.id}`;
  const highlightImageUrl = getAlbumHighlightImageUrl(album);
  const safeBgUrl =
    highlightImageUrl != null
      ? `url("${highlightImageUrl.replace(/"/g, '\\"')}")`
      : undefined;

  return (
    <article
      className={className ? `root-album-list-block ${className}` : 'root-album-list-block'}
      aria-labelledby={`root-album-title-${album.id}`}
    >
      {highlightImageUrl != null && (
        <div
          className="root-album-list-block-bg"
          role="presentation"
          aria-hidden="true"
          style={{ backgroundImage: safeBgUrl }}
        />
      )}
      <div className="root-album-list-block-inner">
        <section className="root-album-list-block-main" aria-label="Album info">
          <div className="root-album-list-block-content">
            <h2 id={`root-album-title-${album.id}`} className="root-album-list-block-title">
              <Link
                to={linkTo}
                aria-label={`Open album: ${decodeHtmlEntities(album.title || 'Untitled')}`}
                className="root-album-list-block-title-link"
              >
                {parsedTitle}
              </Link>
            </h2>
            {showDescription && (
              <p className="root-album-list-block-description">
                {parseBBCodeDecoded(album.description!.trim())}
              </p>
            )}
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
                    {sub.title?.trim() ? parseBBCodeDecoded(sub.title.trim()) : 'Untitled'}
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
