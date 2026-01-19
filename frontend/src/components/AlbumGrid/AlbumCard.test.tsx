/**
 * AlbumCard Component Tests
 *
 * Comprehensive tests for the AlbumCard component covering rendering,
 * interaction, accessibility, and edge cases.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';
import { AlbumCard } from './AlbumCard';
import type { Album } from '@/types';
import { mockAlbum, mockAlbumWithChildren } from '@/__mocks__/mockData';

describe('AlbumCard', () => {
  describe('Component Rendering', () => {
    it('renders album with title', () => {
      render(<AlbumCard album={mockAlbum} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('renders "Untitled Album" when title is missing', () => {
      const albumWithoutTitle: Album = {
        ...mockAlbum,
        title: '',
      };
      render(<AlbumCard album={albumWithoutTitle} />);
      expect(screen.getByText('Untitled Album')).toBeInTheDocument();
    });

    it('displays "Has children" when album has children', () => {
      render(<AlbumCard album={mockAlbumWithChildren} />);
      expect(screen.getByText('Has children')).toBeInTheDocument();
    });

    it('displays "No children" when album has no children', () => {
      const albumNoChildren: Album = {
        ...mockAlbum,
        hasChildren: false,
      };
      render(<AlbumCard album={albumNoChildren} />);
      expect(screen.getByText('No children')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(
        <AlbumCard album={mockAlbum} className="custom-class" />,
      );
      const card = container.querySelector('.album-card');
      expect(card).toHaveClass('custom-class');
    });

    it('renders placeholder when no thumbnail available', () => {
      render(<AlbumCard album={mockAlbum} />);
      const placeholder = screen.getByText('📁');
      expect(placeholder).toBeInTheDocument();
    });

    // Albums are containers, so they always show placeholder
    // Thumbnail support for albums would be a future enhancement
  });

  describe('Interaction', () => {
    it('calls onClick when card is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

      const card = screen.getByRole('article');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockAlbum);
    });

    it('calls onClick when Enter key is pressed', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

      const card = screen.getByRole('article');
      card.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockAlbum);
    });

    it('calls onClick when Space key is pressed', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<AlbumCard album={mockAlbum} onClick={handleClick} />);

      const card = screen.getByRole('article');
      card.focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(handleClick).toHaveBeenCalledWith(mockAlbum);
    });

    it('does not call onClick when no handler provided', async () => {
      const user = userEvent.setup();
      render(<AlbumCard album={mockAlbum} />);

      const card = screen.getByRole('article');
      await user.click(card);

      // Should not throw error
      expect(card).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<AlbumCard album={mockAlbum} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Test Album');
      expect(card).toHaveAttribute('aria-describedby', `album-card-count-${mockAlbum.id}`);
    });

    it('uses custom aria-label when provided', () => {
      render(<AlbumCard album={mockAlbum} aria-label="Custom label" />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Custom label');
    });

    it('has tabIndex when onClick is provided', () => {
      render(<AlbumCard album={mockAlbum} onClick={() => {}} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('does not have tabIndex when onClick is not provided', () => {
      render(<AlbumCard album={mockAlbum} />);
      const card = screen.getByRole('article');
      expect(card).not.toHaveAttribute('tabIndex');
    });

    it('has accessible child count', () => {
      render(<AlbumCard album={mockAlbum} />);
      const count = screen.getByText('Has children');
      expect(count).toHaveAttribute('aria-label', 'Has children');
      expect(count).toHaveAttribute('id', `album-card-count-${mockAlbum.id}`);
    });
  });

  describe('Edge Cases', () => {
    it('handles album with null thumbnail dimensions', () => {
      const albumNoThumb: Album = {
        ...mockAlbum,
        thumb_width: null,
        thumb_height: null,
      };
      render(<AlbumCard album={albumNoThumb} />);
      const placeholder = screen.getByText('📁');
      expect(placeholder).toBeInTheDocument();
    });

    it('handles album with zero thumbnail dimensions', () => {
      const albumZeroThumb: Album = {
        ...mockAlbum,
        thumb_width: 0,
        thumb_height: 0,
      };
      render(<AlbumCard album={albumZeroThumb} />);
      const placeholder = screen.getByText('📁');
      expect(placeholder).toBeInTheDocument();
    });

    it('handles empty title gracefully', () => {
      const albumEmptyTitle: Album = {
        ...mockAlbum,
        title: '',
      };
      render(<AlbumCard album={albumEmptyTitle} />);
      expect(screen.getByText('Untitled Album')).toBeInTheDocument();
    });
  });
});
