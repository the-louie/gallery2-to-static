/**
 * SearchHighlight Component
 *
 * Component to highlight search terms in text using subsequence matching.
 * Characters in the query must appear in order but not necessarily adjacent.
 * Wraps matching characters in highlight spans for visual emphasis.
 *
 * ## Features
 *
 * - Subsequence matching (e.g., "fbsd" matches "FreeBSD")
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
  as?: keyof React.JSX.IntrinsicElements;
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
      {/* Index keys are right here: the parts are rebuilt from text + query on every render and hold no state */}
      {parts.map((part, index) => {
        if (typeof part === 'string') {
          // eslint-disable-next-line @eslint-react/no-array-index-key -- see above
          return <React.Fragment key={index}>{part}</React.Fragment>;
        }
        return (
          // eslint-disable-next-line @eslint-react/no-array-index-key -- see above
          <mark key={index} className="search-highlight-mark">
            {part.text}
          </mark>
        );
      })}
    </Component>
  );
}
