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
 *
 * @module frontend/src/components/Lightbox
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { Image } from '@/types';
import { getImageUrl } from '@/utils/imageUrl';
import { useImageNavigation } from '@/hooks/useImageNavigation';
import { useImagePreload } from '@/hooks/useImagePreload';
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Use image navigation hook for next/previous functionality
  const navigation = useImageNavigation(albumContext, image?.id || null);

  // Preload adjacent images for smooth navigation
  useImagePreload(image, albumContext);

  // Determine if navigation is available
  const canNavigate = useMemo(() => {
    return albumContext.length > 1 && (navigation.hasNext || navigation.hasPrevious);
  }, [albumContext.length, navigation.hasNext, navigation.hasPrevious]);

  // Get full-size image URL
  const imageUrl = useMemo(() => {
    if (!image) {
      return '';
    }
    return getImageUrl(image, false);
  }, [image]);

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

  // Reset state when image changes or modal closes
  useEffect(() => {
    if (isOpen && image) {
      setIsLoading(true);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(false);
    }
  }, [isOpen, image]);

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

  // Handle image load
  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
  }, []);

  // Handle image error
  const handleImageError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
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

        {/* Image Container */}
        <div className="lightbox-image-container">
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
              <img
                src={imageUrl}
                alt={altText}
                className={`lightbox-image ${isLoading ? 'lightbox-image-loading' : ''}`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="eager"
                decoding="async"
              />
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
