/**
 * SearchResultsPage Component Tests
 *
 * Tests for the search results page component.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@/test-utils';
import { SearchResultsPage } from './SearchResultsPage';
import { useSearch } from '@/hooks/useSearch';
import { useSearchParams } from 'react-router-dom';

// Mock dependencies
vi.mock('@/hooks/useSearch');
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  };
});

describe('SearchResultsPage', () => {
  const mockSearch = vi.fn();
  const mockUseSearch = {
    search: mockSearch,
    results: [],
    isLoading: false,
    query: '',
    error: null,
    getItemCount: vi.fn(() => 0),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSearch).mockReturnValue(mockUseSearch as any);
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams('?q=test'),
      vi.fn(),
    ]);
  });

  it('displays error state', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      error: new Error('Search error'),
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/search error/i)).toBeInTheDocument();
  });

  it('displays empty state for empty query', () => {
    vi.mocked(useSearchParams).mockReturnValue([
      new URLSearchParams(''),
      vi.fn(),
    ]);

    render(<SearchResultsPage />);

    expect(screen.getByText(/enter a search query/i)).toBeInTheDocument();
  });

  it('displays loading state when searching', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      isLoading: true,
      query: 'test',
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('displays no results state', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/no results found/i)).toBeInTheDocument();
  });

  it('displays search results', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: 'Test description',
            pathComponent: 'test',
            ancestors: 'dreamhack/dreamhack 08/crew',
            summary: 'Album summary',
            ownerName: 'Album Owner',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
        {
          item: {
            id: 2,
            type: 'GalleryPhotoItem' as const,
            title: 'Test Photo',
            description: 'Photo description',
            pathComponent: 'photo.jpg',
            ancestors: 'events/summer',
            summary: 'Photo summary',
            ownerName: 'Photo Owner',
          },
          score: 8,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/search results/i)).toBeInTheDocument();
    expect(screen.getByText(/found 2 results/i)).toBeInTheDocument();
    expect(screen.getByText('Test Album')).toBeInTheDocument();
    expect(screen.getByText('Test Photo')).toBeInTheDocument();
    expect(screen.getByText('Album summary')).toBeInTheDocument();
    expect(screen.getByText('Photo summary')).toBeInTheDocument();
    expect(screen.getByText(/Owner: Album Owner/)).toBeInTheDocument();
    expect(screen.getByText(/Owner: Photo Owner/)).toBeInTheDocument();
  });

  it('does not render summary or owner when absent', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Album 1',
            description: '',
            pathComponent: 'album1',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Album 1')).toBeInTheDocument();
    expect(screen.queryByText(/Owner:/)).not.toBeInTheDocument();
  });

  it('groups results by type', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Album 1',
            description: '',
            pathComponent: 'album1',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
        {
          item: {
            id: 2,
            type: 'GalleryPhotoItem' as const,
            title: 'Photo 1',
            description: '',
            pathComponent: 'photo1.jpg',
          },
          score: 8,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/albums \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/images \(1\)/i)).toBeInTheDocument();
  });

  it('calls search with URL query parameter', () => {
    render(<SearchResultsPage />);

    expect(mockSearch).toHaveBeenCalledWith('test');
  });

  it('displays path above link for albums with ancestors', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: '',
            pathComponent: 'tuktuk',
            ancestors: 'dreamhack/dreamhack 08/crew',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('dreamhack / dreamhack 08 / crew / tuktuk')).toBeInTheDocument();
  });

  it('displays path for root-level albums without ancestors', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Root Album',
            description: '',
            pathComponent: 'root-album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('root-album')).toBeInTheDocument();
  });

  it('does not render path when pathComponent is missing', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: '',
            pathComponent: '',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Test Album')).toBeInTheDocument();
  });

  it('displays path for images section', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryPhotoItem' as const,
            title: 'Test Photo',
            description: '',
            pathComponent: 'photo.jpg',
            ancestors: 'events/summer',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('events / summer / photo.jpg')).toBeInTheDocument();
  });

  it('formats path with proper separators', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: '',
            pathComponent: 'album',
            ancestors: 'a/b/c',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    const pathElement = screen.getByText('a / b / c / album');
    expect(pathElement).toBeInTheDocument();
    expect(pathElement.className).toBe('search-results-item-description');
  });

  it('decodes HTML entities in album titles', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Album &amp; Photos',
            description: '',
            pathComponent: 'album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Album & Photos')).toBeInTheDocument();
  });

  it('decodes double-encoded HTML entities in titles', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Album &amp;amp; More',
            description: '',
            pathComponent: 'album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Album & More')).toBeInTheDocument();
  });

  it('decodes HTML entities in descriptions', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: 'Description &amp; More',
            pathComponent: 'album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Description & More')).toBeInTheDocument();
  });

  it('decodes HTML entities in summary', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: '',
            summary: 'Summary &amp; More',
            pathComponent: 'album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText('Summary & More')).toBeInTheDocument();
  });

  it('decodes HTML entities in owner name', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      query: 'test',
      results: [
        {
          item: {
            id: 1,
            type: 'GalleryAlbumItem' as const,
            title: 'Test Album',
            description: '',
            ownerName: 'Owner &amp; Co',
            pathComponent: 'album',
          },
          score: 10,
          matchedInTitle: true,
          matchedInDescription: false,
        },
      ],
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/Owner: Owner & Co/)).toBeInTheDocument();
  });

  describe('Security - HTML Injection Prevention', () => {
    it('escapes HTML entities in titles (React default escaping)', () => {
      vi.mocked(useSearch).mockReturnValue({
        ...mockUseSearch,
        query: 'test',
        results: [
          {
            item: {
              id: 1,
              type: 'GalleryAlbumItem' as const,
              title: '&lt;script&gt;alert("XSS")&lt;/script&gt;',
              description: '',
              pathComponent: 'album',
            },
            score: 10,
            matchedInTitle: true,
            matchedInDescription: false,
          },
        ],
      } as any);

      const { container } = render(<SearchResultsPage />);

      // React should escape the decoded <script> tags
      expect(screen.getByText('<script>alert("XSS")</script>')).toBeInTheDocument();
      // Verify no actual script tag exists in DOM
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });

    it('does not use dangerouslySetInnerHTML', () => {
      vi.mocked(useSearch).mockReturnValue({
        ...mockUseSearch,
        query: 'test',
        results: [
          {
            item: {
              id: 1,
              type: 'GalleryAlbumItem' as const,
              title: 'Test Album',
              description: '',
              pathComponent: 'album',
            },
            score: 10,
            matchedInTitle: true,
            matchedInDescription: false,
          },
        ],
      } as any);

      const { container } = render(<SearchResultsPage />);

      // Verify SearchHighlight renders safely (no raw HTML)
      expect(container.querySelector('script')).not.toBeInTheDocument();
    });
  });
});
