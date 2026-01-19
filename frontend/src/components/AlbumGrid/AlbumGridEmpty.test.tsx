/**
 * AlbumGridEmpty Component Tests
 *
 * Tests for the AlbumGridEmpty empty state component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import { AlbumGridEmpty } from './AlbumGridEmpty';

describe('AlbumGridEmpty', () => {
  describe('Component Rendering', () => {
    it('renders default empty message', () => {
      render(<AlbumGridEmpty />);
      expect(screen.getByText('No albums found')).toBeInTheDocument();
    });

    it('renders custom empty message', () => {
      render(<AlbumGridEmpty message="This album is empty" />);
      expect(screen.getByText('This album is empty')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <AlbumGridEmpty className="custom-class" />,
      );
      const empty = container.querySelector('.album-grid-empty');
      expect(empty).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AlbumGridEmpty />);
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });

    it('announces empty message to screen readers', () => {
      render(<AlbumGridEmpty message="No albums available" />);
      const status = screen.getByRole('status');
      expect(status).toHaveTextContent('No albums available');
    });
  });
});
