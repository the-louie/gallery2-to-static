/**
 * ImageThumbnail Component
 *
 * A reusable image thumbnail component with lazy loading, error handling,
 * and proper aspect ratio preservation. Supports both thumbnail and full
 * image URLs, with graceful fallbacks for missing images.
 *
 * ## Features
 *
 * - Lazy loading using Intersection Observer API with optimized rootMargin (200px bottom)
 * - Native loading="lazy" attribute as fallback for browsers without Intersection Observer
 * - Aspect ratio preservation to prevent layout shift (CLS optimization)
 * - Error handling with accessible fallback placeholder
 * - Loading placeholder display with skeleton animation
 * - Accessibility support (alt text, keyboard navigation, ARIA attributes)
 * - Support for thumbnail and full image URLs
 * - Automatic observer cleanup to prevent memory leaks
 *
 * ## Lazy Loading Implementation
 *
 * The component uses Intersection Observer API with the following configuration:
 * - rootMargin: '0px 0px 200px 0px' - preloads images 200px before entering viewport
 * - threshold: 0.01 - triggers when 1% of image is visible
 * - Observer automatically disconnects after intersection to prevent memory leaks
 * - Falls back to native loading="lazy" if Intersection Observer is unavailable
 *
 * ## Usage
 *
 * ```tsx
 * import { ImageThumbnail } from '@/components/ImageThumbnail';
 *
 * <ImageThumbnail
 *   image={imageData}
 *   useThumbnail={true}
 *   onClick={(image) => handleImageClick(image)}
 *   alt="Photo description"
 * />
 * ```
 *
 * @module frontend/src/components/ImageThumbnail
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Image } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';
import { getAspectRatioWithFallback } from '@/utils/aspectRatio';
import './ImageThumbnail.css';

/**
 * Props for ImageThumbnail component
 */
export interface ImageThumbnailProps {
  /** Image data object */
  image: Image;
  /** Whether to use thumbnail URL (default: false) */
  useThumbnail?: boolean;
  /** Optional click handler */
  onClick?: (image: Image) => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional alt text override (defaults to image title or description) */
  alt?: string;
}

/**
 * ImageThumbnail component
 *
 * Displays an image with lazy loading, error handling, and aspect ratio preservation.
 * Supports both thumbnail and full image URLs based on the useThumbnail prop.
 *
 * The component implements lazy loading using Intersection Observer API to improve
 * initial page load performance. Images are only loaded when they approach the viewport
 * (200px before entering), reducing bandwidth usage and improving Core Web Vitals.
 *
 * @param props - Component props
 * @returns React component
 */
export function ImageThumbnail({
  image,
  useThumbnail = false,
  onClick,
  className,
  alt,
}: ImageThumbnailProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Calculate aspect ratio from image dimensions (memoized)
  const aspectRatio = useMemo(
    () =>
      getAspectRatioWithFallback(
        useThumbnail ? image.thumb_width : image.width,
        useThumbnail ? image.thumb_height : image.height,
      ),
    [image.thumb_width, image.thumb_height, image.width, image.height, useThumbnail],
  );

  // Generate alt text from image title or description (memoized)
  const altText = useMemo(
    () => alt || image.title || image.description || 'Image',
    [alt, image.title, image.description],
  );

  // Get image URL (memoized)
  const imageUrl = useMemo(
    () => getImageUrl(image, useThumbnail),
    [image.pathComponent, useThumbnail],
  );

  // Reset state when image or useThumbnail changes
  useEffect(() => {
    // Clean up existing observer when image changes
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setIsLoading(true);
    setHasError(false);
    setShouldLoad(false);
  }, [image.id, image.pathComponent, useThumbnail]);

  // Set up Intersection Observer for lazy loading
  useEffect(() => {
    // If Intersection Observer is not supported, load immediately
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    // If already loading or loaded, don't set up observer
    if (shouldLoad) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    // Create observer with error handling for edge cases
    // rootMargin: '0px 0px 200px 0px' - preload 200px below viewport (best practice for lazy loading)
    // threshold: 0.01 - trigger when 1% is visible (early loading for smooth UX)
    try {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setShouldLoad(true);
              // Disconnect observer once image should load to prevent memory leaks
              observer.disconnect();
              observerRef.current = null;
            }
          });
        },
        {
          rootMargin: '0px 0px 200px 0px', // Start loading 200px before entering viewport (bottom only)
          threshold: 0.01, // Trigger when 1% is visible
        },
      );

      // Observe container with error handling
      try {
        observer.observe(container);
        observerRef.current = observer;
      } catch (observeError) {
        // If observe fails (e.g., container is not a valid Element), fall back to immediate loading
        console.warn('Failed to observe container for lazy loading:', observeError);
        setShouldLoad(true);
      }
    } catch (observerError) {
      // If observer creation fails (e.g., invalid options), fall back to immediate loading
      console.warn('Failed to create IntersectionObserver, loading image immediately:', observerError);
      setShouldLoad(true);
    }

    // Cleanup function - disconnect observer on unmount or when dependencies change
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [shouldLoad]);

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle image error
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // Handle click
  const handleClick = useCallback(() => {
    if (onClick) {
      onClick(image);
    }
  }, [onClick, image]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (onClick && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleClick();
      }
    },
    [onClick, handleClick],
  );

  // Determine if image should be rendered
  const shouldRenderImage = shouldLoad || typeof IntersectionObserver === 'undefined';

  // Generate container style with aspect ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio.toString(),
  };

  return (
    <div
      ref={containerRef}
      className={className ? `image-thumbnail-container ${className}` : 'image-thumbnail-container'}
      style={containerStyle}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      aria-label={onClick ? altText : undefined}
    >
      {hasError ? (
        <div className="image-thumbnail-error" role="img" aria-label={altText}>
          <span className="image-thumbnail-error-icon" aria-hidden="true">
            📷
          </span>
          <span className="image-thumbnail-error-text">Image unavailable</span>
        </div>
      ) : shouldRenderImage ? (
        <>
          {isLoading && (
            <div className="image-thumbnail-loading" aria-hidden="true">
              <div className="image-thumbnail-skeleton" />
            </div>
          )}
          <img
            ref={imgRef}
            src={imageUrl}
            alt={altText}
            className={`image-thumbnail-image ${isLoading ? 'image-thumbnail-image-loading' : ''}`}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            decoding="async"
          />
        </>
      ) : (
        <div className="image-thumbnail-loading" aria-hidden="true">
          <div className="image-thumbnail-skeleton" />
        </div>
      )}
    </div>
  );
}

export default ImageThumbnail;
