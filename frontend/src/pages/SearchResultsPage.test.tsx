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
    isIndexBuilding: false,
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

  it('displays loading state when building index', () => {
    vi.mocked(useSearch).mockReturnValue({
      ...mockUseSearch,
      isIndexBuilding: true,
    } as any);

    render(<SearchResultsPage />);

    expect(screen.getByText(/building search index/i)).toBeInTheDocument();
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
});
