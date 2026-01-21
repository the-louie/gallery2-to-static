/**
 * PageLoader Component
 *
 * Loading fallback component for Suspense boundaries when lazy-loading pages.
 * Provides a simple loading indicator for better UX during code-split chunk loading.
 *
 * @module frontend/src/components/PageLoader
 */

/**
 * PageLoader component
 *
 * Displays a loading indicator while a lazy-loaded page component is being loaded.
 *
 * @returns React component
 */
export function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="Loading page">
      <div>Loading...</div>
    </div>
  );
}

export default PageLoader;
