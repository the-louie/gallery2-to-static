/**
 * VirtualGrid Component
 *
 * A virtual scrolling grid wrapper component that efficiently renders only visible items
 * for large datasets. Uses react-virtuoso for virtualization with support for both grid
 * and list view modes, responsive column calculation, and dynamic height calculation.
 *
 * @module frontend/src/components/VirtualGrid
 */

import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import './VirtualGrid.css';

/**
 * Props for VirtualGrid component
 */
export interface VirtualGridProps<T> {
  /** Array of items to render */
  items: T[];
  /** Function to render each item */
  renderItem: (item: T, index: number) => React.ReactNode;
  /** View mode: 'grid' or 'list' */
  viewMode?: 'grid' | 'list';
  /** Optional CSS class name */
  className?: string;
  /** Optional role attribute */
  role?: string;
  /** Optional aria-label */
  'aria-label'?: string;
  /** Optional callback when scroll position changes */
  onScroll?: (scrollTop: number) => void;
  /** Optional initial scroll position */
  initialScrollTop?: number;
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
 * Provides virtual scrolling for grid layouts with responsive column calculation.
 * Only renders visible items to improve performance with large datasets.
 *
 * @param props - Component props
 * @returns React component
 */
export function VirtualGrid<T>({
  items,
  renderItem,
  viewMode = 'grid',
  className,
  role = 'region',
  'aria-label': ariaLabel,
  onScroll,
  initialScrollTop,
  itemHeight,
  gap = 16,
}: VirtualGridProps<T>) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024,
  );
  const [measuredItemHeight, setMeasuredItemHeight] = useState<number | null>(itemHeight || null);

  // Calculate columns based on window width
  const columns = useMemo(() => {
    if (viewMode === 'list') return 1;
    return calculateColumns(windowWidth);
  }, [viewMode, windowWidth]);

  // Calculate rows needed for grid
  const totalRows = useMemo(() => {
    if (items.length === 0) return 0;
    if (viewMode === 'list') return items.length;
    return Math.ceil(items.length / columns);
  }, [items.length, columns, viewMode]);

  // Handle window resize
  useEffect(() => {
    if (viewMode === 'list') return;

    // Debounce resize events
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
  }, [viewMode]);

  // Measure item height from first rendered item if not provided
  useEffect(() => {
    if (itemHeight || measuredItemHeight || items.length === 0) return;

    // Try to measure from first item after render
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const firstItem = containerRef.current.querySelector('[data-item-index="0"]');
        if (firstItem) {
          const height = firstItem.getBoundingClientRect().height;
          if (height > 0) {
            setMeasuredItemHeight(height);
          }
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [itemHeight, measuredItemHeight, items.length]);

  // Use measured or provided height, with fallback
  const finalItemHeight = itemHeight || measuredItemHeight || 200;

  // Restore scroll position on mount
  useEffect(() => {
    if (initialScrollTop !== undefined && initialScrollTop > 0 && virtuosoRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        // Use scrollTo for precise scroll position restoration
        try {
          virtuosoRef.current?.scrollTo({ top: initialScrollTop, behavior: 'auto' });
        } catch (error) {
          // Fallback if scrollTo fails
          // Ignore errors
        }
      });
    }
  }, [initialScrollTop]);

  // Handle scroll events
  // react-virtuoso's onScroll passes a ListScrollLocation object
  const handleScroll = useCallback(
    (location: { listOffset: number }) => {
      if (onScroll) {
        // Convert listOffset to scrollTop (listOffset is negative when scrolled down)
        const scrollTop = Math.max(0, -location.listOffset);
        onScroll(scrollTop);
      }
    },
    [onScroll],
  );

  // Render row for grid mode
  const renderRow = useCallback(
    (index: number) => {
      if (viewMode === 'list') {
        const item = items[index];
        if (!item) return null;
        return (
          <div key={index} data-item-index={index}>
            {renderItem(item, index)}
          </div>
        );
      }

      // Grid mode: render a row with multiple items
      const startIndex = index * columns;
      const rowItems = items.slice(startIndex, startIndex + columns);

      return (
        <div
          className="virtual-grid-row"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: `${gap}px`,
          }}
          data-item-index={index}
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
    },
    [items, columns, viewMode, renderItem, gap],
  );

  // Empty state
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

  // List mode: use simple list
  if (viewMode === 'list') {
    return (
      <div
        className={className ? `virtual-grid virtual-grid-list ${className}` : 'virtual-grid virtual-grid-list'}
        role={role}
        aria-label={ariaLabel}
        ref={containerRef}
      >
        <Virtuoso
          ref={virtuosoRef}
          totalCount={items.length}
          itemContent={renderRow}
          style={{ height: '100%', width: '100%' }}
          overscan={5}
          defaultItemHeight={finalItemHeight}
          onScroll={handleScroll}
        />
      </div>
    );
  }

  // Grid mode: use grid layout
  return (
    <div
      className={className ? `virtual-grid virtual-grid-grid ${className}` : 'virtual-grid virtual-grid-grid'}
      role={role}
      aria-label={ariaLabel}
      ref={containerRef}
    >
      <Virtuoso
        ref={virtuosoRef}
        totalCount={totalRows}
        itemContent={renderRow}
        style={{ height: '100%', width: '100%' }}
        overscan={2}
        defaultItemHeight={finalItemHeight}
        onScroll={handleScroll}
      />
    </div>
  );
}

export default VirtualGrid;
