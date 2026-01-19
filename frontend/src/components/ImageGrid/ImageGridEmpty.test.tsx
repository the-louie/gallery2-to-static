/**
 * ImageGridEmpty Component Tests
 *
 * Tests for the ImageGridEmpty empty state component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { ImageGridEmpty } from './ImageGridEmpty';

describe('ImageGridEmpty', () => {
  describe('Component Rendering', () => {
    it('renders default empty message', () => {
      render(<ImageGridEmpty />);
      expect(screen.getByText('No images found')).toBeInTheDocument();
    });

    it('renders custom empty message', () => {
      render(<ImageGridEmpty message="This album has no images" />);
      expect(screen.getByText('This album has no images')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <ImageGridEmpty className="custom-class" />,
      );
      const empty = container.querySelector('.image-grid-empty');
      expect(empty).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<ImageGridEmpty />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('announces empty message to screen readers', () => {
      render(<ImageGridEmpty message="No images available" />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('No images available');
    });
  });
});
