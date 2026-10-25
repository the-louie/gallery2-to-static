import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMatrixLocation } from '@/hooks/useMatrixLocation';
import { useSiteMetadata } from '@/hooks/useSiteMetadata';
import { withTrailingSlash } from '@/utils/albumPath';
import xhtmlBadge from '@/assets/matrix/xhtml10.png';
import galleryBadge from '@/assets/matrix/gallery.gif';
import unpossibleBadge from '@/assets/matrix/g2-unpossible.png';
import './MatrixFrame.css';

/**
 * Props for the MatrixFrame component
 */
export interface MatrixFrameProps {
  /** The page: album or photo content, search results, … */
  children: React.ReactNode;
  /** Sidebar blocks (search, item links, peer list) */
  sidebar?: React.ReactNode;
}

interface Crumb {
  title: string;
  path: string | null;
}

/**
 * The page frame of Gallery 2's Matrix theme as lanbilder.se ran it in 2006 (classic theme,
 * THEME-01; spec `frontend/docs/theme-matrix.md`): nav bar with the breadcrumb, sidebar column,
 * content column, footer badges. The breadcrumb comes from the URL (useMatrixLocation), so pages
 * render only their content. Class names follow Gallery 2's (`gsNavBar`, `gbBreadCrumb`, …) so the
 * CSS reads against `docs/orig-page/2006/matrix-theme.css`.
 *
 * @example
 * ```tsx
 * <MatrixFrame sidebar={<SearchBlock />}>{page}</MatrixFrame>
 * ```
 */
export function MatrixFrame({ children, sidebar }: MatrixFrameProps) {
  const { pathname } = useLocation();
  const { location } = useMatrixLocation(pathname);
  const { siteName } = useSiteMetadata();

  const rootTitle = siteName || 'Gallery';
  const trail: Crumb[] = (location?.album.metadata.breadcrumbPath ?? []).map((item, i) => ({
    title: i === 0 ? rootTitle : item.title,
    path: withTrailingSlash(item.path),
  }));
  if (trail.length === 0) trail.push({ title: rootTitle, path: '/' });
  if (location?.photo) trail.push({ title: location.photo.title ?? '', path: null });
  // On an album or photo the last crumb is the page itself: text, not a link. Other pages (search,
  // not found) keep the root as a link back.
  const isAlbumPage = location !== null || pathname === '/';
  const crumbs = trail.map((c, i) => (isAlbumPage && i === trail.length - 1 ? { ...c, path: null } : c));

  return (
    <div className="g2-matrix">
      <div className="gsNavBar gcBorder1">
        <div className="gbBreadCrumb">
          <nav className="block-core-BreadCrumb" aria-label="Breadcrumb">
            {/* Gallery 2's markup had whitespace between the crumbs: a space before each » */}
            {crumbs.map((c, i) => (
              <React.Fragment key={c.path ?? 'current'}>
                {i > 0 && ' '}
                {c.path !== null ? (
                  <Link to={c.path} className={`BreadCrumb-${i + 1}`}>
                    {c.title}
                  </Link>
                ) : (
                  <span className={`BreadCrumb-${i + 1}`} aria-current="page">
                    {c.title}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>
      </div>
      <div className="gsColumns">
        <div className="gsSidebarCol">
          <aside className="gsSidebar gcBorder1" aria-label="Gallery navigation">
            {sidebar}
          </aside>
        </div>
        <main id="main-content" className="gsContent gcBorder1" tabIndex={-1}>
          {children}
        </main>
      </div>
      <footer className="gsFooter">
        <img src={xhtmlBadge} alt="XHTML 1.0" width={80} height={15} />
        <a href="https://sourceforge.net/projects/gallery/" rel="noopener noreferrer">
          <img src={galleryBadge} alt="Gallery 2.0" title="Gallery 2.0" width={80} height={15} />
        </a>
        <img src={unpossibleBadge} alt="G2.0: Unpossible!" title="G2.0: Unpossible!" width={80} height={15} />
      </footer>
    </div>
  );
}
