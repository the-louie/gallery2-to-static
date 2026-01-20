/**
 * ImageDetailPage Component
 *
 * Placeholder component for image detail view. This component will be
 * integrated with the lightbox component in a future implementation.
 *
 * @module frontend/src/pages
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import { parseImageId } from '@/utils/routeParams';
import type { RouteParams } from '@/types';

/**
 * ImageDetailPage component
 *
 * Placeholder component that displays a message indicating the lightbox
 * functionality will be implemented in a future task.
 *
 * @returns React component
 */
export function ImageDetailPage() {
  const { id } = useParams<RouteParams>();
  const navigate = useNavigate();

  const imageId = useMemo(() => parseImageId(id), [id]);

  // Redirect to 404 if image ID is invalid
  useEffect(() => {
    if (id !== undefined && imageId === null) {
      navigate('/not-found', { replace: true });
    }
  }, [id, imageId, navigate]);

  if (imageId === null) {
    return (
      <div className="image-detail-page image-detail-page-error">
        <h2>Invalid Image ID</h2>
        <p>The image ID in the URL is invalid.</p>
        <button onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  return (
    <div className="image-detail-page image-detail-page-placeholder">
      <h2>Image Detail View</h2>
      <p>Image ID: {imageId}</p>
      <p>
        <em>
          The lightbox component will be implemented in a future task. This
          page is a placeholder for the image detail view.
        </em>
      </p>
      <button onClick={() => navigate('/')} aria-label="Go to home page">
        Go to Home
      </button>
    </div>
  );
}

export default ImageDetailPage;
