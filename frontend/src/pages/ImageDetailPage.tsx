/**
 * ImageDetailPage Component
 *
 * Displays image in lightbox modal. Handles both hierarchical route
 * (`/album/:albumId/image/:imageId`) and legacy route (`/image/:id`).
 * Loads album data and finds the current image, then displays it in
 * the lightbox with navigation support.
 *
 * @module frontend/src/pages
 */

import { Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { parseAlbumImageParams, parseImageId } from '@/utils/routeParams';
import { useAlbumData } from '@/hooks/useAlbumData';
import { useLightbox } from '@/hooks/useLightbox';
import { getAlbumPath } from '@/utils/albumPath';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { isImage } from '@/types';
import type { RouteParams, Image } from '@/types';

// Lazy load Lightbox component for code splitting
const Lightbox = lazy(() => import('@/components/Lightbox').then((module) => ({ default: module.Lightbox })));

interface ImageDetailPageProps {
  /** When provided (e.g. from PathResolverPage), use these instead of route params. */
  resolvedAlbumId?: number;
  resolvedImageId?: number;
}

/**
 * ImageDetailPage component
 *
 * Loads album data and displays the current image in a lightbox modal.
 * Supports path-based route (resolvedAlbumId/resolvedImageId), hierarchical routes
 * (`/album/:albumId/image/:imageId`), and legacy routes (`/image/:id`).
 *
 * @returns React component
 */
export function ImageDetailPage({
  resolvedAlbumId: resolvedAlbumIdProp,
  resolvedImageId: resolvedImageIdProp,
}: ImageDetailPageProps = {}) {
  const params = useParams<RouteParams>();
  const navigate = useNavigate();

  const routeParams = useMemo(() => {
    if (resolvedAlbumIdProp !== undefined && resolvedImageIdProp !== undefined) {
      return { albumId: resolvedAlbumIdProp, imageId: resolvedImageIdProp };
    }
    if (params.albumId && params.imageId) {
      return parseAlbumImageParams(params.albumId, params.imageId);
    }
    if (params.id) {
      return { albumId: null, imageId: parseImageId(params.id) };
    }
    return { albumId: null, imageId: null };
  }, [
    resolvedAlbumIdProp,
    resolvedImageIdProp,
    params.albumId,
    params.imageId,
    params.id,
  ]);

  const { data: albumData, metadata, isLoading, error } = useAlbumData(
    routeParams.albumId,
  );

  const albumPath = useMemo(
    () => (metadata?.breadcrumbPath ? getAlbumPath(metadata.breadcrumbPath) : undefined),
    [metadata?.breadcrumbPath],
  );

  const breadcrumbPath = metadata?.breadcrumbPath ?? null;

  // Extract images from album data
  const images = useMemo<Image[]>(() => {
    if (!albumData) {
      return [];
    }
    return albumData.filter(isImage);
  }, [albumData]);

  // Find current image from album data
  const currentImage = useMemo<Image | null>(() => {
    if (routeParams.imageId === null || images.length === 0) {
      return null;
    }
    return images.find((img) => img.id === routeParams.imageId) || null;
  }, [routeParams.imageId, images]);

  const lightboxState = useLightbox(
    images,
    albumPath,
    routeParams.albumId ?? undefined,
    routeParams.imageId ?? undefined,
  );

  // Redirect to 404 if IDs are invalid
  useEffect(() => {
    if (
      (params.albumId !== undefined || params.imageId !== undefined || params.id !== undefined) &&
      (routeParams.imageId === null || (routeParams.albumId !== null && routeParams.imageId === null))
    ) {
      navigate('/not-found', { replace: true });
    }
  }, [params, routeParams, navigate]);

  // Handle error state (album not found or image not found)
  if (routeParams.albumId !== null && error) {
    return (
      <div className="image-detail-page image-detail-page-error" role="alert" aria-live="assertive">
        <h2>Error Loading Image</h2>
        <p>{error.message}</p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Handle case where image is not found in album
  if (
    routeParams.imageId !== null &&
    !isLoading &&
    albumData !== null &&
    currentImage === null &&
    routeParams.albumId !== null
  ) {
    return (
      <div className="image-detail-page image-detail-page-error" role="alert" aria-live="assertive">
        <h2>Image Not Found</h2>
        <p>The image was not found in this album.</p>
        <button
          type="button"
          onClick={() =>
            navigate(
              albumPath ?? (routeParams.albumId != null ? `/album/${routeParams.albumId}` : '/'),
            )
          }
          aria-label="Go back to album"
        >
          Go Back to Album
        </button>
      </div>
    );
  }

  // Handle invalid image ID
  if (routeParams.imageId === null && (params.imageId !== undefined || params.id !== undefined)) {
    return (
      <div className="image-detail-page image-detail-page-error" role="alert" aria-live="assertive">
        <h2>Invalid Image ID</h2>
        <p>The image ID in the URL is invalid.</p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Show loading state while album data is loading
  if (routeParams.albumId !== null && isLoading) {
    return (
      <div className="image-detail-page image-detail-page-loading" role="status" aria-label="Loading image" aria-live="polite">
        <LoadingSpinner size="large" label="Loading image..." />
      </div>
    );
  }

  // Handle legacy route without album context
  if (routeParams.albumId === null && routeParams.imageId !== null) {
    return (
      <div className="image-detail-page image-detail-page-error" role="alert" aria-live="assertive">
        <h2>Legacy Route Not Supported</h2>
        <p>
          The legacy image route requires album context. Please use the album image route format:
          /album/:albumId/image/:imageId
        </p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Render lightbox if image is available
  // Note: Lightbox will only render if isOpen is true and image is not null
  return (
    <div className="image-detail-page">
      {currentImage !== null ? (
        <Suspense fallback={<LoadingSpinner size="large" label="Loading lightbox..." />}>
          <Lightbox
            isOpen={true}
            image={currentImage}
            albumContext={images}
            albumId={routeParams.albumId}
            onClose={lightboxState.closeLightbox}
            onNext={lightboxState.navigateToNext}
            onPrevious={lightboxState.navigateToPrevious}
            breadcrumbPath={breadcrumbPath}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

export default ImageDetailPage;
