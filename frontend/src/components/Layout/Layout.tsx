import React, { useCallback, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ThemeDropdown } from '../ThemeDropdown';
import { MatrixFrame } from '../MatrixFrame';
import { getImageCache } from '@/utils/imageCache';
import { getViewKey } from '@/utils/viewKey';
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
 * In the classic theme the page sits in Gallery 2's Matrix frame (MatrixFrame, THEME-01) instead.
 *
 * Includes (light and dark themes):
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
  const { isClassic } = useTheme();
  const { option: sortOption, setOption: setSortOption } = useSort('albums');
  const location = useLocation();
  const isInitialMountRef = useRef(true);

  // Clear image cache when the view changes so the previous view's decoded images can be GC'd
  // (Phase 3). Stepping between images of one album is not a view change: the lightbox's
  // preloaded neighbours must stay cached (PERF-03).
  const viewKey = getViewKey(location.pathname);
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    getImageCache().clear();
  }, [viewKey]);

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

  const skipLink = (
    <a
      href="#main-content"
      className="skip-link"
      aria-label="Skip to main content"
      onClick={handleSkipClick}
    >
      Skip to main content
    </a>
  );

  // Classic theme: Gallery 2's Matrix frame, no app header or footer (THEME-01)
  if (isClassic) {
    return (
      <div className={className ? `layout layout-matrix ${className}` : 'layout layout-matrix'}>
        {skipLink}
        <MatrixFrame
          sidebar={
            <>
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
                <Link to="/slideshow" className="layout-sidebar-link layout-sidebar-link-icon">
                  View Slideshow
                </Link>
                <Link to="/slideshow-fullscreen" className="layout-sidebar-link layout-sidebar-link-icon">
                  View Slideshow (Fullscreen)
                </Link>
              </div>
            </>
          }
        >
          {children}
        </MatrixFrame>
      </div>
    );
  }

  return (
    <div className={className ? `layout ${className}` : 'layout'}>
      {skipLink}
      <header className="layout-header">
        <div className="layout-header-content">
          <div className="layout-header-branding">
            <Link to="/" className="layout-title-link" aria-label="Go to home page">
              <h1 className="layout-title">{siteName || 'Gallery 2 to Static'}</h1>
            </Link>
            {siteDescription?.trim() && (
              <p className="layout-header-description">
                {parseBBCodeDecoded(siteDescription.trim())}
              </p>
            )}
          </div>
          <div className="layout-header-actions">
            <SearchBar />
            <div className="layout-header-dropdowns">
              <ThemeDropdown />
              <SortDropdown
                currentOption={sortOption}
                onOptionChange={setSortOption}
              />
            </div>
          </div>
        </div>
      </header>
      <main id="main-content" className="layout-main" tabIndex={-1}>
        {children}
      </main>
      <footer className="layout-footer">
        <div className="layout-footer-content">
          <p>&copy; 2026 the_louie</p>
        </div>
      </footer>
    </div>
  );
}
