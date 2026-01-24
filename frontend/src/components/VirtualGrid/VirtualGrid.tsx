/**
 * VirtualGrid Component
 *
 * A responsive grid wrapper component that renders all items in a grid layout.
 * The container grows to fit all children and scrolls with the page.
 *
 * Scroll position tracking is supported via the onScroll callback, but scroll
 * restoration is handled by React Router and the browser's native scroll restoration.
 *
 * @module frontend/src/components/VirtualGrid
 */

import React, { useMemo, useEffect, useRef, useState } from 'react';
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
  /** Optional item height (for fixed height items) */
  itemHeight?: number;
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
 * Provides responsive grid layouts that grow to fit all children.
 * Renders all items directly, allowing the container to expand and scroll with the page.
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
  itemHeight,
  gap = 16,
}: VirtualGridProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );

  const columns = useMemo(() => calculateColumns(windowWidth), [windowWidth]);

  const totalRows = useMemo(() => {
    if (items.length === 0) return 0;
    return Math.ceil(items.length / columns);
  }, [items.length, columns]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
        timeoutId = null;
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Handle page scroll for scroll position tracking
  useEffect(() => {
    if (!onScroll) return;

    const handlePageScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      onScroll(scrollTop);
    };

    window.addEventListener('scroll', handlePageScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handlePageScroll);
    };
  }, [onScroll]);

  if (items.length === 0) {
    return (
      <div
        className={className ? `virtual-grid ${className}` : 'virtual-grid'}
        role={role}
        aria-label={ariaLabel}
        ref={containerRef}
      />
    );
  }

  return (
    <div
      className={className ? `virtual-grid virtual-grid-grid ${className}` : 'virtual-grid virtual-grid-grid'}
      role={role}
      aria-label={ariaLabel}
      ref={containerRef}
    >
      {Array.from({ length: totalRows }, (_, rowIndex) => {
        const startIndex = rowIndex * columns;
        const rowItems = items.slice(startIndex, startIndex + columns);

        return (
          <div
            key={rowIndex}
            className="virtual-grid-row"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${columns}, 1fr)`,
              gap: `${gap}px`,
            }}
            data-item-index={rowIndex}
          >
            {rowItems.map((item, colIndex) => {
              const itemIndex = startIndex + colIndex;
              return (
                <div key={itemIndex} data-item-index={itemIndex}>
                  {renderItem(item, itemIndex)}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default VirtualGrid;
