import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useMatrixLocation } from '@/hooks/useMatrixLocation';
import { useSiteMetadata } from '@/hooks/useSiteMetadata';
import { withTrailingSlash } from '@/utils/albumPath';
import { MatrixSidebar } from '../MatrixSidebar';
import { MatrixThemeSwitch } from '../MatrixThemeSwitch';
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
}

interface Crumb {
  title: string;
  path: string | null;
}

/**
 * The page frame of Gallery 2's Matrix theme as lanbilder.se ran it in 2006 (classic theme,
 * THEME-01; spec `frontend/docs/theme-matrix.md`): nav bar with the breadcrumb, sidebar (MatrixSidebar),
 * content column, footer badges. The breadcrumb comes from the URL (useMatrixLocation), so pages
 * render only their content. Class names follow Gallery 2's (`gsNavBar`, `gbBreadCrumb`, …) so the
 * CSS reads against `docs/orig-page/2006/matrix-theme.css`.
 *
 * @example
 * ```tsx
 * <MatrixFrame>{page}</MatrixFrame>
 * ```
 */
export function MatrixFrame({ children }: MatrixFrameProps) {
  const { pathname } = useLocation();
  const { location } = useMatrixLocation(pathname);
  const { siteName } = useSiteMetadata();

  const rootTitle = siteName || import.meta.env.VITE_SITE_NAME || 'Gallery';
  // Gallery 2 titled every page with the item's title (the root album's is the site name)
  const pageTitle = location?.photo?.title || location?.album.metadata.albumTitle || rootTitle;
  useEffect(() => {
    document.title = pageTitle;
  }, [pageTitle]);
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

  // The banner slot above the nav bar, where lanbilder.se had its ad in 2006 (BANNER-01): set at build
  const banner = import.meta.env.VITE_BANNER_SRC && import.meta.env.VITE_BANNER_HREF ? {
    src: import.meta.env.VITE_BANNER_SRC,
    src2x: import.meta.env.VITE_BANNER_SRC_2X,
    small: import.meta.env.VITE_BANNER_SRC_SMALL,
    small2x: import.meta.env.VITE_BANNER_SRC_SMALL_2X,
    large: import.meta.env.VITE_BANNER_SRC_LARGE,
    large2x: import.meta.env.VITE_BANNER_SRC_LARGE_2X,
    href: import.meta.env.VITE_BANNER_HREF,
    alt: import.meta.env.VITE_BANNER_ALT ?? '',
  } : null;

  return (
    <div id="gallery" className="g2-matrix">
      {banner && (
        <div id="gsHeader" className="gsHeader">
          <a href={banner.href} target="_blank" rel="noopener noreferrer">
            <picture>
              {banner.small && (
                <source media="(max-width: 759px)" srcSet={banner.small2x ? `${banner.small}, ${banner.small2x} 2x` : banner.small} />
              )}
              {banner.large && (
                <source media="(min-width: 1024px)" srcSet={banner.large2x ? `${banner.large}, ${banner.large2x} 2x` : banner.large} />
              )}
              <img src={banner.src} srcSet={banner.src2x ? `${banner.src}, ${banner.src2x} 2x` : undefined} alt={banner.alt} />
            </picture>
          </a>
        </div>
      )}
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
      {/* Phones only (MatrixFrame.css): the theme selector above the content, so a visitor can leave
          the classic look without scrolling past the content and the whole sidebar (operator, 2026-11-22).
          The sidebar keeps its own copy on desktop; one shows per breakpoint. */}
      <MatrixThemeSwitch className="gsThemeSwitchTop" />
      <div className="gsColumns">
        <div className="gsSidebarCol">
          <aside className="gsSidebar gcBorder1" aria-label="Gallery navigation">
            <MatrixSidebar location={location} />
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
