/**
 * SearchResultsPage Component
 *
 * Displays search results for albums. Reads search query from URL
 * parameters and uses the useSearch hook to perform the search.
 * Note: Only albums are indexed in the search index, not individual photos.
 *
 * @module frontend/src/pages
 */

import { useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useSearch } from '@/hooks/useSearch';
import { SearchHighlight } from '@/components/SearchHighlight';
import { decodeHtmlEntities } from '@/utils/decodeHtmlEntities';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { SearchIndexItem } from '@/utils/searchIndex';
import './SearchResultsPage.css';

/**
 * Build full path string from SearchIndexItem
 * 
 * Constructs the complete hierarchical path from root album to the search hit.
 * Formats the path for display by replacing '/' separators with ' / ' for better readability.
 * 
 * @param item - SearchIndexItem with ancestors and pathComponent fields
 * @returns Formatted path string, or empty string if pathComponent is missing
 */
function buildFullPath(item: SearchIndexItem): string {
  if (!item.pathComponent) {
    return '';
  }
  
  const fullPath = item.ancestors 
    ? `${item.ancestors}/${item.pathComponent}`
    : item.pathComponent;
  
  // Format for display: replace '/' with ' / ' for better readability
  return fullPath.split('/').filter(Boolean).join(' / ');
}

/**
 * SearchResultsPage component
 *
 * Page that displays search results grouped by type (Albums, Images).
 * Note: Only albums are indexed, so the Images section will typically be empty.
 * Shows loading state during search and empty state when no results.
 *
 * @returns React component
 */
export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { search, results, isLoading, error } = useSearch();

  // Get query and optional context album from URL params
  const urlQuery = searchParams.get('q') || '';
  const urlAlbum = searchParams.get('album');
  const contextAlbumId =
    urlAlbum != null && /^\d+$/.test(urlAlbum)
      ? parseInt(urlAlbum, 10)
      : undefined;

  // Perform search when URL query or context album changes
  useEffect(() => {
    search(urlQuery, contextAlbumId);
  }, [urlQuery, contextAlbumId, search]);

  // Separate albums and images from results
  const albums = useMemo(() => {
    return results
      .filter(result => result.item.type === 'GalleryAlbumItem')
      .map(result => result.item);
  }, [results]);

  const images = useMemo(() => {
    return results
      .filter(result => result.item.type === 'GalleryPhotoItem')
      .map(result => result.item);
  }, [results]);

  // Error state
  if (error) {
    return (
      <div className="search-results-page search-results-page-error" role="alert" aria-live="assertive">
        <h1>Search Error</h1>
        <p>{error.message}</p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Empty query state
  if (!urlQuery || urlQuery.trim().length === 0) {
    return (
      <div className="search-results-page search-results-page-empty">
        <h2>Advanced search is a lie</h2>
        <p>it might come in the future</p>
      </div>
    );
  }

  // Loading state (searching)
  if (isLoading) {
    return (
      <div className="search-results-page search-results-page-loading" role="status" aria-label="Searching" aria-live="polite">
        <LoadingSpinner size="large" label={`Searching for "${urlQuery}"...`} />
        <h1>Searching...</h1>
        <p>Searching for &quot;{urlQuery}&quot;</p>
      </div>
    );
  }

  // No results state
  if (results.length === 0) {
    return (
      <div className="search-results-page search-results-page-empty">
        <h1>No Results Found</h1>
        <p>
          No albums or images found matching &quot;
          <SearchHighlight text={urlQuery} query={urlQuery} />&quot;
        </p>
        <button type="button" onClick={() => navigate('/')} aria-label="Go to home page">
          Go to Home
        </button>
      </div>
    );
  }

  // Results display
  return (
    <div className="search-results-page">
      <h1>
        Search Results for &quot;
        <SearchHighlight text={urlQuery} query={urlQuery} />&quot;
      </h1>
      <p className="search-results-count" role="status" aria-live="polite">
        Found {results.length} result{results.length !== 1 ? 's' : ''}
      </p>

      {/* Albums Section */}
      {albums.length > 0 && (
        <section className="search-results-section" aria-label="Albums">
          <h2 className="search-results-section-title">
            Albums ({albums.length})
          </h2>
          <ul className="search-results-list">
            {albums.map(album => {
              const fullPath = buildFullPath(album);
              return (
                <li key={album.id} className="search-results-item">
                  {fullPath && (
                    <p className="search-results-item-description">
                      {fullPath}
                    </p>
                  )}
                  <Link
                    to={album.path ?? `/album/${album.id}`}
                    className="search-results-link"
                  >
                    <div className="search-results-item-content">
                      <h3 className="search-results-item-title">
                        <SearchHighlight
                          text={decodeHtmlEntities(album.title)}
                          query={urlQuery}
                        />
                      </h3>
                      {album.description && (
                        <p className="search-results-item-description">
                          <SearchHighlight
                            text={decodeHtmlEntities(album.description)}
                            query={urlQuery}
                          />
                        </p>
                      )}
                      {typeof album.summary === 'string' &&
                        album.summary.trim() && (
                          <p className="search-results-item-summary">
                            <SearchHighlight
                              text={decodeHtmlEntities(album.summary.trim())}
                              query={urlQuery}
                            />
                          </p>
                        )}
                      {typeof album.ownerName === 'string' &&
                        album.ownerName.trim() && (
                          <p className="search-results-item-owner">
                            Owner: {decodeHtmlEntities(album.ownerName.trim())}
                          </p>
                        )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Images Section */}
      {images.length > 0 && (
        <section className="search-results-section" aria-label="Images">
          <h2 className="search-results-section-title">
            Images ({images.length})
          </h2>
          <ul className="search-results-list">
            {images.map(image => {
              const fullPath = buildFullPath(image);
              return (
                <li key={image.id} className="search-results-item">
                  {fullPath && (
                    <p className="search-results-item-description">
                      {fullPath}
                    </p>
                  )}
                  <Link
                    to={`/image/${image.id}`}
                    className="search-results-link"
                  >
                    <div className="search-results-item-content">
                      <h3 className="search-results-item-title">
                        <SearchHighlight
                          text={decodeHtmlEntities(image.title)}
                          query={urlQuery}
                        />
                      </h3>
                      {image.description && (
                        <p className="search-results-item-description">
                          <SearchHighlight
                            text={decodeHtmlEntities(image.description)}
                            query={urlQuery}
                          />
                        </p>
                      )}
                      {typeof image.summary === 'string' &&
                        image.summary.trim() && (
                          <p className="search-results-item-summary">
                            <SearchHighlight
                              text={decodeHtmlEntities(image.summary.trim())}
                              query={urlQuery}
                            />
                          </p>
                        )}
                      {typeof image.ownerName === 'string' &&
                        image.ownerName.trim() && (
                          <p className="search-results-item-owner">
                            Owner: {decodeHtmlEntities(image.ownerName.trim())}
                          </p>
                        )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

export default SearchResultsPage;
