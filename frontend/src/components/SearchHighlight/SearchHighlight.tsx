/**
 * SearchHighlight Component
 *
 * Component to highlight search terms in text. Wraps matching text in
 * highlight spans for visual emphasis.
 *
 * ## Features
 *
 * - Case-insensitive matching
 * - Preserves original text case
 * - Handles empty/null text gracefully
 * - HTML-safe (escapes HTML in text)
 *
 * ## Usage
 *
 * ```tsx
 * import { SearchHighlight } from './components/SearchHighlight';
 *
 * function SearchResult({ title, query }) {
 *   return (
 *     <div>
 *       <SearchHighlight text={title} query={query} />
 *     </div>
 *   );
 * }
 * ```
 */

import React from 'react';
import { highlightText } from '../../utils/searchHighlight';
import './SearchHighlight.css';

/**
 * Props for SearchHighlight component
 */
export interface SearchHighlightProps {
  /** Text to highlight */
  text: string | null | undefined;
  /** Search query to highlight */
  query: string;
  /** Optional CSS class name */
  className?: string;
  /** HTML tag to use for container (default: 'span') */
  as?: keyof JSX.IntrinsicElements;
}

/**
 * SearchHighlight Component
 *
 * Displays text with search terms highlighted.
 *
 * @param props - Component props
 * @returns React element with highlighted text
 */
export function SearchHighlight({
  text,
  query,
  className,
  as: Component = 'span',
}: SearchHighlightProps): React.ReactElement {
  // Handle empty/null text
  if (!text || text.length === 0) {
    return <Component className={className} />;
  }

  // If no query, return text as-is
  if (!query || query.trim().length === 0) {
    return <Component className={className}>{text}</Component>;
  }

  // Get highlighted parts
  const parts = highlightText(text, query);

  return (
    <Component className={className}>
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        return (
          <mark key={index} className="search-highlight-mark">
            {part.text}
          </mark>
        );
      })}
    </Component>
  );
}

export default SearchHighlight;
