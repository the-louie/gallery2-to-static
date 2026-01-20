/**
 * NotFoundPage Component
 *
 * 404 error page displayed when a route is not found or invalid.
 * Provides navigation back to the home page.
 *
 * @module frontend/src/pages
 */

import { Link } from 'react-router-dom';

/**
 * NotFoundPage component
 *
 * Displays a user-friendly 404 error message with a link to return
 * to the home page.
 *
 * @returns React component
 */
export function NotFoundPage() {
  return (
    <div className="not-found-page" role="alert">
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <p>
        <Link to="/" aria-label="Go to home page">
          Return to Home
        </Link>
      </p>
    </div>
  );
}

export default NotFoundPage;
