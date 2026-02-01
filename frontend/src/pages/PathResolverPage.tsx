/**
 * PathResolverPage – resolves path-based URL to album (and optional image) and delegates to AlbumDetailPage or ImageDetailPage.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { resolvePathToAlbumId } from '@/utils/dataLoader';
import { AlbumDetailPage } from './AlbumDetailPage';
import { ImageDetailPage } from './ImageDetailPage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const IMAGE_PATH_RE = /\/image\/(\d+)$/;

export function PathResolverPage() {
  const pathParam = useParams<{ '*': string }>()['*'] ?? '';
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<{
    albumId: number;
    imageId?: number;
  } | null>(undefined);

  useEffect(() => {
    setResolved(undefined);
    let cancelled = false;

    (async () => {
      const raw = (pathParam ?? '').trim();
      const path = raw === '' ? '/' : `/${raw.replace(/^\/+/, '')}`;
      const imageMatch = path.match(IMAGE_PATH_RE);
      if (imageMatch) {
        const albumPath = path.slice(0, imageMatch.index);
        const imageId = parseInt(imageMatch[1], 10);
        if (!Number.isFinite(imageId) || imageId <= 0) {
          if (!cancelled) navigate('/not-found', { replace: true });
          return;
        }
        const albumId = await resolvePathToAlbumId(albumPath === '' ? '/' : albumPath);
        if (cancelled) return;
        if (albumId === null) {
          navigate('/not-found', { replace: true });
          return;
        }
        setResolved({ albumId, imageId });
        return;
      }
      const albumId = await resolvePathToAlbumId(path);
      if (cancelled) return;
      if (albumId === null) {
        navigate('/not-found', { replace: true });
        return;
      }
      setResolved({ albumId });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathParam, navigate]);

  if (resolved === undefined) {
    return (
      <div className="path-resolver-page path-resolver-page-loading">
        <LoadingSpinner />
      </div>
    );
  }

  if (resolved.imageId !== undefined) {
    return (
      <ImageDetailPage
        resolvedAlbumId={resolved.albumId}
        resolvedImageId={resolved.imageId}
      />
    );
  }

  return <AlbumDetailPage resolvedAlbumId={resolved.albumId} />;
}

export default PathResolverPage;
