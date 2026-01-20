/**
 * Breadcrumbs Component
 *
 * Displays breadcrumb navigation showing the album hierarchy path from root
 * to the current album. Provides navigation links to parent albums and indicates
 * the current page location.
 *
 * @module frontend/src/components/Breadcrumbs
 */

import React from 'react';
import { Link } from 'react-router-dom';
import type { BreadcrumbPath, BreadcrumbItem } from '@/types';
import './Breadcrumbs.css';

/**
 * Props for the Breadcrumbs component
 */
export interface BreadcrumbProps {
  /** Breadcrumb path to display (from root to current) */
  path: BreadcrumbPath;
  /** Optional click handler for breadcrumb items */
  onItemClick?: (item: BreadcrumbItem) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Breadcrumbs component
 *
 * Renders a breadcrumb navigation trail with semantic HTML and ARIA attributes
 * for accessibility. The last item represents the current page and is not a link.
 *
 * @param props - Component props
 * @returns React component
 *
 * @example
 * ```tsx
 * const path = [
 *   { id: 7, title: "Home", path: "/" },
 *   { id: 10, title: "Photos", path: "/album/10" },
 *   { id: 20, title: "2024", path: "/album/20" }
 * ];
 * <Breadcrumbs path={path} />
 * ```
 */
export function Breadcrumbs({
  path,
  onItemClick,
  className,
}: BreadcrumbProps) {
  // Don't render if path is empty
  if (!path || path.length === 0) {
    return null;
  }

  // Don't render if only home (single item)
  if (path.length === 1 && path[0].path === '/') {
    return null;
  }

  const handleItemClick = (item: BreadcrumbItem, event: React.MouseEvent) => {
    if (onItemClick) {
      event.preventDefault();
      onItemClick(item);
    }
  };

  return (
    <nav
      className={className ? `breadcrumbs ${className}` : 'breadcrumbs'}
      aria-label="Breadcrumb"
    >
      <ol className="breadcrumbs-list">
        {path.map((item, index) => {
          const isLast = index === path.length - 1;
          const isHome = item.path === '/';

          return (
            <li key={item.id} className="breadcrumbs-item">
              {isLast ? (
                // Current page - not a link, with aria-current
                <span
                  className="breadcrumbs-current"
                  aria-current="page"
                  aria-label={`Current page: ${item.title}`}
                >
                  {item.title}
                </span>
              ) : (
                // Parent page - link
                <Link
                  to={item.path}
                  className="breadcrumbs-link"
                  onClick={(e) => handleItemClick(item, e)}
                  aria-label={
                    isHome
                      ? `Go to home page`
                      : `Go to ${item.title} album`
                  }
                >
                  {isHome ? 'Home' : item.title}
                </Link>
              )}
              {!isLast && (
                <span
                  className="breadcrumbs-separator"
                  aria-hidden="true"
                >
                  {' '}
                  /{' '}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
