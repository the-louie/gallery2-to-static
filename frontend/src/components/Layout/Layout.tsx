import React, { useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ThemeDropdown } from '../ThemeDropdown';
import { SearchBar } from '../SearchBar';
import { SortDropdown } from '../SortDropdown';
import { useSiteMetadata } from '@/hooks/useSiteMetadata';
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
  const { siteName } = useSiteMetadata();
  const { option: sortOption, setOption: setSortOption } = useSort('albums');
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
          <Link to="/" className="layout-title-link" aria-label="Go to home page">
            <span className="layout-title">{siteName || 'Gallery 2 to Static'}</span>
          </Link>
          <div className="layout-header-actions">
            <SearchBar />
            <ThemeDropdown />
            <SortDropdown
              currentOption={sortOption}
              onOptionChange={setSortOption}
            />
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

export default Layout;
