import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { Child, Image } from '@/types';
import { useAlbumData } from '@/hooks/useAlbumData';
import { getAlbumPath, getItemPath } from '@/utils/albumPath';
import { getImageUrl } from '@/utils/imageUrl';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { formatG2Date, resizedSize } from '@/utils/matrixPaging';
import { LoadingSpinner } from '@/components/LoadingSpinner';
// Header, info and navigator styles are the album page's (same Gallery 2 blocks)
import '../MatrixAlbum/MatrixAlbum.css';
import './MatrixPhoto.css';

/**
 * Props for the MatrixPhoto component
 */
export interface MatrixPhotoProps {
  albumId: number;
  imageId: number;
}

const isPhoto = (c: Child) => c.type !== 'GalleryAlbumItem';

/** Photo navigator: first/previous on the left, next/last on the right, over the album's photos. */
function Navigator({ photos, index, albumPath }: { photos: Child[]; index: number; albumPath: string }) {
  const last = photos.length - 1;
  const href = (i: number) => getItemPath(photos[i], albumPath);
  return (
    <div className="gbBlock gcBackground2 gbNavigator">
      <div className="block-core-Navigator">
        <div className={index > 0 ? 'next-and-last' : 'next-and-last no-previous'}>
          {index < last && (
            <>
              <Link to={href(index + 1)} className="next">next</Link>
              <Link to={href(last)} className="last">last</Link>
            </>
          )}
        </div>
        <div className="first-and-previous">
          {index > 0 && (
            <>
              <Link to={href(0)} className="first">first</Link>
              <Link to={href(index - 1)} className="previous">previous</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * A photo page in Gallery 2's Matrix theme (classic theme, THEME-01; template
 * `docs/orig-page/2006/photo-CIMG0053_.html`): header block with the title, Date, Owner, a "Size:"
 * select (the 1024px resize or the full size) and "Full size: WxH"; navigator; the photo; navigator.
 * `?size=full` shows the original, as Gallery 2's imageViewsIndex did. While the photo loads, its
 * thumbnail shows blurred in its place. Left/right arrow keys step through the album's photos.
 *
 * @example
 * ```tsx
 * <MatrixPhoto albumId={57207} imageId={57215} />
 * ```
 */
export function MatrixPhoto({ albumId, imageId }: MatrixPhotoProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: children, metadata, isLoading, error, refetch } = useAlbumData(albumId);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);

  const ready = !isLoading && children !== null && metadata !== null && metadata.albumId === albumId;
  const albumPath = ready ? getAlbumPath(metadata.breadcrumbPath ?? []) : '';
  const photos = ready ? children.filter(isPhoto) : [];
  const index = photos.findIndex((p) => p.id === imageId);
  const photo = index >= 0 ? (photos[index] as Image) : null;

  const prevHref = photo && index > 0 ? getItemPath(photos[index - 1], albumPath) : null;
  const nextHref = photo && index < photos.length - 1 ? getItemPath(photos[index + 1], albumPath) : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey || e.target instanceof HTMLInputElement) return;
      if (e.key === 'ArrowLeft' && prevHref) navigate(prevHref);
      if (e.key === 'ArrowRight' && nextHref) navigate(nextHref);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [prevHref, nextHref, navigate]);

  if (error) {
    return (
      <div className="gbBlock giError" role="alert">
        <p>Could not load this photo: {error.message}</p>
        <button type="button" onClick={refetch}>Retry</button>
      </div>
    );
  }
  if (!ready) {
    return (
      <div className="gbBlock" role="status" aria-label="Loading photo">
        <LoadingSpinner />
      </div>
    );
  }
  if (!photo) {
    return (
      <div className="gbBlock giError" role="alert">
        <p>This photo is not in the album.</p>
        <Link to={albumPath}>Back to the album</Link>
      </div>
    );
  }

  const full = photo.width && photo.height ? { width: photo.width, height: photo.height } : null;
  const resized = full ? resizedSize(full.width, full.height) : null;
  const showFull = searchParams.get('size') === 'full' || resized === null;
  const shown = showFull ? full : resized;
  const photoHref = getItemPath(photo, albumPath);
  const src = getImageUrl(photo, false);
  const thumb = photo.thumbnailMissing ? null : getImageUrl(photo, true);
  const description = photo.description?.trim();

  return (
    <div className="g2-matrix-photo">
      <div className="gbBlock gcBackground1">
        <table className="gbHeader">
          <tbody>
            <tr>
              <td>
                {photo.title && <h2> {photo.title} </h2>}
                {description && <p className="giDescription">{parseBBCodeDecoded(description)}</p>}
              </td>
              <td className="gbHeaderInfo">
                <div className="block-core-ItemInfo giInfo">
                  {photo.timestamp != null && <span className="date summary">Date: {formatG2Date(photo.timestamp)}</span>}
                  {photo.ownerName && <span className="owner summary">Owner: {photo.ownerName}</span>}
                </div>
                {full && (
                  <div className="block-core-PhotoSizes giInfo">
                    Size:{' '}
                    <select
                      aria-label="Size"
                      value={showFull ? 'full' : 'resized'}
                      onChange={(e) => navigate(e.target.value === 'full' ? `${photoHref}?size=full` : photoHref)}
                    >
                      {resized && <option value="resized">{resized.width}x{resized.height}</option>}
                      <option value="full">{full.width}x{full.height}</option>
                    </select>
                    <br />
                    Full size: <Link to={`${photoHref}?size=full`}>{full.width}x{full.height}</Link>
                    <br />
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Navigator photos={photos} index={index} albumPath={albumPath} />
      <div className="gsImageView gbBlock">
        <span className="gsImageFrame">
          {thumb && loadedSrc !== src && (
            <img className="gsImagePlaceholder" src={thumb} alt="" aria-hidden="true" width={shown?.width} height={shown?.height} />
          )}
          <img
            key={src}
            src={src}
            alt={photo.title ?? ''}
            width={shown?.width}
            height={shown?.height}
            onLoad={() => setLoadedSrc(src)}
            className={loadedSrc === src ? 'gsImage' : 'gsImage gsImageLoading'}
          />
        </span>
      </div>
      <Navigator photos={photos} index={index} albumPath={albumPath} />
    </div>
  );
}
