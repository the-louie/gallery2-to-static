/**
 * ImageThumbnail Component Tests
 *
 * Comprehensive tests for the ImageThumbnail component covering rendering,
 * lazy loading, error handling, aspect ratio, accessibility, and integration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { ImageThumbnail } from './ImageThumbnail';
import type { Image } from '@/types';
import { mockPhoto, mockPhotoNoThumb } from '@/__mocks__/mockData';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';

vi.mock('@/hooks/useProgressiveImage');

describe('ImageThumbnail', () => {
  let mockIntersectionObserver: {
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
  };

  /** Helper: trigger the IO callback with isIntersecting: true, wrapped in act(). */
  function triggerIntersection() {
    const callback = (mockIntersectionObserver as any).callback;
    const container = document.querySelector('.image-thumbnail-container');
    if (callback && container) {
      act(() => {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      });
    }
  }

  /** Set up the default (non-error) useProgressiveImage mock return value. */
  function setupDefaultProgressiveMock(image?: any) {
    const img = image || mockPhoto;
    const thumbPath = img.thumbnailUrlPath || img.pathComponent || '';
    const fullPath = img.urlPath || img.pathComponent || '';
    vi.mocked(useProgressiveImage).mockReturnValue({
      thumbnailUrl: thumbPath ? `/g2data/thumbnails/${thumbPath}` : '',
      fullImageUrl: fullPath ? `/g2data/albums/${fullPath}` : '',
      state: fullPath ? 'full-loaded' : 'thumbnail',
      hasError: false,
      error: null,
    });
  }

  beforeEach(() => {
    // Mock Intersection Observer
    mockIntersectionObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
      unobserve: vi.fn(),
    };

    global.IntersectionObserver = vi.fn(
      (
        callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit,
      ) => {
        // Store callback for manual triggering
        (mockIntersectionObserver as any).callback = callback;
        (mockIntersectionObserver as any).options = options;
        return mockIntersectionObserver as any;
      },
    ) as any;

    // Default progressive image mock (non-error state, full-loaded)
    setupDefaultProgressiveMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders image with correct src', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute(
          'src',
          `/g2data/albums/${mockPhoto.pathComponent}`,
        );
      });
    });

    it('renders with thumbnail URL when useThumbnail is true', async () => {
      render(<ImageThumbnail image={mockPhoto} useThumbnail={true} />);
      triggerIntersection();

      await waitFor(() => {
        // Grid mode (PERF-01): only the thumbnail is shown, and it carries the alt text
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute(
          'src',
          `/g2data/thumbnails/${mockPhoto.pathComponent}`,
        );
      });
      expect(document.querySelector('.image-thumbnail-full')).toBeNull();
    });

    it('asks the hook for the thumbnail only, and only once visible, when useThumbnail is true', async () => {
      const { useProgressiveImage } = await import('@/hooks/useProgressiveImage');
      render(<ImageThumbnail image={mockPhoto} useThumbnail={true} />);
      const calls = vi.mocked(useProgressiveImage).mock.calls;
      expect(calls[calls.length - 1][2]).toEqual({ loadFull: false, enabled: false });
      triggerIntersection();
      await waitFor(() => {
        const last = vi.mocked(useProgressiveImage).mock.calls.at(-1)!;
        expect(last[2]).toEqual({ loadFull: false, enabled: true });
      });
    });

    it('renders with full image URL when useThumbnail is false', async () => {
      render(<ImageThumbnail image={mockPhoto} useThumbnail={false} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute(
          'src',
          `/g2data/albums/${mockPhoto.pathComponent}`,
        );
      });
    });

    it('applies custom className', () => {
      const { container } = render(
        <ImageThumbnail image={mockPhoto} className="custom-class" />,
      );
      const containerEl = container.querySelector('.image-thumbnail-container');
      expect(containerEl).toHaveClass('custom-class');
    });

    it('renders with correct alt text from image title', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toBeInTheDocument();
      });
    });

    it('renders with custom alt text when provided', async () => {
      render(<ImageThumbnail image={mockPhoto} alt="Custom alt text" />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Custom alt text');
        expect(img).toBeInTheDocument();
      });
    });

    it('renders with description as alt text when title is missing', async () => {
      const imageWithoutTitle: Image = {
        ...mockPhoto,
        title: '',
        description: 'Test description',
      };
      render(<ImageThumbnail image={imageWithoutTitle} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test description');
        expect(img).toBeInTheDocument();
      });
    });

    it('renders aspect ratio container', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector(
        '.image-thumbnail-container',
      ) as HTMLElement;
      expect(containerEl).toBeInTheDocument();
      // aspectRatio is set via inline style; jsdom exposes it on style attribute
      expect(containerEl.style.aspectRatio).toBeTruthy();
    });

    it('calls onClick when image is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<ImageThumbnail image={mockPhoto} onClick={handleClick} />);

      const container = screen.getByRole('button');
      await user.click(container);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockPhoto);
    });
  });

  describe('Lazy Loading', () => {
    it('sets up Intersection Observer on mount', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      expect(global.IntersectionObserver).toHaveBeenCalled();
      expect(mockIntersectionObserver.observe).toHaveBeenCalled();
    });

    it('creates observer with rootMargin aligned to VirtualGrid (400px)', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      expect(global.IntersectionObserver).toHaveBeenCalled();
      const options = (mockIntersectionObserver as any).options;
      expect(options).toBeDefined();
      expect(options.rootMargin).toContain('400px');
    });

    it('loads image after fallback delay when observer never fires', async () => {
      vi.useFakeTimers();
      render(<ImageThumbnail image={mockPhoto} />);
      expect(screen.queryByAltText('Test Photo')).not.toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(350);
      });

      expect(screen.getByAltText('Test Photo')).toBeInTheDocument();
      vi.useRealTimers();
    });

    it('does not load image when not in viewport', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      // Image should not be rendered until intersection
      const img = screen.queryByAltText('Test Photo');
      expect(img).not.toBeInTheDocument();
    });

    it('loads image when intersection occurs', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      triggerIntersection();

      // Image should now be rendered
      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toBeInTheDocument();
      });
    });

    it('cleans up observer on unmount', () => {
      const { unmount } = render(<ImageThumbnail image={mockPhoto} />);
      unmount();
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
    });

    it('uses native loading="lazy" attribute', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute('loading', 'lazy');
      });
    });

    it('loads immediately when Intersection Observer is not supported', () => {
      // Temporarily remove IntersectionObserver
      const originalIO = global.IntersectionObserver;
      delete (global as any).IntersectionObserver;

      render(<ImageThumbnail image={mockPhoto} />);
      const img = screen.getByAltText('Test Photo');
      expect(img).toBeInTheDocument();

      // Restore IntersectionObserver
      global.IntersectionObserver = originalIO;
    });
  });

  describe('Error Handling', () => {
    it('displays error placeholder on image load error', () => {
      // Override the global mock to return an error state
      vi.mocked(useProgressiveImage).mockReturnValue({
        thumbnailUrl: '',
        fullImageUrl: '',
        state: 'error',
        hasError: true,
        error: 'Load failed',
      });

      render(<ImageThumbnail image={mockPhoto} />);

      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });

    it('handles missing image gracefully', () => {
      vi.mocked(useProgressiveImage).mockReturnValue({
        thumbnailUrl: '',
        fullImageUrl: '',
        state: 'error',
        hasError: true,
        error: 'Load failed',
      });

      render(<ImageThumbnail image={mockPhoto} />);

      const errorPlaceholder = screen.getByText('Image unavailable');
      expect(errorPlaceholder).toBeInTheDocument();
      expect(
        errorPlaceholder.closest('.image-thumbnail-error'),
      ).toHaveAttribute('role', 'img');
    });

    it('error state is accessible', () => {
      vi.mocked(useProgressiveImage).mockReturnValue({
        thumbnailUrl: '',
        fullImageUrl: '',
        state: 'error',
        hasError: true,
        error: 'Load failed',
      });

      render(<ImageThumbnail image={mockPhoto} />);

      const errorElement = screen.getByRole('img', { name: 'Test Photo' });
      expect(errorElement).toBeInTheDocument();
    });
  });

  describe('Aspect Ratio', () => {
    it('applies correct aspect ratio from dimensions', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector(
        '.image-thumbnail-container',
      ) as HTMLElement;
      // mockPhoto has width: 1920, height: 1080, so aspect ratio should be ~1.777
      expect(containerEl.style.aspectRatio).toBeTruthy();
      expect(parseFloat(containerEl.style.aspectRatio)).toBeCloseTo(
        1920 / 1080,
        2,
      );
    });

    it('handles null dimensions gracefully', () => {
      const { container } = render(
        <ImageThumbnail image={mockPhotoNoThumb} />,
      );
      const containerEl = container.querySelector(
        '.image-thumbnail-container',
      ) as HTMLElement;
      // Should use default aspect ratio when dimensions are null
      expect(containerEl).toBeInTheDocument();
      expect(containerEl.style.aspectRatio).toBeTruthy();
    });

    it('uses thumbnail dimensions when useThumbnail is true', () => {
      const { container } = render(
        <ImageThumbnail image={mockPhoto} useThumbnail={true} />,
      );
      const containerEl = container.querySelector(
        '.image-thumbnail-container',
      ) as HTMLElement;
      // mockPhoto has thumb_width: 200, thumb_height: 150, so aspect ratio should be ~1.333
      expect(containerEl).toBeInTheDocument();
      expect(containerEl.style.aspectRatio).toBeTruthy();
      expect(parseFloat(containerEl.style.aspectRatio)).toBeCloseTo(
        200 / 150,
        2,
      );
    });

    it('prevents layout shift by setting aspect ratio before image loads', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector(
        '.image-thumbnail-container',
      ) as HTMLElement;

      // Aspect ratio should be set immediately, even before image loads
      expect(containerEl).toBeInTheDocument();
      expect(containerEl.style.aspectRatio).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      triggerIntersection();

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute('alt', 'Test Photo');
      });
    });

    it('is keyboard accessible when onClick provided', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<ImageThumbnail image={mockPhoto} onClick={handleClick} />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('tabIndex', '0');

      await user.tab();
      expect(button).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });

    it('has focus states', () => {
      render(
        <ImageThumbnail image={mockPhoto} onClick={() => {}} />,
      );
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('error state has ARIA attributes', () => {
      vi.mocked(useProgressiveImage).mockReturnValue({
        thumbnailUrl: '',
        fullImageUrl: '',
        state: 'error',
        hasError: true,
        error: 'Load failed',
      });

      render(<ImageThumbnail image={mockPhoto} />);

      const errorElement = screen.getByRole('img', { name: 'Test Photo' });
      expect(errorElement).toHaveAttribute('aria-label', 'Test Photo');
    });
  });

  describe('Integration', () => {
    it('integrates with Image type correctly', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      // Component renders; before intersection the skeleton loading placeholder is shown
      const containerEl = document.querySelector('.image-thumbnail-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('works with different image data structures', () => {
      const portraitImage: Image = {
        ...mockPhoto,
        width: 1080,
        height: 1920,
        thumb_width: 150,
        thumb_height: 200,
      };
      render(<ImageThumbnail image={portraitImage} />);
      const containerEl = document.querySelector('.image-thumbnail-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('handles edge cases from real data', () => {
      // Test with image without thumbnail
      render(<ImageThumbnail image={mockPhotoNoThumb} />);
      const containerEl = document.querySelector('.image-thumbnail-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('works with mock data from __mocks__', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = document.querySelector('.image-thumbnail-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('resets state when image prop changes', async () => {
      // Start with error state for first image
      vi.mocked(useProgressiveImage).mockReturnValue({
        thumbnailUrl: '',
        fullImageUrl: '',
        state: 'error',
        hasError: true,
        error: 'Load failed',
      });

      const { rerender } = render(<ImageThumbnail image={mockPhoto} />);

      expect(screen.getByText('Image unavailable')).toBeInTheDocument();

      // Change to a different image and reset the mock to non-error state
      const newImage: Image = {
        ...mockPhoto,
        id: 999,
        pathComponent: 'different/path.jpg',
        title: 'New Photo',
      };
      setupDefaultProgressiveMock(newImage);
      rerender(<ImageThumbnail image={newImage} />);

      // State should be reset - error should be gone
      await waitFor(() => {
        expect(
          screen.queryByText('Image unavailable'),
        ).not.toBeInTheDocument();
      });
    });

    it('cleans up observer when image prop changes', () => {
      const { rerender } = render(<ImageThumbnail image={mockPhoto} />);

      // Verify observer was created
      expect(mockIntersectionObserver.observe).toHaveBeenCalled();

      // Change image
      const newImage: Image = {
        ...mockPhoto,
        id: 999,
        pathComponent: 'different/path.jpg',
      };
      rerender(<ImageThumbnail image={newImage} />);

      // Observer should be disconnected when image changes
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
    });

    it('cleans up observer when useThumbnail prop changes', () => {
      const { rerender } = render(
        <ImageThumbnail image={mockPhoto} useThumbnail={false} />,
      );

      // Verify observer was created
      expect(mockIntersectionObserver.observe).toHaveBeenCalled();
      const initialCallCount =
        mockIntersectionObserver.disconnect.mock.calls.length;

      // Change useThumbnail
      rerender(<ImageThumbnail image={mockPhoto} useThumbnail={true} />);

      // Observer should be disconnected when prop changes
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(
        initialCallCount + 1,
      );
    });

    it('disconnects observer after intersection occurs', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      const initialDisconnectCount =
        mockIntersectionObserver.disconnect.mock.calls.length;

      triggerIntersection();

      // Observer should be disconnected after intersection
      await waitFor(() => {
        expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(
          initialDisconnectCount + 1,
        );
      });
    });
  });

  describe('Layout', () => {
    it('renders in grid layout by default', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const imageContainer = container.querySelector(
        '.image-thumbnail-container',
      );
      expect(imageContainer).toHaveClass('image-thumbnail-grid');
    });
  });

  describe('Interaction', () => {
    it('maintains accessibility when clickable', () => {
      render(<ImageThumbnail image={mockPhoto} onClick={() => {}} />);
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-label');
    });

    it('maintains interaction when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<ImageThumbnail image={mockPhoto} onClick={handleClick} />);

      triggerIntersection();

      await waitFor(() => {
        expect(screen.getByRole('button')).toBeInTheDocument();
      });

      const button = screen.getByRole('button');
      await user.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockPhoto);
    });
  });
});
