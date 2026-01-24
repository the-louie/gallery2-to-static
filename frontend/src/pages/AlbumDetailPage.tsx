/**
 * AlbumDetailPage Component
 *
 * Displays album details including child albums and images. Loads album data
 * based on the album ID from the route parameters. Uses the AlbumDetail component
 * for rendering.
 *
 * @module frontend/src/pages
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { AlbumDetail } from '@/components/AlbumDetail';
import { FilterPanel } from '@/components/FilterPanel';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { parseAlbumId } from '@/utils/routeParams';
import type { RouteParams } from '@/types';

/**
 * AlbumDetailPage component
 *
 * Page-level component that handles route parameters and passes them to
 * the AlbumDetail component. Handles invalid album ID redirects.
 *
 * @returns React component
 */
export function AlbumDetailPage() {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();

  const albumId = useMemo(() => parseAlbumId(id), [id]);

  // Redirect to 404 if album ID is invalid
  useEffect(() => {
    if (id !== undefined && albumId === null) {
      navigate('/not-found', { replace: true });
    }
  }, [id, albumId, navigate]);

  // Invalid album ID (will redirect, but show message in case redirect fails)
  if (albumId === null) {
    return (
      <div className="album-detail-page album-detail-page-error" role="alert" aria-live="assertive">
        <h2>Invalid Album ID</h2>
        <p>The album ID in the URL is invalid.</p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Use AlbumDetail component for rendering
  return (
    <div className="album-detail-page">
      <FilterPanel />
      <AlbumDetail albumId={albumId} />
    </div>
  );
}

export default AlbumDetailPage;
