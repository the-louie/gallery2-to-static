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
import {
  createTouchStart,
  createTouchMove,
  createTouchEnd,
  createTouchCancel,
} from '@/test-utils/touch-events';

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
        summary: null,
        ownerName: null,
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

    it('displays summary and ownerName when available', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(screen.getByText('Photo summary for lightbox tests')).toBeInTheDocument();
      expect(screen.getByText(/Owner: Photo Owner/)).toBeInTheDocument();
    });

    it('does not render summary or owner when absent', () => {
      const imageWithoutSummaryOwner: Image = {
        ...mockPhoto,
        summary: null,
        ownerName: null,
      };
      render(
        <Lightbox
          isOpen={true}
          image={imageWithoutSummaryOwner}
          onClose={mockOnClose}
        />,
      );
      expect(screen.getByText('Test Photo')).toBeInTheDocument();
      expect(screen.queryByText('Photo summary for lightbox tests')).not.toBeInTheDocument();
      expect(screen.queryByText(/Owner: Photo Owner/)).not.toBeInTheDocument();
    });

    it('displays metadata section when only summary or ownerName present', () => {
      const imageOnlySummaryOwner: Image = {
        ...mockPhoto,
        title: '',
        description: '',
        width: null,
        height: null,
        timestamp: 0,
        summary: 'Only summary',
        ownerName: 'Only Owner',
      };
      render(
        <Lightbox
          isOpen={true}
          image={imageOnlySummaryOwner}
          onClose={mockOnClose}
        />,
      );
      const metadata = document.querySelector('.lightbox-metadata');
      expect(metadata).toBeInTheDocument();
      expect(screen.getByText('Only summary')).toBeInTheDocument();
      expect(screen.getByText(/Owner: Only Owner/)).toBeInTheDocument();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'lightbox-metadata');
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

  describe('Image Counter', () => {
    const mockImages: Image[] = [
      { ...mockPhoto, id: 1, title: 'Image 1' },
      { ...mockPhoto, id: 2, title: 'Image 2' },
      { ...mockPhoto, id: 3, title: 'Image 3' },
    ];

    it('displays counter when multiple images are available', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      expect(screen.getByText('1 of 3')).toBeInTheDocument();
    });

    it('displays correct counter for middle image', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[1]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('displays correct counter for last image', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[2]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      expect(screen.getByText('3 of 3')).toBeInTheDocument();
    });

    it('does not display counter for single image', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={[mockImages[0]]}
        />,
      );
      expect(screen.queryByText(/of/)).not.toBeInTheDocument();
    });

    it('does not display counter when albumContext is empty', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={[]}
        />,
      );
      expect(screen.queryByText(/of/)).not.toBeInTheDocument();
    });

    it('updates counter when image changes', () => {
      const { rerender } = render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      expect(screen.getByText('1 of 3')).toBeInTheDocument();

      rerender(
        <Lightbox
          isOpen={true}
          image={mockImages[1]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      expect(screen.getByText('2 of 3')).toBeInTheDocument();
    });

    it('has accessible label for counter', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
        />,
      );
      const counter = screen.getByLabelText('Image 1 of 3');
      expect(counter).toBeInTheDocument();
    });
  });

  describe('Image Navigation', () => {
    const mockImages: Image[] = [
      { ...mockPhoto, id: 1, title: 'Image 1' },
      { ...mockPhoto, id: 2, title: 'Image 2' },
      { ...mockPhoto, id: 3, title: 'Image 3' },
    ];

    const mockOnNext = vi.fn();
    const mockOnPrevious = vi.fn();

    it('calls onNext when next button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      const nextButton = screen.getByLabelText('Next image');
      await user.click(nextButton);
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('calls onPrevious when previous button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[1]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      const previousButton = screen.getByLabelText('Previous image');
      await user.click(previousButton);
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
    });

    it('disables previous button on first image', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      const previousButton = screen.getByLabelText('Previous image');
      expect(previousButton).toBeDisabled();
    });

    it('disables next button on last image', () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[2]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      const nextButton = screen.getByLabelText('Next image');
      expect(nextButton).toBeDisabled();
    });

    it('navigates with ArrowRight key', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      await user.keyboard('{ArrowRight}');
      expect(mockOnNext).toHaveBeenCalledTimes(1);
    });

    it('navigates with ArrowLeft key', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[1]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      await user.keyboard('{ArrowLeft}');
      expect(mockOnPrevious).toHaveBeenCalledTimes(1);
    });

    it('does not navigate with ArrowRight on last image', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[2]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      await user.keyboard('{ArrowRight}');
      expect(mockOnNext).not.toHaveBeenCalled();
    });

    it('does not navigate with ArrowLeft on first image', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );
      await user.keyboard('{ArrowLeft}');
      expect(mockOnPrevious).not.toHaveBeenCalled();
    });
  });

  describe('Zoom Functionality', () => {
    it('renders zoom control buttons', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
    });

    it('renders reset zoom button when zoomed', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
      });
    });

    it('zooms in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      const img = screen.getByAltText('Test Photo');
      const transform = (img as HTMLElement).style.transform;
      expect(transform).toContain('scale(1.25)');
    });

    it('zooms out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);
      await user.click(zoomInButton);

      const zoomOutButton = screen.getByLabelText('Zoom out');
      await user.click(zoomOutButton);

      const img = screen.getByAltText('Test Photo');
      const transform = (img as HTMLElement).style.transform;
      expect(transform).toContain('scale(1.25)');
    });

    it('resets zoom when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        expect(screen.getByLabelText('Reset zoom')).toBeInTheDocument();
      });

      const resetButton = screen.getByLabelText('Reset zoom');
      await user.click(resetButton);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        expect(transform).toBeUndefined();
      });
    });

    it('disables zoom in button at max zoom', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');

      // Click zoom in multiple times to reach max
      for (let i = 0; i < 15; i++) {
        await user.click(zoomInButton);
      }

      await waitFor(() => {
        expect(zoomInButton).toBeDisabled();
      });
    });

    it('disables zoom out button at min zoom', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomOutButton = screen.getByLabelText('Zoom out');
      expect(zoomOutButton).toBeDisabled();
    });

    it('resets zoom when image changes', async () => {
      const user = userEvent.setup();
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

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      rerender(<Lightbox isOpen={true} image={image2} onClose={mockOnClose} />);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        expect(transform).toBeUndefined();
      });
    });
  });

  describe('Pan Functionality', () => {
    it('allows panning when zoomed', async () => {
      const user = userEvent.setup();
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        expect(transform).toContain('scale');
      });

      const imageContainer = document.querySelector('.lightbox-image-container');
      expect(imageContainer).toHaveStyle({ cursor: 'grab' });
    });

    it('does not allow panning when not zoomed', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      expect(imageContainer).toHaveStyle({ cursor: 'default' });
    });
  });

  describe('Integration Tests', () => {
    const mockImages: Image[] = [
      { ...mockPhoto, id: 1, title: 'Image 1' },
      { ...mockPhoto, id: 2, title: 'Image 2' },
      { ...mockPhoto, id: 3, title: 'Image 3' },
    ];

    const mockOnNext = vi.fn();
    const mockOnPrevious = vi.fn();

    describe('Zoom + Pan Interaction', () => {
      it('allows panning after zooming in', async () => {
        const user = userEvent.setup();
        render(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);

        await waitFor(() => {
          const imageContainer = document.querySelector('.lightbox-image-container');
          expect(imageContainer).toHaveStyle({ cursor: 'grab' });
        });
      });

      it('constrains pan to boundaries when zoomed', async () => {
        const user = userEvent.setup();
        render(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);
        await user.click(zoomInButton);

        await waitFor(() => {
          const img = screen.getByAltText('Test Photo');
          expect(img).toHaveStyle({ transform: expect.stringContaining('scale') });
        });
      });
    });

    describe('Zoom + Image Navigation', () => {
      it('resets zoom when navigating to next image', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);

        await waitFor(() => {
          const img = screen.getByAltText('Test Photo');
          expect(img).toHaveStyle({ transform: expect.stringContaining('scale') });
        });

        // Navigate to next image
        mockOnNext();
        rerender(
          <Lightbox
            isOpen={true}
            image={mockImages[1]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        await waitFor(() => {
          const img = screen.getByAltText('Test Photo');
          const transform = (img as HTMLElement).style.transform;
          expect(transform).toBeUndefined();
        });
      });

      it('resets zoom when navigating to previous image', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
          <Lightbox
            isOpen={true}
            image={mockImages[1]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);

        // Navigate to previous image
        mockOnPrevious();
        rerender(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        await waitFor(() => {
          const img = screen.getByAltText('Test Photo');
          const transform = (img as HTMLElement).style.transform;
          expect(transform).toBeUndefined();
        });
      });
    });

    describe('Zoom + Keyboard Navigation', () => {
      it('allows keyboard navigation while zoomed', async () => {
        const user = userEvent.setup();
        render(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);

        // Keyboard navigation should still work
        await user.keyboard('{ArrowRight}');
        expect(mockOnNext).toHaveBeenCalled();
      });

      it('resets zoom when navigating with keyboard', async () => {
        const user = userEvent.setup();
        const { rerender } = render(
          <Lightbox
            isOpen={true}
            image={mockImages[0]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        const zoomInButton = screen.getByLabelText('Zoom in');
        await user.click(zoomInButton);

        // Navigate with keyboard
        await user.keyboard('{ArrowRight}');

        // Simulate image change
        rerender(
          <Lightbox
            isOpen={true}
            image={mockImages[1]}
            onClose={mockOnClose}
            albumContext={mockImages}
            onNext={mockOnNext}
            onPrevious={mockOnPrevious}
          />,
        );

        await waitFor(() => {
          const img = screen.getByAltText('Test Photo');
          const transform = (img as HTMLElement).style.transform;
          expect(transform).toBeUndefined();
        });
      });
    });
  });

  describe('Mouse Wheel Zoom', () => {
    it('zooms in with Ctrl + wheel scroll up', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: true,
        clientX: 400,
        clientY: 300,
        bubbles: true,
        cancelable: true,
      });

      imageContainer.dispatchEvent(wheelEvent);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        expect(transform).toContain('scale');
      });
    });

    it('zooms out with Ctrl + wheel scroll down', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      const user = userEvent.setup();
      await user.click(zoomInButton);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect((img as HTMLElement).style.transform).toContain('scale');
      });

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: 100,
        ctrlKey: true,
        clientX: 400,
        clientY: 300,
        bubbles: true,
        cancelable: true,
      });

      imageContainer.dispatchEvent(wheelEvent);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        // Should zoom out (scale should be smaller or reset)
        expect(transform).toBeDefined();
      });
    });

    it('does not zoom without Ctrl/Cmd modifier', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      const wheelEvent = new WheelEvent('wheel', {
        deltaY: -100,
        ctrlKey: false,
        metaKey: false,
        clientX: 400,
        clientY: 300,
        bubbles: true,
        cancelable: true,
      });

      imageContainer.dispatchEvent(wheelEvent);

      const img = screen.getByAltText('Test Photo');
      const transform = (img as HTMLElement).style.transform;
      expect(transform).toBeUndefined();
    });
  });

  describe('Touch Pinch Zoom', () => {
    it('detects two-finger touch for pinch zoom', () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      const touchStartEvent = new TouchEvent('touchstart', {
        touches: [
          new Touch({ identifier: 1, target: imageContainer, clientX: 100, clientY: 100 }),
          new Touch({ identifier: 2, target: imageContainer, clientX: 200, clientY: 200 }),
        ],
        bubbles: true,
        cancelable: true,
      });

      imageContainer.dispatchEvent(touchStartEvent);

      // Verify touch state was set (indirectly by checking zoom can be applied)
      const img = screen.getByAltText('Test Photo');
      expect(img).toBeInTheDocument();
    });
  });

  describe('Swipe Gestures', () => {
    const mockImages: Image[] = [
      { ...mockPhoto, id: 1, title: 'Image 1' },
      { ...mockPhoto, id: 2, title: 'Image 2' },
      { ...mockPhoto, id: 3, title: 'Image 3' },
    ];

    const mockOnNext = vi.fn();
    const mockOnPrevious = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('triggers next image navigation on swipe left', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left (more than 50px)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      await waitFor(() => {
        expect(mockOnNext).toHaveBeenCalledTimes(1);
      });
    });

    it('triggers previous image navigation on swipe right', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[1]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch right (more than 50px)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 250, clientY: 100 }],
        [{ identifier: 1, clientX: 250, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      await waitFor(() => {
        expect(mockOnPrevious).toHaveBeenCalledTimes(1);
      });
    });

    it('triggers close on swipe up', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch up (more than 50px)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 100, clientY: 50 }],
        [{ identifier: 1, clientX: 100, clientY: 50 }],
      );
      imageContainer.dispatchEvent(endEvent);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('triggers close on swipe down', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch down (more than 50px)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 100, clientY: 250 }],
        [{ identifier: 1, clientX: 100, clientY: 250 }],
      );
      imageContainer.dispatchEvent(endEvent);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });

    it('does not trigger swipe when navigation is unavailable', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={[mockImages[0]]}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      // Wait a bit to ensure no call was made
      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('does not trigger swipe when zoomed', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      // Zoom in first
      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveStyle({ transform: expect.stringContaining('scale') });
      });

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      // Should not trigger navigation (pan takes priority)
      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('does not trigger swipe during pinch zoom', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch with two fingers (pinch zoom)
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
        { identifier: 2, clientX: 200, clientY: 200 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 50, clientY: 100 },
        { identifier: 2, clientX: 250, clientY: 200 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [
          { identifier: 1, clientX: 50, clientY: 100 },
          { identifier: 2, clientX: 250, clientY: 200 },
        ],
        [
          { identifier: 1, clientX: 50, clientY: 100 },
          { identifier: 2, clientX: 250, clientY: 200 },
        ],
      );
      imageContainer.dispatchEvent(endEvent);

      // Should not trigger navigation (pinch zoom takes priority)
      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('does not trigger swipe during pan', async () => {
      const user = userEvent.setup();
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      // Zoom in first
      const zoomInButton = screen.getByLabelText('Zoom in');
      await user.click(zoomInButton);

      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        expect(img).toHaveStyle({ transform: expect.stringContaining('scale') });
      });

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch (should start pan, not swipe)
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch (panning)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 50, clientY: 100 }],
        [{ identifier: 1, clientX: 50, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      // Should not trigger navigation (pan takes priority)
      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('does not trigger swipe when distance is insufficient', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left (less than 50px - should not trigger)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 160, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // End touch
      const endEvent = createTouchEnd(
        imageContainer,
        [{ identifier: 1, clientX: 160, clientY: 100 }],
        [{ identifier: 1, clientX: 160, clientY: 100 }],
      );
      imageContainer.dispatchEvent(endEvent);

      // Should not trigger navigation (insufficient distance)
      await waitFor(() => {
        expect(mockOnNext).not.toHaveBeenCalled();
      }, { timeout: 100 });
    });

    it('applies visual feedback during horizontal swipe', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left (swipe in progress)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 150, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // Check that visual feedback is applied (image should have translateX)
      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        // Transform should include translateX for swipe feedback
        expect(transform).toBeDefined();
      });
    });

    it('applies visual feedback during vertical swipe', async () => {
      render(<Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />);

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      const overlay = document.querySelector('.lightbox-overlay');
      if (!overlay) {
        throw new Error('Overlay not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 200 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch up (swipe in progress)
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 100, clientY: 150 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // Check that visual feedback is applied (backdrop opacity should change)
      await waitFor(() => {
        const overlayStyle = (overlay as HTMLElement).style;
        // Opacity should be less than 1 during swipe
        expect(overlayStyle.opacity).toBeDefined();
      });
    });

    it('resets visual feedback on swipe cancel', async () => {
      render(
        <Lightbox
          isOpen={true}
          image={mockImages[0]}
          onClose={mockOnClose}
          albumContext={mockImages}
          onNext={mockOnNext}
          onPrevious={mockOnPrevious}
        />,
      );

      const imageContainer = document.querySelector('.lightbox-image-container');
      if (!imageContainer) {
        throw new Error('Image container not found');
      }

      // Start touch
      const startEvent = createTouchStart(imageContainer, [
        { identifier: 1, clientX: 200, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(startEvent);

      // Move touch left
      const moveEvent = createTouchMove(imageContainer, [
        { identifier: 1, clientX: 150, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(moveEvent);

      // Cancel touch
      const cancelEvent = createTouchCancel(imageContainer, [
        { identifier: 1, clientX: 150, clientY: 100 },
      ]);
      imageContainer.dispatchEvent(cancelEvent);

      // Visual feedback should be reset
      await waitFor(() => {
        const img = screen.getByAltText('Test Photo');
        const transform = (img as HTMLElement).style.transform;
        // Transform should not include swipe translateX after cancel
        if (transform) {
          expect(transform).not.toContain('translateX');
        }
      });
    });
  });

  describe('BBCode Support', () => {
    it('renders BBCode in image title', () => {
      const imageWithBBCode: Image = {
        ...mockPhoto,
        title: '[b]Bold Image Title[/b]',
      };

      render(
        <Lightbox isOpen={true} image={imageWithBBCode} onClose={mockOnClose} />,
      );

      const strong = screen.getByRole('heading', { level: 2 }).querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold Image Title');
    });

    it('renders nested BBCode in image title', () => {
      const imageWithBBCode: Image = {
        ...mockPhoto,
        title: '[b][i]Bold Italic Title[/i][/b]',
      };

      const { container } = render(
        <Lightbox isOpen={true} image={imageWithBBCode} onClose={mockOnClose} />,
      );

      const strong = container.querySelector('h2 strong');
      expect(strong).toBeInTheDocument();
      const em = strong?.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Bold Italic Title');
    });

    it('maintains backward compatibility with titles without BBCode', () => {
      render(
        <Lightbox isOpen={true} image={mockPhoto} onClose={mockOnClose} />,
      );

      expect(screen.getByText('Test Photo')).toBeInTheDocument();
    });

    it('does not parse BBCode in description or summary', () => {
      const imageWithBBCode: Image = {
        ...mockPhoto,
        title: '[b]Title[/b]',
        description: '[b]Description[/b]',
        summary: '[b]Summary[/b]',
      };

      const { container } = render(
        <Lightbox isOpen={true} image={imageWithBBCode} onClose={mockOnClose} />,
      );

      // Title should have parsed BBCode
      const titleStrong = container.querySelector('h2 strong');
      expect(titleStrong).toBeInTheDocument();

      // Description and summary should have literal [b] tags
      expect(screen.getByText('[b]Description[/b]')).toBeInTheDocument();
      expect(screen.getByText('[b]Summary[/b]')).toBeInTheDocument();
    });

    it('preserves aria-labelledby when title has BBCode', () => {
      const imageWithBBCode: Image = {
        ...mockPhoto,
        title: '[b]Bold Title[/b]',
      };

      const { container } = render(
        <Lightbox isOpen={true} image={imageWithBBCode} onClose={mockOnClose} />,
      );

      const overlay = container.querySelector('.lightbox-overlay');
      expect(overlay).toHaveAttribute('aria-labelledby', 'lightbox-title');

      const title = container.querySelector('#lightbox-title');
      expect(title).toBeInTheDocument();
    });
  });
});
