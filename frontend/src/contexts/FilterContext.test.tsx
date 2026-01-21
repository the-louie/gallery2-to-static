/**
 * Filter Context tests
 *
 * Comprehensive tests for FilterContext including provider, hook, and state management.
 *
 * @module frontend/src/contexts/FilterContext
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import {
  FilterProvider,
  useFilter,
  FilterContext,
  type FilterContextValue,
} from './FilterContext';
import type { FilterCriteria } from '@/types';

/**
 * Test component that uses useFilter hook
 */
function TestComponent() {
  const { criteria, setCriteria, clearFilters, hasActiveFilters } = useFilter();

  return (
    <div>
      <div data-testid="has-active-filters">
        {hasActiveFilters() ? 'true' : 'false'}
      </div>
      <div data-testid="criteria">
        {JSON.stringify(criteria)}
      </div>
      <button
        data-testid="set-criteria"
        onClick={() =>
          setCriteria({
            dateRange: { start: 1000000000000, end: 2000000000000 },
          })
        }
      >
        Set Criteria
      </button>
      <button data-testid="clear-filters" onClick={clearFilters}>
        Clear Filters
      </button>
    </div>
  );
}

describe('FilterProvider', () => {
  it('renders children', () => {
    render(
      <FilterProvider>
        <div>Test Content</div>
      </FilterProvider>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('provides default criteria when no defaultCriteria prop', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    );
    const criteriaElement = screen.getByTestId('criteria');
    expect(criteriaElement.textContent).toBe('{}');
  });

  it('uses defaultCriteria prop when provided', () => {
    const defaultCriteria: FilterCriteria = {
      albumType: 'GalleryPhotoItem',
    };
    render(
      <FilterProvider defaultCriteria={defaultCriteria}>
        <TestComponent />
      </FilterProvider>
    );
    const criteriaElement = screen.getByTestId('criteria');
    const criteria = JSON.parse(criteriaElement.textContent || '{}');
    expect(criteria.albumType).toBe('GalleryPhotoItem');
  });
});

describe('useFilter', () => {
  it('returns filter context value', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    );

    expect(screen.getByTestId('has-active-filters')).toBeInTheDocument();
    expect(screen.getByTestId('criteria')).toBeInTheDocument();
    expect(screen.getByTestId('set-criteria')).toBeInTheDocument();
    expect(screen.getByTestId('clear-filters')).toBeInTheDocument();
  });

  it('throws error when used outside FilterProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useFilter must be used within a FilterProvider');

    consoleSpy.mockRestore();
  });

  it('setCriteria updates criteria', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    );

    const setButton = screen.getByTestId('set-criteria');
    act(() => {
      setButton.click();
    });

    const criteriaElement = screen.getByTestId('criteria');
    const criteria = JSON.parse(criteriaElement.textContent || '{}');
    expect(criteria.dateRange).toBeDefined();
    expect(criteria.dateRange.start).toBe(1000000000000);
    expect(criteria.dateRange.end).toBe(2000000000000);
  });

  it('clearFilters resets criteria to empty', () => {
    const defaultCriteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
      albumType: 'GalleryPhotoItem',
    };
    render(
      <FilterProvider defaultCriteria={defaultCriteria}>
        <TestComponent />
      </FilterProvider>
    );

    const clearButton = screen.getByTestId('clear-filters');
    act(() => {
      clearButton.click();
    });

    const criteriaElement = screen.getByTestId('criteria');
    const criteria = JSON.parse(criteriaElement.textContent || '{}');
    expect(criteria).toEqual({});
  });

  it('hasActiveFilters returns false for empty criteria', () => {
    render(
      <FilterProvider>
        <TestComponent />
      </FilterProvider>
    );

    const hasActiveElement = screen.getByTestId('has-active-filters');
    expect(hasActiveElement.textContent).toBe('false');
  });

  it('hasActiveFilters returns true when filters are active', () => {
    const defaultCriteria: FilterCriteria = {
      dateRange: { start: 1000000000000, end: 2000000000000 },
    };
    render(
      <FilterProvider defaultCriteria={defaultCriteria}>
        <TestComponent />
      </FilterProvider>
    );

    const hasActiveElement = screen.getByTestId('has-active-filters');
    expect(hasActiveElement.textContent).toBe('true');
  });

  it('hasActiveFilters returns false when albumType is "all"', () => {
    const defaultCriteria: FilterCriteria = {
      albumType: 'all',
    };
    render(
      <FilterProvider defaultCriteria={defaultCriteria}>
        <TestComponent />
      </FilterProvider>
    );

    const hasActiveElement = screen.getByTestId('has-active-filters');
    expect(hasActiveElement.textContent).toBe('false');
  });
});

describe('FilterContext memoization', () => {
  it('provides stable context value', () => {
    let contextValue1: FilterContextValue | null = null;
    let contextValue2: FilterContextValue | null = null;

    function TestComponent1() {
      contextValue1 = useFilter();
      return null;
    }

    function TestComponent2() {
      contextValue2 = useFilter();
      return null;
    }

    render(
      <FilterProvider>
        <TestComponent1 />
        <TestComponent2 />
      </FilterProvider>
    );

    // Both components should receive the same context value
    expect(contextValue1).not.toBeNull();
    expect(contextValue2).not.toBeNull();
    expect(contextValue1?.criteria).toBe(contextValue2?.criteria);
    expect(contextValue1?.setCriteria).toBe(contextValue2?.setCriteria);
    expect(contextValue1?.clearFilters).toBe(contextValue2?.clearFilters);
  });
});
