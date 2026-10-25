/**
 * PathResolverPage – resolves path-based URL to album (and optional image)
 * and delegates to AlbumDetailPage or ImageDetailPage.
 *
 * Decodes URI-encoded path segments before index lookup to handle
 * percent-encoded characters (spaces, Nordic characters, etc.).
 *
 * If the path index cannot be loaded (network error, 5xx, bad JSON) it shows an
 * error with a Retry button instead of spinning forever (LOGIC-15). An unknown
 * path still goes to /not-found.
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
  } | undefined>(undefined);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    // Keep showing the previous resolution until the new one is known: resetting to undefined here
    // unmounted the page (spinner flash, Lightbox remount) on every path change (PERF-02).
    setLoadFailed(false);
    let cancelled = false;

    const resolveOrFail = async (albumPath: string): Promise<number | null | undefined> => {
      try {
        return await resolvePathToAlbumId(albumPath);
      } catch (err) {
        if (!cancelled) {
          console.error('PathResolverPage: could not load the path index', err);
          setLoadFailed(true);
        }
        return undefined;
      }
    };

    (async () => {
      let raw: string;
      try {
        raw = decodeURIComponent((pathParam ?? '').trim());
      } catch {
        if (!cancelled) navigate('/not-found', { replace: true });
        return;
      }
      const path = raw === '' ? '/' : `/${raw.replace(/^\/+/, '')}`;
      const imageMatch = path.match(IMAGE_PATH_RE);
      if (imageMatch) {
        const albumPath = path.slice(0, imageMatch.index);
        const imageId = parseInt(imageMatch[1], 10);
        if (
          !Number.isFinite(imageId) ||
          imageId <= 0 ||
          imageId > Number.MAX_SAFE_INTEGER
        ) {
          if (!cancelled) navigate('/not-found', { replace: true });
          return;
        }
        const albumId = await resolveOrFail(albumPath === '' ? '/' : albumPath);
        if (cancelled || albumId === undefined) return;
        if (albumId === null) {
          navigate('/not-found', { replace: true });
          return;
        }
        setResolved({ albumId, imageId });
        return;
      }
      const albumId = await resolveOrFail(path);
      if (cancelled || albumId === undefined) return;
      if (albumId === null) {
        navigate('/not-found', { replace: true });
        return;
      }
      setResolved({ albumId });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathParam, navigate, attempt]);

  if (loadFailed) {
    return (
      <div className="path-resolver-page path-resolver-page-error" role="alert" aria-live="assertive">
        <h2>Could not load the gallery</h2>
        <p>The album list could not be loaded. Check your connection and try again.</p>
        <button type="button" onClick={() => setAttempt((n) => n + 1)}>
          Retry
        </button>
      </div>
    );
  }

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
