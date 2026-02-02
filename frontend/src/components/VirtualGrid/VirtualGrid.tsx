/**
 * VirtualGrid Component
 *
 * A responsive virtualized grid that mounts only visible (and overscan) items so
 * the browser can reclaim decoded image data for off-screen items. Uses
 * react-virtuoso VirtuosoGrid with window scrolling; column breakpoints match
 * existing layout (1/2/4/5 columns by width).
 *
 * Scroll position tracking is supported via the onScroll callback; scroll
 * restoration is handled by React Router and the browser's native scroll restoration.
 *
 * @module frontend/src/components/VirtualGrid
 */

import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { VirtuosoGrid } from 'react-virtuoso';
import './VirtualGrid.css';

/**
 * Props for VirtualGrid component
 */
export interface VirtualGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Function to render each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Optional CSS class name */
  className?: string;
  /** Optional role attribute */
  role?: string;
  /** Optional aria-label */
  'aria-label'?: string;
  /** Optional callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Optional gap between items */
  gap?: number;
}

/**
 * Calculate number of columns based on window width and breakpoints
 *
 * Breakpoints match existing CSS:
 * - Mobile (< 768px): 1 column
 * - Tablet (768px - 1023px): 2 columns
 * - Desktop (1024px - 1439px): 4 columns
 * - Large Desktop (>= 1440px): 5 columns
 */
function calculateColumns(width: number): number {
  if (width < 768) return 1;
  if (width < 1024) return 2;
  if (width < 1440) return 4;
  return 5;
}

/**
 * VirtualGrid component
 *
 * Virtualized grid: only visible and overscan items are mounted so off-screen
 * image/album cells can be unmounted and garbage-collected. Uses VirtuosoGrid
 * with useWindowScroll so the page document scrolls; column count is responsive.
 *
 * @param props - Component props
 * @returns React component
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  className,
  role = 'region',
  'aria-label': ariaLabel,
  onScroll,
  gap = 16,
}: VirtualGridProps<T>) {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  const columns = useMemo(() => calculateColumns(windowWidth), [windowWidth]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
        timeoutId = null;
      }, 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!onScroll) return;
    const handlePageScroll = () => {
      const scrollTop = window.pageYOffset ?? document.documentElement.scrollTop;
      onScroll(scrollTop);
    };
    window.addEventListener('scroll', handlePageScroll, { passive: true });
    return () => window.removeEventListener('scroll', handlePageScroll);
  }, [onScroll]);

  const itemContent = useCallback(
    (index: number, item: T) => renderItem(item, index),
    [renderItem],
  );

  const listClassName = useMemo(
    () => `virtual-grid-list virtual-grid-cols-${columns}`,
    [columns],
  );

  if (items.length === 0) {
    return (
      <div
        className={className ? `virtual-grid ${className}` : 'virtual-grid'}
        role={role}
        aria-label={ariaLabel}
      />
    );
  }

  return (
    <div
      className={className ? `virtual-grid virtual-grid-grid ${className}` : 'virtual-grid virtual-grid-grid'}
      role={role}
      aria-label={ariaLabel}
      style={{ ['--virtual-grid-gap' as string]: `${gap}px` }}
    >
      <VirtuosoGrid<T>
        data={items}
        itemContent={itemContent}
        useWindowScroll
        listClassName={listClassName}
        overscan={50}
        increaseViewportBy={{ top: 200, bottom: 200 }}
        computeItemKey={(index, item) => {
          const key = (item as { id?: unknown })?.id;
          return key != null ? String(key) : String(index);
        }}
        style={{ minHeight: 400 }}
      />
    </div>
  );
}

export default VirtualGrid;
