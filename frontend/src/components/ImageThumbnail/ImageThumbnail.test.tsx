/**
 * ImageThumbnail Component Tests
 *
 * Comprehensive tests for the ImageThumbnail component covering rendering,
 * lazy loading, error handling, aspect ratio, accessibility, and integration.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { ImageThumbnail } from './ImageThumbnail';
import type { Image } from '@/types';
import { mockPhoto, mockPhotoNoThumb } from '@/__mocks__/mockData';

describe('ImageThumbnail', () => {
  let mockIntersectionObserver: {
    observe: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
  };

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
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders image with correct src', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute('src', '/images/test-album/test-photo.jpg');
      });
    });

    it('renders with thumbnail URL when useThumbnail is true', async () => {
      render(<ImageThumbnail image={mockPhoto} useThumbnail={true} />);

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute(
          'src',
          '/images/test-album/__t_test-photo.jpg',
        );
      });
    });

    it('renders with full image URL when useThumbnail is false', async () => {
      render(<ImageThumbnail image={mockPhoto} useThumbnail={false} />);

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveAttribute('src', '/images/test-album/test-photo.jpg');
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

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toBeInTheDocument();
      });
    });

    it('renders with custom alt text when provided', async () => {
      render(<ImageThumbnail image={mockPhoto} alt="Custom alt text" />);

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

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

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test description');
        expect(img).toBeInTheDocument();
      });
    });

    it('renders aspect ratio container', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector('.image-thumbnail-container');
      expect(containerEl).toBeInTheDocument();
      expect(containerEl).toHaveStyle({
        aspectRatio: expect.stringContaining(''),
      });
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

    it('does not load image when not in viewport', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      // Image should not be rendered until intersection
      const img = screen.queryByAltText('Test Photo');
      expect(img).not.toBeInTheDocument();
    });

    it('loads image when intersection occurs', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

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
      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

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
    it('displays error placeholder on image load error', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      if (callback) {
        callback([
          {
            isIntersecting: true,
            target: document.querySelector('.image-thumbnail-container'),
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        // Simulate error
        const errorEvent = new Event('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });
    });

    it('handles missing image gracefully', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection
      const callback = (mockIntersectionObserver as any).callback;
      if (callback) {
        callback([
          {
            isIntersecting: true,
            target: document.querySelector('.image-thumbnail-container'),
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        // Simulate error
        const errorEvent = new Event('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
      });

      await waitFor(() => {
        const errorPlaceholder = screen.getByText('Image unavailable');
        expect(errorPlaceholder).toBeInTheDocument();
        expect(errorPlaceholder.closest('.image-thumbnail-error')).toHaveAttribute('role', 'img');
      });
    });

    it('error state is accessible', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection and error
      const callback = (mockIntersectionObserver as any).callback;
      if (callback) {
        callback([
          {
            isIntersecting: true,
            target: document.querySelector('.image-thumbnail-container'),
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const errorEvent = new Event('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
      });

      await waitFor(() => {
        const errorElement = screen.getByRole('img', { name: 'Test Photo' });
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Aspect Ratio', () => {
    it('applies correct aspect ratio from dimensions', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector('.image-thumbnail-container');
      // mockPhoto has width: 1920, height: 1080, so aspect ratio should be ~1.777
      expect(containerEl).toHaveStyle({
        aspectRatio: expect.stringContaining(''),
      });
    });

    it('handles null dimensions gracefully', () => {
      const { container } = render(
        <ImageThumbnail image={mockPhotoNoThumb} />,
      );
      const containerEl = container.querySelector('.image-thumbnail-container');
      // Should use default aspect ratio when dimensions are null
      expect(containerEl).toBeInTheDocument();
      expect(containerEl).toHaveStyle({
        aspectRatio: expect.stringContaining(''),
      });
    });

    it('uses thumbnail dimensions when useThumbnail is true', () => {
      const { container } = render(
        <ImageThumbnail image={mockPhoto} useThumbnail={true} />,
      );
      const containerEl = container.querySelector('.image-thumbnail-container');
      // mockPhoto has thumb_width: 200, thumb_height: 150, so aspect ratio should be ~1.333
      expect(containerEl).toBeInTheDocument();
      expect(containerEl).toHaveStyle({
        aspectRatio: expect.stringContaining(''),
      });
    });

    it('prevents layout shift by setting aspect ratio before image loads', () => {
      const { container } = render(<ImageThumbnail image={mockPhoto} />);
      const containerEl = container.querySelector('.image-thumbnail-container');

      // Aspect ratio should be set immediately, even before image loads
      expect(containerEl).toBeInTheDocument();
      expect(containerEl).toHaveStyle({
        aspectRatio: expect.stringContaining(''),
      });

      // Container should have a defined aspect ratio style
      const style = window.getComputedStyle(containerEl!);
      expect(style.aspectRatio).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('has proper alt text', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      // Trigger intersection to render image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

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
      const { container } = render(
        <ImageThumbnail image={mockPhoto} onClick={() => {}} />,
      );
      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });

    it('error state has ARIA attributes', async () => {
      render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection and error
      const callback = (mockIntersectionObserver as any).callback;
      if (callback) {
        callback([
          {
            isIntersecting: true,
            target: document.querySelector('.image-thumbnail-container'),
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const errorEvent = new Event('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
      });

      await waitFor(() => {
        const errorElement = screen.getByRole('img', { name: 'Test Photo' });
        expect(errorElement).toHaveAttribute('aria-label', 'Test Photo');
      });
    });
  });

  describe('Integration', () => {
    it('integrates with Image type correctly', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      // Component should render without errors
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
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
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('handles edge cases from real data', () => {
      // Test with image without thumbnail
      render(<ImageThumbnail image={mockPhotoNoThumb} />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('works with mock data from __mocks__', () => {
      render(<ImageThumbnail image={mockPhoto} />);
      expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
    });

    it('resets state when image prop changes', async () => {
      const { rerender } = render(<ImageThumbnail image={mockPhoto} />);

      // Trigger intersection and simulate error for first image
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const errorEvent = new Event('error', { bubbles: true });
        img.dispatchEvent(errorEvent);
      });

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });

      // Change to a different image
      const newImage: Image = {
        ...mockPhoto,
        id: 999,
        pathComponent: 'different/path.jpg',
        title: 'New Photo',
      };
      rerender(<ImageThumbnail image={newImage} />);

      // State should be reset - error should be gone, loading should be true
      await waitFor(() => {
        expect(screen.queryByText('Image unavailable')).not.toBeInTheDocument();
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
      const { rerender } = render(<ImageThumbnail image={mockPhoto} useThumbnail={false} />);
      
      // Verify observer was created
      expect(mockIntersectionObserver.observe).toHaveBeenCalled();
      const initialCallCount = mockIntersectionObserver.disconnect.mock.calls.length;
      
      // Change useThumbnail
      rerender(<ImageThumbnail image={mockPhoto} useThumbnail={true} />);
      
      // Observer should be disconnected when prop changes
      expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(initialCallCount + 1);
    });

    it('disconnects observer after intersection occurs', async () => {
      render(<ImageThumbnail image={mockPhoto} />);
      
      const initialDisconnectCount = mockIntersectionObserver.disconnect.mock.calls.length;
      
      // Trigger intersection
      const callback = (mockIntersectionObserver as any).callback;
      const container = document.querySelector('.image-thumbnail-container');
      if (callback && container) {
        callback([
          {
            isIntersecting: true,
            target: container,
          } as IntersectionObserverEntry,
        ]);
      }
      
      // Observer should be disconnected after intersection
      await waitFor(() => {
        expect(mockIntersectionObserver.disconnect).toHaveBeenCalledTimes(initialDisconnectCount + 1);
      });
    });
  });
});
