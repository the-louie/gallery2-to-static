/**
 * Lightbox Component
 *
 * An accessible lightbox/modal component for full-screen image viewing with
 * proper focus management, keyboard support, ARIA attributes, and comprehensive
 * accessibility features.
 *
 * ## Features
 *
 * - Full-screen image display in modal overlay
 * - Focus trap for accessibility (focus stays within modal)
 * - Keyboard support (Escape to close, Tab to navigate, Arrow keys for navigation)
 * - ARIA attributes for screen readers (role="dialog", aria-modal)
 * - Image metadata display (title, description, dimensions, date)
 * - Image navigation (Previous/Next buttons and keyboard)
 * - Image counter display (e.g., "3 of 15")
 * - Automatic preloading of adjacent images for smooth navigation
 * - Body scroll lock when modal is open
 * - Backdrop click-to-close
 * - Responsive design (mobile and desktop)
 * - Loading and error states
 * - Image zoom and pan functionality
 * - Mouse wheel zoom (Ctrl/Cmd + scroll)
 * - Touch pinch zoom for mobile devices
 * - Zoom controls (zoom in, zoom out, reset)
 *
 * ## Usage
 *
 * ```tsx
 * import { Lightbox } from '@/components/Lightbox';
 *
 * <Lightbox
 *   isOpen={isOpen}
 *   image={imageData}
 *   onClose={() => setIsOpen(false)}
 *   albumContext={albumImages}
 *   albumId={albumId}
 *   onNext={navigateToNext}
 *   onPrevious={navigateToPrevious}
 * />
 * ```
 *
 * ## Keyboard Shortcuts
 *
 * - `Escape` - Close modal
 * - `Tab` - Navigate between focusable elements within modal
 * - `Enter` or `Space` - Activate close button
 * - `ArrowLeft` - Navigate to previous image (when navigation available)
 * - `ArrowRight` - Navigate to next image (when navigation available)
 * - `Ctrl/Cmd + Mouse Wheel` - Zoom in/out
 * - `Mouse Drag` - Pan when zoomed
 * - `Touch Pinch` - Zoom on mobile devices
 * - `Touch Drag` - Pan on mobile devices
 *
 * @module frontend/src/components/Lightbox
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Image } from '@/types';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import { useImagePreload } from '@/hooks/useImagePreload';
import { useImageZoom } from '@/hooks/useImageZoom';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import './Lightbox.css';

/**
 * Props for Lightbox component
 */
export interface LightboxProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Image data to display */
  image: Image | null;
  /** Callback function when modal should close */
  onClose: () => void;
  /** Optional CSS class name */
  className?: string;
  /** Optional array of images in album context for navigation */
  albumContext?: Image[];
  /** Optional album ID for navigation context */
  albumId?: number | null;
  /** Optional callback function for next image navigation */
  onNext?: () => void;
  /** Optional callback function for previous image navigation */
  onPrevious?: () => void;
}

/**
 * Lightbox component
 *
 * Displays a full-screen image in an accessible modal overlay with focus trap,
 * keyboard support, and ARIA attributes for screen readers.
 *
 * @param props - Component props
 * @returns React component
 */
export function Lightbox({
  isOpen,
  image,
  onClose,
  className,
  albumContext = [],
  albumId = null,
  onNext,
  onPrevious,
}: LightboxProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const thumbnailImgRef = useRef<HTMLImageElement>(null);
  const fullImgRef = useRef<HTMLImageElement>(null);
  const [domFullImageLoaded, setDomFullImageLoaded] = useState(false);

  // Use progressive image loading hook
  const progressiveImage = useProgressiveImage(image, true);

  // Drag state for pan
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startPanX: number;
    startPanY: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startPanX: 0,
    startPanY: 0,
  });

  // Touch state for pinch zoom
  const touchStateRef = useRef<{
    touches: Map<number, { x: number; y: number }>;
    initialDistance: number;
    initialZoom: number;
    initialPan: { x: number; y: number };
  }>({
    touches: new Map(),
    initialDistance: 0,
    initialZoom: 100,
    initialPan: { x: 0, y: 0 },
  });

  // Use image navigation hook for next/previous functionality
  const navigation = useImageNavigation(albumContext, image?.id || null);

  // Preload adjacent images for smooth navigation (uses full image URLs)
  useImagePreload(image, albumContext);

  // Get image dimensions for zoom
  const imageWidth = image?.width || 0;
  const imageHeight = image?.height || 0;

  // Get container dimensions for zoom calculations
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });

  // Update container dimensions
  useEffect(() => {
    if (!imageContainerRef.current) {
      return;
    }

    const updateDimensions = () => {
      if (imageContainerRef.current) {
        const rect = imageContainerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isOpen]);

  // Use zoom hook
  const zoom = useImageZoom(
    imageWidth,
    imageHeight,
    containerDimensions.width,
    containerDimensions.height,
  );

  // Determine if navigation is available
  const canNavigate = useMemo(() => {
    return albumContext.length > 1 && (navigation.hasNext || navigation.hasPrevious);
  }, [albumContext.length, navigation.hasNext, navigation.hasPrevious]);

  // Generate alt text from image title or description
  const altText = useMemo(() => {
    if (!image) {
      return 'Image';
    }
    return image.title || image.description || 'Image';
  }, [image]);

  // Format date from timestamp
  const formattedDate = useMemo(() => {
    if (!image || !image.timestamp) {
      return null;
    }
    try {
      const date = new Date(image.timestamp * 1000);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }, [image]);

  // Format dimensions
  const dimensions = useMemo(() => {
    if (!image || !image.width || !image.height) {
      return null;
    }
    return `${image.width} × ${image.height}`;
  }, [image]);

  // Calculate image counter text (1-based for display)
  const imageCounter = useMemo(() => {
    // Don't show counter for single image or empty context
    if (albumContext.length <= 1) {
      return null;
    }
    // Don't show counter if current image is not found in context
    if (navigation.currentIndex < 0) {
      return null;
    }
    const currentPosition = navigation.currentIndex + 1;
    const total = navigation.totalImages;
    // Ensure we have valid values
    if (total > 0 && currentPosition > 0) {
      return `${currentPosition} of ${total}`;
    }
    return null;
  }, [albumContext.length, navigation.currentIndex, navigation.totalImages]);

  // Determine loading and error states from progressive image hook
  const isLoading = progressiveImage.state === 'thumbnail' || progressiveImage.state === 'thumbnail-loaded';
  const isFullLoaded = progressiveImage.state === 'full-loaded';
  const hasError = progressiveImage.hasError;

  // Reset DOM image load state when image changes
  useEffect(() => {
    if (image) {
      setDomFullImageLoaded(false);
    }
  }, [image?.id, image?.pathComponent]);

  // Reset zoom when image ID changes (separate effect to avoid dependency issues)
  useEffect(() => {
    if (isOpen && image && image.id !== undefined) {
      zoom.resetZoom();
    }
  }, [isOpen, image?.id, zoom.resetZoom]);

  // Handle body scroll lock when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Store original overflow style
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Restore on cleanup
      return () => {
        // Only restore if body element still exists
        if (document.body) {
          document.body.style.overflow = originalOverflow;
        }
      };
    }
  }, [isOpen]);

  // Handle focus trap and focus management
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // Store the element that had focus before modal opened
    previousActiveElementRef.current =
      (document.activeElement as HTMLElement) || null;

    // Focus the close button when modal opens
    const timer = setTimeout(() => {
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }
    }, 0);

    // Handle focus trap - keep focus within modal
    const handleFocusTrap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const modal = modalRef.current;
      if (!modal) {
        return;
      }

      // Find all focusable elements within modal
      const focusableElements = modal.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      // If Shift+Tab on first element, focus last element
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable?.focus();
      }
      // If Tab on last element, focus first element
      else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable?.focus();
      }
    };

    document.addEventListener('keydown', handleFocusTrap);

    // Cleanup
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', handleFocusTrap);

      // Restore focus to previous element when modal closes
      if (previousActiveElementRef.current) {
        try {
          // Check if element is still in the DOM and focusable
          if (
            document.body.contains(previousActiveElementRef.current) &&
            typeof previousActiveElementRef.current.focus === 'function'
          ) {
            previousActiveElementRef.current.focus();
          }
        } catch (error) {
          // Silently fail if focus restoration fails (element may be removed from DOM)
        }
      }
    };
  }, [isOpen]);

  // Handle Escape key to close modal and arrow keys for navigation
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowRight' && onNext && navigation.hasNext) {
        event.preventDefault();
        onNext();
      } else if (event.key === 'ArrowLeft' && onPrevious && navigation.hasPrevious) {
        event.preventDefault();
        onPrevious();
      }
    };

    document.addEventListener('keydown', handleKeyboard);

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
    };
  }, [isOpen, onClose, onNext, onPrevious, navigation.hasNext, navigation.hasPrevious]);

  // Handle mouse wheel zoom (Ctrl/Cmd + scroll)
  useEffect(() => {
    if (!isOpen || !imageContainerRef.current) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      // Only zoom if Ctrl (Windows/Linux) or Cmd (Mac) is pressed
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }

      event.preventDefault();

      // Get mouse position relative to image container
      const rect = imageContainerRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const centerX = event.clientX - rect.left;
      const centerY = event.clientY - rect.top;

      // Get current zoom state
      const currentZoom = zoom.zoom;

      // Calculate zoom delta from wheel delta
      const zoomDelta = -event.deltaY * 0.5; // Adjust sensitivity
      const newZoom = Math.max(
        100,
        Math.min(400, currentZoom + zoomDelta),
      );

      zoom.setZoom(newZoom, centerX, centerY);
    };

    const container = imageContainerRef.current;
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [isOpen, zoom.zoom, zoom.setZoom]);

  // Handle mouse drag pan
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      // Only pan if zoomed
      if (!zoom.isZoomed) {
        return;
      }

      // Don't start drag if clicking on buttons or other controls
      if (
        (event.target as HTMLElement).closest('button') ||
        (event.target as HTMLElement).closest('.lightbox-counter')
      ) {
        return;
      }

      event.preventDefault();
      dragStateRef.current = {
        isDragging: true,
        startX: event.clientX,
        startY: event.clientY,
        startPanX: zoom.pan.x,
        startPanY: zoom.pan.y,
      };

      // Change cursor to grabbing
      if (imageContainerRef.current) {
        imageContainerRef.current.style.cursor = 'grabbing';
      }
    },
    [zoom.isZoomed, zoom.pan],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!dragStateRef.current.isDragging) {
        return;
      }

      event.preventDefault();

      const deltaX = event.clientX - dragStateRef.current.startX;
      const deltaY = event.clientY - dragStateRef.current.startY;

      zoom.setPan(
        dragStateRef.current.startPanX + deltaX,
        dragStateRef.current.startPanY + deltaY,
      );
    },
    [zoom],
  );

  const handleMouseUp = useCallback(() => {
    if (dragStateRef.current.isDragging) {
      dragStateRef.current.isDragging = false;
      if (imageContainerRef.current) {
        imageContainerRef.current.style.cursor = zoom.isZoomed ? 'grab' : 'default';
      }
    }
  }, [zoom.isZoomed]);

  // Add mouse event listeners for pan
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isOpen, handleMouseMove, handleMouseUp]);

  // Handle touch events for pinch zoom and pan
  const handleTouchStart = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touches = Array.from(event.touches);

      if (touches.length === 1) {
        // Single touch - pan
        if (!zoom.isZoomed) {
          return;
        }

        event.preventDefault();
        const touch = touches[0];
        dragStateRef.current = {
          isDragging: true,
          startX: touch.clientX,
          startY: touch.clientY,
          startPanX: zoom.pan.x,
          startPanY: zoom.pan.y,
        };
      } else if (touches.length === 2) {
        // Two touches - pinch zoom
        event.preventDefault();

        const touch1 = touches[0];
        const touch2 = touches[1];

        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );

        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;

        const rect = imageContainerRef.current?.getBoundingClientRect();
        if (rect) {
          touchStateRef.current = {
            touches: new Map([
              [touch1.identifier, { x: touch1.clientX, y: touch1.clientY }],
              [touch2.identifier, { x: touch2.clientX, y: touch2.clientY }],
            ]),
            initialDistance: distance,
            initialZoom: zoom.zoom,
            initialPan: { ...zoom.pan },
          };
        }
      }
    },
    [zoom.isZoomed, zoom.pan, zoom.zoom],
  );

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const touches = Array.from(event.touches);

      if (touches.length === 1 && dragStateRef.current.isDragging) {
        // Single touch pan
        event.preventDefault();
        const touch = touches[0];
        const deltaX = touch.clientX - dragStateRef.current.startX;
        const deltaY = touch.clientY - dragStateRef.current.startY;

        zoom.setPan(
          dragStateRef.current.startPanX + deltaX,
          dragStateRef.current.startPanY + deltaY,
        );
      } else if (touches.length === 2) {
        // Two touch pinch zoom
        event.preventDefault();

        const touch1 = touches[0];
        const touch2 = touches[1];

        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY,
        );

        if (touchStateRef.current.initialDistance > 0) {
          const scale = distance / touchStateRef.current.initialDistance;
          const newZoom = Math.max(
            100,
            Math.min(400, touchStateRef.current.initialZoom * scale),
          );

          const centerX = (touch1.clientX + touch2.clientX) / 2;
          const centerY = (touch1.clientY + touch2.clientY) / 2;

          const rect = imageContainerRef.current?.getBoundingClientRect();
          if (rect) {
            const relativeX = centerX - rect.left;
            const relativeY = centerY - rect.top;
            zoom.setZoom(newZoom, relativeX, relativeY);
          }
        }
      }
    },
    [zoom.setPan, zoom.setZoom],
  );

  const handleTouchEnd = useCallback(() => {
    dragStateRef.current.isDragging = false;
    touchStateRef.current = {
      touches: new Map(),
      initialDistance: 0,
      initialZoom: 100,
      initialPan: { x: 0, y: 0 },
    };
  }, []);

  const handleTouchCancel = useCallback(() => {
    dragStateRef.current.isDragging = false;
    touchStateRef.current = {
      touches: new Map(),
      initialDistance: 0,
      initialZoom: 100,
      initialPan: { x: 0, y: 0 },
    };
  }, []);

  // Calculate image transform style
  const imageTransform = useMemo(() => {
    if (!zoom.isZoomed) {
      return undefined;
    }
    return `scale(${zoom.zoom / 100}) translate(${zoom.pan.x}px, ${zoom.pan.y}px)`;
  }, [zoom.zoom, zoom.pan, zoom.isZoomed]);

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

  // Handle backdrop click (close modal if clicking backdrop, not content)
  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  // Handle close button click
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle close button keyboard events
  const handleCloseKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClose();
      }
    },
    [onClose],
  );

  // Don't render if modal is closed or no image
  if (!isOpen || !image) {
    return null;
  }

  // Determine if metadata section exists for ARIA attributes
  const hasMetadata =
    image.title ||
    image.description ||
    dimensions ||
    formattedDate;

  return (
    <div
      className={className ? `lightbox-overlay ${className}` : 'lightbox-overlay'}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={image.title ? 'lightbox-title' : undefined}
      aria-describedby={hasMetadata ? 'lightbox-metadata' : undefined}
      aria-label={!image.title ? altText : undefined}
    >
      <div className="lightbox-container" ref={modalRef}>
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          className="lightbox-close"
          onClick={handleClose}
          onKeyDown={handleCloseKeyDown}
          aria-label="Close image viewer"
          type="button"
        >
          <span className="lightbox-close-icon" aria-hidden="true">
            ×
          </span>
        </button>

        {/* Navigation Buttons */}
        {canNavigate && onNext && onPrevious && (
          <>
            <button
              className="lightbox-nav lightbox-nav-previous"
              onClick={onPrevious}
              disabled={!navigation.hasPrevious}
              aria-label="Previous image"
              type="button"
            >
              <span className="lightbox-nav-icon" aria-hidden="true">
                ‹
              </span>
            </button>
            <button
              className="lightbox-nav lightbox-nav-next"
              onClick={onNext}
              disabled={!navigation.hasNext}
              aria-label="Next image"
              type="button"
            >
              <span className="lightbox-nav-icon" aria-hidden="true">
                ›
              </span>
            </button>
          </>
        )}

        {/* Zoom Controls */}
        <div className="lightbox-zoom-controls">
          <button
            className="lightbox-zoom-btn lightbox-zoom-in"
            onClick={() => zoom.zoomIn()}
            disabled={!zoom.canZoomIn}
            aria-label="Zoom in"
            type="button"
          >
            <span className="lightbox-zoom-icon" aria-hidden="true">
              +
            </span>
          </button>
          <button
            className="lightbox-zoom-btn lightbox-zoom-out"
            onClick={() => zoom.zoomOut()}
            disabled={!zoom.canZoomOut}
            aria-label="Zoom out"
            type="button"
          >
            <span className="lightbox-zoom-icon" aria-hidden="true">
              −
            </span>
          </button>
          {zoom.isZoomed && (
            <button
              className="lightbox-zoom-btn lightbox-zoom-reset"
              onClick={() => zoom.resetZoom()}
              aria-label="Reset zoom"
              type="button"
            >
              <span className="lightbox-zoom-icon" aria-hidden="true">
                ↻
              </span>
            </button>
          )}
        </div>

        {/* Image Container */}
        <div
          className="lightbox-image-container"
          ref={imageContainerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchCancel}
          style={{
            cursor: zoom.isZoomed ? 'grab' : 'default',
          }}
        >
          {hasError ? (
            <div className="lightbox-error" role="img" aria-label={altText}>
              <span className="lightbox-error-icon" aria-hidden="true">
                📷
              </span>
              <span className="lightbox-error-text">Image unavailable</span>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="lightbox-loading" aria-hidden="true">
                  <div className="lightbox-skeleton" />
                </div>
              )}
              {/* Thumbnail image (blurred background) */}
              {progressiveImage.thumbnailUrl && (
                <img
                  ref={thumbnailImgRef}
                  src={progressiveImage.thumbnailUrl}
                  alt=""
                  className="lightbox-image lightbox-image-thumb"
                  onLoad={handleThumbnailLoad}
                  onError={handleImageError}
                  loading="eager"
                  decoding="async"
                  aria-hidden="true"
                />
              )}
              {/* Full image (fades in when loaded) */}
              {isFullLoaded && progressiveImage.fullImageUrl && (
                <img
                  ref={fullImgRef}
                  src={progressiveImage.fullImageUrl}
                  alt={altText}
                  className={`lightbox-image lightbox-image-full ${!domFullImageLoaded ? 'lightbox-image-loading' : ''}`}
                  onLoad={handleFullImageLoad}
                  onError={handleImageError}
                  loading="eager"
                  decoding="async"
                  style={{
                    transform: imageTransform,
                    transformOrigin: 'center center',
                  }}
                />
              )}
            </>
          )}
          {/* Image Counter */}
          {imageCounter && (
            <div className="lightbox-counter" aria-label={`Image ${imageCounter}`}>
              {imageCounter}
            </div>
          )}
        </div>

        {/* Metadata Section */}
        {(image.title ||
          image.description ||
          dimensions ||
          formattedDate) && (
          <div className="lightbox-metadata" id="lightbox-metadata">
            {image.title && (
              <h2 className="lightbox-title" id="lightbox-title">
                {image.title}
              </h2>
            )}
            {image.description && (
              <p className="lightbox-description">{image.description}</p>
            )}
            <div className="lightbox-details">
              {dimensions && (
                <span className="lightbox-dimensions">{dimensions}</span>
              )}
              {formattedDate && (
                <span className="lightbox-date">{formattedDate}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Lightbox;
