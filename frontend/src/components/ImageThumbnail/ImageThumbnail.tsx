/**
 * ImageThumbnail Component
 *
 * A reusable image thumbnail component with lazy loading, progressive image loading
 * with blur-up technique, error handling, and proper aspect ratio preservation.
 *
 * ## Features
 *
 * - Progressive image loading with blur-up technique (thumbnail → full image)
 * - Lazy loading using Intersection Observer API with optimized rootMargin (200px bottom)
 * - Native loading="lazy" attribute as fallback for browsers without Intersection Observer
 * - Aspect ratio preservation to prevent layout shift (CLS optimization)
 * - Error handling with accessible fallback placeholder
 * - Loading placeholder display with skeleton animation
 * - Accessibility support (alt text, keyboard navigation, ARIA attributes)
 * - Automatic format detection and fallback (AVIF → WebP → Original)
 * - Automatic observer cleanup to prevent memory leaks
 *
 * ## Progressive Loading
 *
 * The component uses progressive loading with blur-up:
 * 1. Loads thumbnail image first (with blur filter)
 * 2. Loads full-resolution image in background
 * 3. Smoothly transitions from blurred thumbnail to sharp full image
 * 4. Automatically detects best format (AVIF → WebP → Original)
 *
 * ## Lazy Loading Implementation
 *
 * The component uses Intersection Observer API with the following configuration:
 * - rootMargin: '0px 0px 200px 0px' - preloads images 200px before entering viewport
 * - threshold: 0.01 - triggers when 1% is visible
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
import { getAspectRatioWithFallback } from '@/utils/aspectRatio';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
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
function ImageThumbnailComponent({
  image,
  useThumbnail = false,
  onClick,
  className,
  alt,
}: ImageThumbnailProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const [domFullImageLoaded, setDomFullImageLoaded] = useState(false);
  const thumbnailImgRef = useRef<HTMLImageElement>(null);
  const fullImgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use progressive image loading hook
  const progressiveImage = useProgressiveImage(image, true);

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

  // Reset lazy loading state when image changes
  useEffect(() => {
    // Clean up existing observer when image changes
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    setShouldLoad(false);
    setDomFullImageLoaded(false);
  }, [image.id, image.pathComponent, image.urlPath, useThumbnail]);

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

  // Handle thumbnail image load
  const handleThumbnailLoad = useCallback(() => {
    // Thumbnail loaded - progressive loading hook handles state
  }, []);

  // Handle full image load
  const handleFullImageLoad = useCallback(() => {
    // DOM image has loaded - update local state for fade-in
    setDomFullImageLoaded(true);
  }, []);

  // Handle image error (fallback to error state)
  const handleImageError = useCallback(() => {
    // Error handling is managed by progressive loading hook
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

  // Determine if image should be rendered (lazy loading)
  const shouldRenderImage = shouldLoad || typeof IntersectionObserver === 'undefined';

  // Determine loading state
  const isLoading = progressiveImage.state === 'thumbnail' || progressiveImage.state === 'thumbnail-loaded';
  const isFullLoaded = progressiveImage.state === 'full-loaded';
  const hasError = progressiveImage.hasError;

  // Generate container style with aspect ratio
  const containerStyle: React.CSSProperties = {
    aspectRatio: aspectRatio.toString(),
  };

  const containerClassName = className
    ? `image-thumbnail-container image-thumbnail-grid ${className}`
    : 'image-thumbnail-container image-thumbnail-grid';

  return (
    <div
      ref={containerRef}
      className={containerClassName}
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
          {/* Thumbnail image (blurred, always visible when loaded) */}
          {progressiveImage.thumbnailUrl && (
            <img
              ref={thumbnailImgRef}
              src={progressiveImage.thumbnailUrl}
              alt=""
              className="image-thumbnail-image image-thumbnail-thumb"
              onLoad={handleThumbnailLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              aria-hidden="true"
              crossOrigin="anonymous"
            />
          )}
          {/* Full image (fades in when loaded) */}
          {isFullLoaded && progressiveImage.fullImageUrl && (
            <img
              ref={fullImgRef}
              src={progressiveImage.fullImageUrl}
              alt={altText}
              className={`image-thumbnail-image image-thumbnail-full ${!domFullImageLoaded ? 'image-thumbnail-image-loading' : ''}`}
              onLoad={handleFullImageLoad}
              onError={handleImageError}
              loading="lazy"
              decoding="async"
              crossOrigin="anonymous"
            />
          )}
        </>
      ) : (
        <div className="image-thumbnail-loading" aria-hidden="true">
          <div className="image-thumbnail-skeleton" />
        </div>
      )}
    </div>
  );
}

/**
 * Memoized ImageThumbnail component to prevent unnecessary re-renders
 * when props haven't changed. Uses custom comparison for image object.
 */
export const ImageThumbnail = React.memo(ImageThumbnailComponent, (prevProps, nextProps) => {
  // Custom comparison: only re-render if image or other props actually changed
  // Handle null/undefined images defensively
  if (!prevProps.image || !nextProps.image) {
    return prevProps.image === nextProps.image;
  }
  // Compare image properties that affect rendering: id, pathComponent, urlPath, title, description
  // urlPath used for image URLs when present; pathComponent fallback
  return (
    prevProps.image.id === nextProps.image.id &&
    prevProps.image.pathComponent === nextProps.image.pathComponent &&
    prevProps.image.urlPath === nextProps.image.urlPath &&
    prevProps.image.title === nextProps.image.title &&
    prevProps.image.description === nextProps.image.description &&
    prevProps.useThumbnail === nextProps.useThumbnail &&
    prevProps.className === nextProps.className &&
    prevProps.alt === nextProps.alt &&
    prevProps.onClick === nextProps.onClick
  );
});

export default ImageThumbnail;
