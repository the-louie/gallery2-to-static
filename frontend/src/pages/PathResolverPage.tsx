/**
 * PathResolverPage – resolves path-based URL to album (and optional image)
 * and delegates to AlbumDetailPage or ImageDetailPage.
 *
 * A path that is not an album is tried as `<album path>/<photo slug>` (URL-01), then as the
 * older `<album path>/image/<id>`.
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
import { loadAlbum, resolvePathToAlbumId } from '@/utils/dataLoader';
import { getPhotoSlug } from '@/utils/albumPath';
import { AlbumDetailPage } from './AlbumDetailPage';
import { ImageDetailPage } from './ImageDetailPage';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const IMAGE_PATH_RE = /\/image\/(\d+)$/;

/** The id of the first photo in the album whose slug is `slug`, or null (also when the album fails to load). */
async function findPhotoBySlug(albumId: number, slug: string): Promise<number | null> {
  try {
    const album = await loadAlbum(albumId);
    const photo = album.children.find((c) => c.type !== 'GalleryAlbumItem' && getPhotoSlug(c) === slug);
    return photo ? photo.id : null;
  } catch {
    return null;
  }
}

export function PathResolverPage() {
  const pathParam = useParams<{ '*': string }>()['*'] ?? '';
  const navigate = useNavigate();
  const [resolved, setResolved] = useState<{
    albumId: number;
    imageId?: number;
  } | undefined>(undefined);
  const [attempt, setAttempt] = useState(0);
  // The (path, attempt) whose path-index load failed: a new path or a retry clears it by itself
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const loadKey = `${attempt}:${pathParam}`;
  const loadFailed = failedKey === loadKey;

  useEffect(() => {
    // Keep showing the previous resolution until the new one is known: resetting to undefined here
    // unmounted the page (spinner flash, Lightbox remount) on every path change (PERF-02).
    let cancelled = false;
    const key = `${attempt}:${pathParam}`;

    const resolveOrFail = async (albumPath: string): Promise<number | null | undefined> => {
      try {
        return await resolvePathToAlbumId(albumPath);
      } catch (err) {
        if (!cancelled) {
          console.error('PathResolverPage: could not load the path index', err);
          setFailedKey(key);
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
      // An album path wins over the `/image/<id>` form: an album named "image" with a numeric
      // sub-album (e.g. /x/image/2005) is an album, not image 2005 of /x (LOGIC-28).
      const albumAtPath = await resolveOrFail(path);
      if (cancelled || albumAtPath === undefined) return;
      if (albumAtPath !== null) {
        setResolved({ albumId: albumAtPath });
        return;
      }
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
      // A photo: `<album path>/<photo slug>` (URL-01), no trailing slash
      const cut = path.lastIndexOf('/');
      const slug = path.slice(cut + 1);
      if (slug !== '') {
        const albumId = await resolveOrFail(cut === 0 ? '/' : path.slice(0, cut));
        if (cancelled || albumId === undefined) return;
        if (albumId !== null) {
          const imageId = await findPhotoBySlug(albumId, slug);
          if (cancelled) return;
          if (imageId !== null) {
            setResolved({ albumId, imageId });
            return;
          }
        }
      }
      navigate('/not-found', { replace: true });
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
