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
import { mockAlbum } from '@/__mocks__/mockData';

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

  describe('Layout', () => {
    it('renders with album-card class', () => {
      const { container } = render(<AlbumCard album={mockAlbum} />);
      const card = container.querySelector('.album-card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass('album-card');
    });
  });

  describe('BBCode Support', () => {
    it('renders BBCode bold in title', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: '[b]Bold Title[/b]',
      };
      const { container } = render(<AlbumCard album={albumWithBBCode} />);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold Title');
    });

    it('renders BBCode italic in title', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: '[i]Italic Title[/i]',
      };
      const { container } = render(<AlbumCard album={albumWithBBCode} />);
      const em = container.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Italic Title');
    });

    it('renders BBCode underline in title', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: '[u]Underline Title[/u]',
      };
      const { container } = render(<AlbumCard album={albumWithBBCode} />);
      const u = container.querySelector('u');
      expect(u).toBeInTheDocument();
      expect(u?.textContent).toBe('Underline Title');
    });

    it('renders nested BBCode in title', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: '[b][i]Bold Italic[/i][/b]',
      };
      const { container } = render(<AlbumCard album={albumWithBBCode} />);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      const em = strong?.querySelector('em');
      expect(em).toBeInTheDocument();
      expect(em?.textContent).toBe('Bold Italic');
    });

    it('renders mixed BBCode and plain text in title', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: 'Plain [b]Bold[/b] Text',
      };
      const { container } = render(<AlbumCard album={albumWithBBCode} />);
      expect(container.textContent).toContain('Plain Bold Text');
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Bold');
    });

    it('maintains backward compatibility with titles without BBCode', () => {
      render(<AlbumCard album={mockAlbum} />);
      expect(screen.getByText('Test Album')).toBeInTheDocument();
    });

    it('handles empty title with BBCode gracefully', () => {
      const albumEmptyTitle: Album = {
        ...mockAlbum,
        title: '',
      };
      render(<AlbumCard album={albumEmptyTitle} />);
      expect(screen.getByText('Untitled Album')).toBeInTheDocument();
    });

    it('preserves plain text in aria-label (no BBCode parsing)', () => {
      const albumWithBBCode: Album = {
        ...mockAlbum,
        title: '[b]Bold Title[/b]',
      };
      render(<AlbumCard album={albumWithBBCode} />);
      const card = screen.getByRole('article');
      // aria-label should use plain text title, not parsed
      expect(card).toHaveAttribute('aria-label', '[b]Bold Title[/b]');
    });
  });

  describe('HTML Entity Decoding', () => {
    it('decodes HTML entities in title display', () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        title: 'Album &amp; Photos',
      };
      render(<AlbumCard album={albumWithEntities} />);
      expect(screen.getByText('Album & Photos')).toBeInTheDocument();
    });

    it('decodes double-encoded HTML entities in title', () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        title: 'Album &amp;amp; More',
      };
      render(<AlbumCard album={albumWithEntities} />);
      expect(screen.getByText('Album & More')).toBeInTheDocument();
    });

    it('decodes HTML entities in aria-label', () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        title: 'Album &amp; Photos',
      };
      render(<AlbumCard album={albumWithEntities} />);
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-label', 'Album & Photos');
    });

    it('decodes HTML entities in alt text', () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        title: 'Album &amp; Photos',
      };
      const { container } = render(<AlbumCard album={albumWithEntities} />);
      const img = container.querySelector('img');
      expect(img).toHaveAttribute('alt', 'Album & Photos thumbnail');
    });

    it('decodes HTML entities with BBCode formatting', () => {
      const albumWithBoth: Album = {
        ...mockAlbum,
        title: '[b]Album &amp; Photos[/b]',
      };
      const { container } = render(<AlbumCard album={albumWithBoth} />);
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      expect(strong?.textContent).toBe('Album & Photos');
    });

    it('handles triple-encoded entities', () => {
      const albumWithEntities: Album = {
        ...mockAlbum,
        title: 'Album &amp;amp;amp; More',
      };
      render(<AlbumCard album={albumWithEntities} />);
      expect(screen.getByText('Album & More')).toBeInTheDocument();
    });

    it('decodes Latin accent entities in title', () => {
      const albumWithAccent: Album = {
        ...mockAlbum,
        title: 'Daniel Lehn&eacute;r',
      };
      render(<AlbumCard album={albumWithAccent} />);
      expect(screen.getByText('Daniel Lehnér')).toBeInTheDocument();
    });
  });

  describe('Security - HTML Injection Prevention', () => {
    it('escapes HTML entities in title (React default escaping)', () => {
      const albumWithScript: Album = {
        ...mockAlbum,
        title: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      };
      const { container } = render(<AlbumCard album={albumWithScript} />);
      // React should escape the decoded <script> tags
      const titleElement = container.querySelector('.album-card-title');
      expect(titleElement?.textContent).toBe('<script>alert("XSS")</script>');
      // Verify no actual script tag exists in DOM
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('does not use dangerouslySetInnerHTML', () => {
      const albumWithHTML: Album = {
        ...mockAlbum,
        title: '[b]Bold[/b]',
      };
      const { container } = render(<AlbumCard album={albumWithHTML} />);
      // Verify BBCode is parsed to React elements, not raw HTML
      const strong = container.querySelector('strong');
      expect(strong).toBeInTheDocument();
      // Verify no dangerouslySetInnerHTML was used (no raw HTML strings)
      expect(container.innerHTML).not.toContain('[b]');
    });

    it('safely handles malicious entities in aria-label', () => {
      const albumWithMalicious: Album = {
        ...mockAlbum,
        title: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
      };
      render(<AlbumCard album={albumWithMalicious} />);
      const card = screen.getByRole('article');
      // aria-label should contain decoded but safe text
      expect(card).toHaveAttribute('aria-label');
      const ariaLabel = card.getAttribute('aria-label');
      expect(ariaLabel).toContain('<script>');
      // But should not execute (React escapes it)
      expect(ariaLabel).not.toContain('javascript:');
    });
  });
});
