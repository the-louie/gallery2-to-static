/**
 * PlaceholderPage Component
 *
 * Displays a placeholder message for features not yet implemented.
 *
 * @module frontend/src/pages
 */

import './PlaceholderPage.css';

/**
 * PlaceholderPage component
 *
 * @param props.title - The feature name to display (e.g. "RSS Feed", "Slideshow")
 * @returns React component
 */
export function PlaceholderPage({
  title,
}: {
  title: string;
}) {
  return (
    <div className="placeholder-page">
      <h2>{title} is a lie</h2>
      <p>it might come in the future</p>
    </div>
  );
}

export default PlaceholderPage;
