/**
 * RootAlbumListView Component
 *
 * Displays the root album's children as a vertical list of rich blocks (RootAlbumListBlock).
 * Used only on HomePage (/). Uses useAlbumData, useFilter, useSort('albums'),
 * useSubalbumsMap, and useScrollPosition. Reuses AlbumGrid loading/error/empty patterns.
 * Saves window scroll position (root-album-list) for restoration on back navigation.
 *
 * @module frontend/src/components/RootAlbumListView
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useSort } from '@/hooks/useSort';
import { useFilter } from '@/contexts/FilterContext';
import { useScrollPosition } from '@/hooks/useScrollPosition';
import { applyFilters } from '@/utils/filterUtils';
import { sortItems } from '@/utils/sorting';
import { useSubalbumsMap } from '@/hooks/useSubalbumsMap';
import { AlbumGridSkeleton } from '@/components/AlbumGrid/AlbumGridSkeleton';
import { AlbumGridEmpty } from '@/components/AlbumGrid/AlbumGridEmpty';
import { RootAlbumListBlock } from '@/components/RootAlbumListBlock';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities';
import type { Album, Child } from '@/types';
import { isAlbum } from '@/types';
import './RootAlbumListView.css';

export interface RootAlbumListViewProps {
  /** Root album ID (from findRootAlbumId). */
  albumId: number;
  /** Optional click handler (e.g. navigate to /album/:id). */
  onAlbumClick?: (album: Album) => void;
  /** Optional CSS class name. */
  className?: string;
}

/**
 * RootAlbumListView component
 *
 * @param props - Component props
 * @returns React component
 */
export function RootAlbumListView({
  albumId,
  onAlbumClick,
  className,
}: RootAlbumListViewProps) {
  const { data, metadata, isLoading, error, refetch } = useAlbumData(albumId);
  const { criteria } = useFilter();
  const { option: sortOption } = useSort('albums');

  const albums = useMemo(() => {
    if (!data) return [];
    const all = data.filter(isAlbum) as Album[];
    if (all.length === 0) return all;
    const filtered = applyFilters(all as Child[], criteria);
    const sorted = sortItems(filtered.filter(isAlbum) as Album[], sortOption);
    return sorted;
  }, [data, criteria, sortOption]);

  const subalbumIds = useMemo(
    () => albums.filter((a) => a.hasChildren).map((a) => a.id),
    [albums],
  );
  const { subalbumsMap, isLoading: subalbumsLoading } = useSubalbumsMap(subalbumIds);
  const { saveScrollPosition } = useScrollPosition(albumId, 'root-album-list');

  const handleRetry = useCallback(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    const onScroll = () => saveScrollPosition(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [saveScrollPosition]);

  if (isLoading) {
    return (
      <ErrorBoundary>
        <AlbumGridSkeleton className={className} />
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div
          className={className ? `root-album-list-error ${className}` : 'root-album-list-error'}
          role="alert"
          aria-live="assertive"
        >
          <p>Error loading albums: {error.message}</p>
          <button type="button" onClick={handleRetry} aria-label="Retry loading albums">
            Retry
          </button>
        </div>
      </ErrorBoundary>
    );
  }

  if (albums.length === 0) {
    return (
      <ErrorBoundary>
        <AlbumGridEmpty className={className} />
      </ErrorBoundary>
    );
  }

  const hasIntro =
    metadata &&
    (Boolean(metadata.albumTitle?.trim()) || Boolean(metadata.albumDescription?.trim()));
  const introTitle =
    metadata?.albumTitle?.trim() != null && metadata.albumTitle.trim() !== ''
      ? parseBBCodeDecoded(metadata.albumTitle.trim())
      : 'Albums';
  const introDescription = metadata?.albumDescription?.trim() ?? '';

  return (
    <ErrorBoundary>
      <div
        className={className ? `root-album-list-view ${className}` : 'root-album-list-view'}
        role="region"
        aria-label="Root albums"
        aria-busy={subalbumsLoading}
      >
        {hasIntro && (
          <div className="root-album-list-view-intro" aria-label="Root album">
            <h1 className="root-album-list-view-intro-title">{introTitle}</h1>
            {introDescription !== '' && (
              <p className="root-album-list-view-intro-description">
                {decodeHtmlEntities(introDescription)}
              </p>
            )}
          </div>
        )}
        <div className="root-album-list-view-header">
          <h2 className="root-album-list-view-title">Albums</h2>
        </div>
        <ul className="root-album-list-view-list">
          {albums.map((album) => (
            <li key={album.id}>
              <RootAlbumListBlock
                album={album}
                subalbums={subalbumsMap.get(album.id) ?? []}
                onAlbumClick={onAlbumClick}
              />
            </li>
          ))}
        </ul>
      </div>
    </ErrorBoundary>
  );
}

export default RootAlbumListView;
