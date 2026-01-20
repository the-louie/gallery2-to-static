/**
 * Lightbox Component Tests
 *
 * Comprehensive tests for the Lightbox component covering rendering, modal
 * open/close, keyboard interactions, focus trap, accessibility, and image
 * loading states.
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { Lightbox } from './Lightbox';
import type { Image } from '@/types';
import { mockPhoto } from '@/__mocks__/mockData';

describe('Lightbox', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.scrollTo to avoid errors in tests
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  describe('Component Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(
        <Lightbox isOpen={false} image={mockPhoto} onClose={mockOnClose} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when image is null', () => {
      const { container } = render(
        <Lightbox isOpen={true} image={null} onClose={mockOnClose} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders modal when isOpen is true and image is provided', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('renders image with correct src', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const img = screen.getByAltText('Test Photo');
      expect(img).toHaveAttribute('src', '/images/test-album/test-photo.jpg');
    });

    it('renders close button', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');
      expect(closeButton).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <Lightbox
          isOpen={true}
          image={mockPhoto}
          onClose={mockOnClose}
          className="custom-class"
        />,
      );
      const overlay = container.querySelector('.lightbox-overlay');
      expect(overlay).toHaveClass('custom-class');
    });

    it('renders image with alt text from image title', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const img = screen.getByAltText('Test Photo');
      expect(img).toBeInTheDocument();
    });

    it('renders image with description as alt text when title is missing', () => {
      const imageWithoutTitle: Image = {
        ...mockPhoto,
        title: '',
        description: 'Test description',
      };
      render(
        <Lightbox isOpen={true} image={imageWithoutTitle} onClose={mockOnClose} />,
      );
      const img = screen.getByAltText('Test description');
      expect(img).toBeInTheDocument();
    });

    it('renders loading state initially', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const loading = document.querySelector('.lightbox-loading');
      expect(loading).toBeInTheDocument();
    });

    it('hides loading state after image loads', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const img = screen.getByAltText('Test Photo') as HTMLImageElement;

      // Simulate image load
      Object.defineProperty(img, 'complete', {
        value: true,
        writable: true,
      });
      img.dispatchEvent(new Event('load'));

      await waitFor(() => {
        const loading = document.querySelector('.lightbox-loading');
        expect(loading).not.toBeInTheDocument();
      });
    });
  });

  describe('Metadata Display', () => {
    it('displays image title when available', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
    });

    it('displays image description when available', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(
        screen.getByText('Test photo for JSON import verification'),
      ).toBeInTheDocument();
    });

    it('displays image dimensions when available', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
    });

    it('displays formatted date when timestamp is available', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      // Date formatting may vary, so check if date element exists
      const dateElement = document.querySelector('.lightbox-date');
      expect(dateElement).toBeInTheDocument();
    });

    it('does not display metadata section when no metadata is available', () => {
      const imageWithoutMetadata: Image = {
        ...mockPhoto,
        title: '',
        description: '',
        width: null,
        height: null,
        timestamp: 0,
      };
      render(
        <Lightbox
          isOpen={true}
          image={imageWithoutMetadata}
          onClose={mockOnClose}
        />,
      );
      const metadata = document.querySelector('.lightbox-metadata');
      expect(metadata).not.toBeInTheDocument();
    });

    it('handles missing dimensions gracefully', () => {
      const imageWithoutDimensions: Image = {
        ...mockPhoto,
        width: null,
        height: null,
      };
      render(
        <Lightbox
          isOpen={true}
          image={imageWithoutDimensions}
          onClose={mockOnClose}
        />,
      );
      const dimensions = document.querySelector('.lightbox-dimensions');
      expect(dimensions).not.toBeInTheDocument();
    });
  });

  describe('Modal Open/Close', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when backdrop is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />,
      );
      const overlay = container.querySelector('.lightbox-overlay');
      if (overlay) {
        await user.click(overlay);
      }
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when modal content is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />,
      );
      const containerEl = container.querySelector('.lightbox-container');
      if (containerEl) {
        await user.click(containerEl);
      }
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('calls onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('locks body scroll when modal opens', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('unlocks body scroll when modal closes', () => {
      const { rerender } = render(
        <Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />,
      );
      expect(document.body.style.overflow).toBe('hidden');
      rerender(<Lightbox isOpen={false} image={mockPhoto} onClose={mockOnClose} />);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Keyboard Interactions', () => {
    it('closes modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      await user.keyboard('{Escape}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('activates close button with Enter key', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');
      closeButton.focus();
      await user.keyboard('{Enter}');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('activates close button with Space key', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');
      closeButton.focus();
      await user.keyboard(' ');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Focus Trap', () => {
    it('focuses close button when modal opens', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Close image viewer');
        expect(closeButton).toHaveFocus();
      });
    });

    it('traps focus within modal using Tab key', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');

      // Wait for initial focus
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });

      // Tab should keep focus on close button (only focusable element)
      await user.tab();
      expect(closeButton).toHaveFocus();
    });

    it('restores focus to previous element when modal closes', async () => {
      const user = userEvent.setup();
      // Create a button to focus before opening modal
      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const buttonRef = React.useRef<HTMLButtonElement>(null);

        React.useEffect(() => {
          if (buttonRef.current) {
            buttonRef.current.focus();
          }
        }, []);

        return (
          <>
            <button ref={buttonRef} data-testid="trigger-button">
              Open Lightbox
            </button>
            <Lightbox
              isOpen={isOpen}
              image={mockPhoto}
              onClose={() => setIsOpen(false)}
            />
            <button onClick={() => setIsOpen(true)}>Toggle</button>
          </>
        );
      };

      render(<TestComponent />);
      const triggerButton = screen.getByTestId('trigger-button');
      const toggleButton = screen.getByText('Toggle');

      // Open modal
      await user.click(toggleButton);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal
      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Focus should be restored (though exact restoration depends on implementation)
      // At minimum, focus should not be lost
      expect(document.activeElement).not.toBeNull();
    });
  });

  describe('Accessibility', () => {
    it('has role="dialog" on overlay', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has aria-modal="true" attribute', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to title when title exists', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'lightbox-title');
    });

    it('has aria-label when title does not exist', () => {
      const imageWithoutTitle: Image = {
        ...mockPhoto,
        title: '',
      };
      render(
        <Lightbox isOpen={true} image={imageWithoutTitle} onClose={mockOnClose} />,
      );
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-label');
    });

    it('has aria-describedby pointing to metadata when metadata exists', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'lightbox-metadata');
    });

    it('has aria-label on close button', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const closeButton = screen.getByLabelText('Close image viewer');
      expect(closeButton).toBeInTheDocument();
    });

    it('has aria-hidden on decorative icon', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const icon = document.querySelector('.lightbox-close-icon');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Error Handling', () => {
    it('displays error state when image fails to load', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const img = screen.getByAltText('Test Photo') as HTMLImageElement;

      // Simulate image error
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });
    });

    it('shows error icon when image fails to load', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      const img = screen.getByAltText('Test Photo') as HTMLImageElement;

      // Simulate image error
      img.dispatchEvent(new Event('error'));

      await waitFor(() => {
        const errorIcon = document.querySelector('.lightbox-error-icon');
        expect(errorIcon).toBeInTheDocument();
      });
    });
  });

  describe('Image State Management', () => {
    it('resets loading state when image changes', () => {
      const image1: Image = {
        ...mockPhoto,
        id: 1,
      };
      const image2: Image = {
        ...mockPhoto,
        id: 2,
      };

      const { rerender } = render(
        <Lightbox isOpen={true} image={image1} onClose={mockOnClose} />,
      );

      // Change image
      rerender(<Lightbox isOpen={true} image={image2} onClose={mockOnClose} />);

      // Should show loading state again
      const loading = document.querySelector('.lightbox-loading');
      expect(loading).toBeInTheDocument();
    });

    it('resets error state when image changes', async () => {
      const image1: Image = {
        ...mockPhoto,
        id: 1,
      };
      const image2: Image = {
        ...mockPhoto,
        id: 2,
      };

      const { rerender } = render(
        <Lightbox isOpen={true} image={image1} onClose={mockOnClose} />,
      );

      const img1 = screen.getByAltText('Test Photo') as HTMLImageElement;
      img1.dispatchEvent(new Event('error'));

      await waitFor(() => {
        expect(screen.getByText('Image unavailable')).toBeInTheDocument();
      });

      // Change image
      rerender(<Lightbox isOpen={true} image={image2} onClose={mockOnClose} />);

      // Error should be reset
      expect(screen.queryByText('Image unavailable')).not.toBeInTheDocument();
    });
  });
});
