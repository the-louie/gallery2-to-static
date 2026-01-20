/**
 * AlbumDetailPage Component
 *
 * Displays album details including child albums and images. Loads album data
 * based on the album ID from the route parameters.
 *
 * @module frontend/src/pages
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useCallback } from 'react';
import { AlbumGrid } from '@/components/AlbumGrid';
import { ImageGrid } from '@/components/ImageGrid';
import { useAlbumData } from '@/hooks/useAlbumData';
import { parseAlbumId } from '@/utils/routeParams';
import { isAlbum, isImage } from '@/types';
import type { Album, Image, RouteParams } from '@/types';

/**
 * AlbumDetailPage component
 *
 * Displays an album's children (both albums and images) in separate grids.
 * Handles loading, error, and empty states.
 *
 * @returns React component
 */
export function AlbumDetailPage() {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();

  const albumId = useMemo(() => parseAlbumId(id), [id]);

  const { data, isLoading, error } = useAlbumData(albumId);

  // Redirect to 404 if album ID is invalid
  useEffect(() => {
    if (id !== undefined && albumId === null) {
      navigate('/not-found', { replace: true });
    }
  }, [id, albumId, navigate]);

  // Separate albums and images from the data
  const albums = useMemo<Album[]>(() => {
    if (!data) {
      return [];
    }
    return data.filter(isAlbum);
  }, [data]);

  const images = useMemo<Image[]>(() => {
    if (!data) {
      return [];
    }
    return data.filter(isImage);
  }, [data]);

  const handleAlbumClick = useCallback(
    (album: Album) => {
      navigate(`/album/${album.id}`);
    },
    [navigate],
  );

  const handleImageClick = useCallback(
    (image: Image) => {
      navigate(`/image/${image.id}`);
    },
    [navigate],
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="album-detail-page">
        <AlbumGrid isLoading={true} />
        <ImageGrid isLoading={true} />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="album-detail-page album-detail-page-error">
        <h2>Error Loading Album</h2>
        <p>{error.message}</p>
        {error.code === 'NOT_FOUND' && (
          <button onClick={() => navigate('/')} aria-label="Go to home page">
            Go to Home
          </button>
        )}
      </div>
    );
  }

  // Invalid album ID (will redirect, but show message in case redirect fails)
  if (albumId === null) {
    return (
      <div className="album-detail-page album-detail-page-error">
        <h2>Invalid Album ID</h2>
        <p>The album ID in the URL is invalid.</p>
        <button onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Empty state (no children)
  if (albums.length === 0 && images.length === 0) {
    return (
      <div className="album-detail-page album-detail-page-empty">
        <h2>Empty Album</h2>
        <p>This album contains no albums or images.</p>
        <button onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Display albums and images
  return (
    <div className="album-detail-page">
      {albums.length > 0 && (
        <section className="album-detail-albums" aria-label="Child albums">
          <h2>Albums</h2>
          <AlbumGrid albums={albums} onAlbumClick={handleAlbumClick} />
        </section>
      )}
      {images.length > 0 && (
        <section className="album-detail-images" aria-label="Images">
          <h2>Images</h2>
          <ImageGrid images={images} onImageClick={handleImageClick} />
        </section>
      )}
    </div>
  );
}

export default AlbumDetailPage;
