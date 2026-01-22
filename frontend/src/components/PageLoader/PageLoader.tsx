/**
 * PageLoader Component
 *
 * Loading fallback component for Suspense boundaries when lazy-loading pages.
 * Provides a loading indicator with spinner animation for better UX during
 * code-split chunk loading.
 *
 * @module frontend/src/components/PageLoader
 */

import { LoadingSpinner } from '@/components/LoadingSpinner';
import './PageLoader.css';

/**
 * PageLoader component
 *
 * Displays a loading indicator with spinner while a lazy-loaded page component
 * is being loaded. Includes proper ARIA attributes for accessibility.
 *
 * @returns React component
 */
export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page" aria-live="polite">
      <LoadingSpinner size="large" label="Loading page..." />
    </div>
  );
}

export default PageLoader;
