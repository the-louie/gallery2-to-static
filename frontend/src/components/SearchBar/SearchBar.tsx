/**
 * SearchBar Component
 *
 * A search input component with debouncing, clear button, and keyboard navigation.
 * Navigates to search results page when user searches.
 *
 * ## Features
 *
 * - Debounced input (300ms delay)
 * - Clear button (X) when query is not empty
 * - Keyboard navigation (Enter to search, Escape to clear)
 * - Accessible labels and ARIA attributes
 * - Navigates to search results page on search
 *
 * ## Accessibility
 *
 * - Uses native input element for built-in accessibility
 * - Proper ARIA labels and descriptions
 * - Keyboard navigation support
 * - Focus management
 *
 * ## Usage
 *
 * ```tsx
 * import { SearchBar } from './components/SearchBar';
 *
 * function Header() {
 *   return (
 *     <header>
 *       <SearchBar />
 *     </header>
 *   );
 * }
 * ```
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './SearchBar.css';

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
  /** Optional CSS class name */
  className?: string;
  /** Optional placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceDelay?: number;
}

/**
 * Search icon SVG
 */
function SearchIcon(): React.ReactElement {
  return (
    <svg
      className="search-bar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

/**
 * Clear icon SVG (X)
 */
function ClearIcon(): React.ReactElement {
  return (
    <svg
      className="search-bar-clear-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * SearchBar Component
 *
 * Input field with search icon, debouncing, and clear button.
 *
 * @param props - Component props
 * @returns SearchBar component
 */
export function SearchBar({
  className,
  placeholder = 'Search albums and images...',
  debounceDelay = 300,
}: SearchBarProps): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState<string>('');
  const [localQuery, setLocalQuery] = useState<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * Navigate to search results page; when on an album route, include &album=id for context ordering.
   */
  const performSearch = useCallback(
    (searchQuery: string) => {
      const trimmedQuery = searchQuery.trim();
      if (trimmedQuery.length > 0) {
        const m = location.pathname.match(/^\/album\/(\d+)/);
        const albumId = m ? m[1] : undefined;
        navigate(
          `/search?q=${encodeURIComponent(trimmedQuery)}${albumId != null ? `&album=${albumId}` : ''}`,
        );
      } else {
        // Clear search - navigate away from search page if on it
        if (location.pathname === '/search') {
          navigate('/');
        }
      }
    },
    [navigate, location.pathname],
  );

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalQuery(newValue);

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        setQuery(newValue);
        performSearch(newValue);
        debounceTimerRef.current = null;
      }, debounceDelay);
    },
    [debounceDelay, performSearch],
  );

  /**
   * Handle form submit (Enter key)
   */
  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      // Perform search immediately
      const trimmedQuery = localQuery.trim();
      setQuery(trimmedQuery);
      performSearch(trimmedQuery);
    },
    [localQuery, performSearch],
  );

  /**
   * Handle clear button click
   */
  const handleClear = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    setLocalQuery('');
    setQuery('');
    performSearch('');
    // Focus input after clearing
    inputRef.current?.focus();
  }, [performSearch]);

  /**
   * Handle Escape key to clear
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        handleClear();
      }
    },
    [handleClear],
  );

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Sync with URL query param on search page; clear search field when navigating away from /search
  useEffect(() => {
    if (location.pathname === '/search') {
      const urlParams = new URLSearchParams(location.search);
      const urlQuery = urlParams.get('q') || '';
      setLocalQuery((prevLocalQuery) => {
        if (urlQuery !== prevLocalQuery) {
          setQuery(urlQuery);
          return urlQuery;
        }
        return prevLocalQuery;
      });
    } else {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setLocalQuery('');
      setQuery('');
    }
  }, [location.pathname, location.search]);

  const containerClassName = className
    ? `search-bar ${className}`
    : 'search-bar';
  const showClearButton = localQuery.length > 0;

  return (
    <form
      className={containerClassName}
      onSubmit={handleSubmit}
      role="search"
      aria-label="Search albums and images"
    >
      <div className="search-bar-input-wrapper">
        <SearchIcon />
        <input
          ref={inputRef}
          type="search"
          className="search-bar-input"
          placeholder={placeholder}
          value={localQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          aria-label="Search albums and images"
          aria-describedby="search-bar-description"
        />
        {showClearButton && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={handleClear}
            aria-label="Clear search"
            title="Clear search"
          >
            <ClearIcon />
          </button>
        )}
      </div>
      <span id="search-bar-description" className="visually-hidden">
        Search through album and image titles and descriptions
      </span>
    </form>
  );
}

export default SearchBar;
