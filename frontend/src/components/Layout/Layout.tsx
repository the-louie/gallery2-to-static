import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeDropdown } from '../ThemeDropdown';
import { getImageCache } from '@/utils/imageCache';
import { SearchBar } from '../SearchBar';
import { SortDropdown } from '../SortDropdown';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteMetadata } from '@/hooks/useSiteMetadata';
import { parseBBCodeDecoded } from '@/utils/bbcode';
import { useSort } from '@/hooks/useSort';
import './Layout.css';

/**
 * Props for the Layout component
 */
export interface LayoutProps {
  /** Content to be rendered in the main content area */
  children: React.ReactNode;
  /** Optional CSS class name for the layout container */
  className?: string;
}

/**
 * Base layout component providing the overall structure for the application.
 *
 * Includes:
 * - Header with title/logo area (linked to home page)
 * - Main content area with proper semantic HTML
 * - Footer (minimal)
 * - Skip-to-content link for accessibility
 * - Responsive design (mobile-first)
 * - ARIA landmarks for accessibility
 *
 * @example
 * ```tsx
 * <Layout>
 *   <AlbumGrid albums={albums} />
 * </Layout>
 * ```
 */
export function Layout({ children, className }: LayoutProps) {
  const { siteName, siteDescription } = useSiteMetadata();
  const { isOriginal } = useTheme();
  const { option: sortOption, setOption: setSortOption } = useSort('albums');
  const location = useLocation();
  const isInitialMount = useRef(true);

  // Clear image cache on navigation so previous view's decoded images can be GC'd (Phase 3).
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    getImageCache().clear();
  }, [location.pathname, location.key]);

  const handleSkipClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Update document title
  useEffect(() => {
    if (siteName) {
      document.title = siteName;
    }
  }, [siteName]);

  return (
    <div className={className ? `layout ${className}` : 'layout'}>
      <a
        href="#main-content"
        className="skip-link"
        aria-label="Skip to main content"
        onClick={handleSkipClick}
      >
        Skip to main content
      </a>
      <header className="layout-header">
        <div className="layout-header-content">
          <div className="layout-header-branding">
            <Link to="/" className="layout-title-link" aria-label="Go to home page">
              <span className="layout-title">{siteName || 'Gallery 2 to Static'}</span>
            </Link>
            {siteDescription?.trim() && (
              <p className="layout-header-description">
                {parseBBCodeDecoded(siteDescription.trim())}
              </p>
            )}
          </div>
          <div className="layout-header-actions">
            {!isOriginal && <SearchBar />}
            <div className="layout-header-dropdowns">
              <ThemeDropdown />
              {!isOriginal && (
                <SortDropdown
                  currentOption={sortOption}
                  onOptionChange={setSortOption}
                />
              )}
            </div>
          </div>
        </div>
      </header>
      {isOriginal ? (
        <div className="layout-body layout-body-with-sidebar">
          <aside className="layout-sidebar" aria-label="Gallery navigation">
            <div className="layout-sidebar-block">
              <h2 className="layout-sidebar-title">Search the Gallery</h2>
              <div className="layout-sidebar-search">
                <SearchBar />
              </div>
              <Link to="/search" className="layout-sidebar-link">
                Advanced Search
              </Link>
            </div>
            <div className="layout-sidebar-block">
              <Link to="/rss" className="layout-sidebar-link layout-sidebar-link-icon">
                RSS Feed for this Album
              </Link>
              <Link to="/slideshow" className="layout-sidebar-link layout-sidebar-link-icon">
                View Slideshow
              </Link>
              <Link to="/slideshow-fullscreen" className="layout-sidebar-link layout-sidebar-link-icon">
                View Slideshow (Fullscreen)
              </Link>
            </div>
          </aside>
          <main id="main-content" className="layout-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      ) : (
        <main id="main-content" className="layout-main" tabIndex={-1}>
          {children}
        </main>
      )}
      <footer className="layout-footer">
        <div className="layout-footer-content">
          <p>&copy; 2026 the_louie</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
