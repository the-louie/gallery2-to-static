import React from 'react';
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
 * - Header with title/logo area
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
  return (
    <div className={className ? `layout ${className}` : 'layout'}>
      <a href="#main-content" className="skip-link" aria-label="Skip to main content">
        Skip to main content
      </a>
      <header className="layout-header">
        <div className="layout-header-content">
          <h1 className="layout-title">Gallery 2 to Static</h1>
        </div>
      </header>
      <main id="main-content" className="layout-main">
        {children}
      </main>
      <footer className="layout-footer">
        <div className="layout-footer-content">
          <p>&copy; 2025 the_louie</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
