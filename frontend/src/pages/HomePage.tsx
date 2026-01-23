/**
 * HomePage Component
 *
 * Displays the root album on the home page. Discovers the root album ID
 * and displays its children using the AlbumGrid component.
 *
 * @module frontend/src/pages
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlbumGrid } from '@/components/AlbumGrid';
import { FilterPanel } from '@/components/FilterPanel';
import { ViewModeToggle } from '@/components/ViewModeToggle';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { findRootAlbumId, DataLoadError } from '@/utils/dataLoader';
import type { Album } from '@/types';

/**
 * HomePage component
 *
 * Discovers and displays the root album. Shows loading state during discovery
 * and error state if root album cannot be found.
 *
 * @returns React component
 */
export function HomePage() {
  const navigate = useNavigate();
  const [rootAlbumId, setRootAlbumId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<DataLoadError | null>(null);

  const handleAlbumClick = useCallback(
    (album: Album) => {
      navigate(`/album/${album.id}`);
    },
    [navigate],
  );

  useEffect(() => {
    let isMounted = true;

    async function discoverRootAlbum() {
      setIsLoading(true);
      setError(null);

      try {
        const id = await findRootAlbumId();

        if (!isMounted) {
          return;
        }

        if (id === null) {
          setError(
            new DataLoadError(
              'Root album not found. Please ensure the gallery data is properly configured.',
              'NOT_FOUND',
            ),
          );
        } else {
          setRootAlbumId(id);
        }
      } catch (err) {
        if (!isMounted) {
          return;
        }

        const loadError =
          err instanceof DataLoadError
            ? err
            : new DataLoadError(
                'Failed to discover root album',
                'UNKNOWN_ERROR',
                err,
              );
        setError(loadError);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    discoverRootAlbum();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="home-page" role="status" aria-label="Loading gallery" aria-live="polite">
        <LoadingSpinner size="large" label="Loading gallery..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-page home-page-error" role="alert" aria-live="assertive">
        <h2>Error Loading Gallery</h2>
        <p>{error.message}</p>
      </div>
    );
  }

  if (rootAlbumId === null) {
    return (
      <div className="home-page home-page-error">
        <h2>Root Album Not Found</h2>
        <p>Unable to discover the root album. Please check the gallery configuration.</p>
      </div>
    );
  }

  return (
    <div className="home-page">
      <FilterPanel />
      <div className="home-page-controls">
        <ViewModeToggle contentType="albums" />
      </div>
      <AlbumGrid albumId={rootAlbumId} onAlbumClick={handleAlbumClick} />
    </div>
  );
}

export default HomePage;
