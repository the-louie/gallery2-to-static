import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PageLoader } from './components/PageLoader';

// Lazy load page components for code splitting
const HomePage = lazy(() => import('./pages/HomePage').then((module) => ({ default: module.HomePage })));
const AlbumDetailPage = lazy(() => import('./pages/AlbumDetailPage').then((module) => ({ default: module.AlbumDetailPage })));
const ImageDetailPage = lazy(() => import('./pages/ImageDetailPage').then((module) => ({ default: module.ImageDetailPage })));
const SearchResultsPage = lazy(() => import('./pages/SearchResultsPage').then((module) => ({ default: module.SearchResultsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })));

/**
 * App Component
 *
 * Main application component that sets up routing. Uses React Router v6
 * with HashRouter for static hosting compatibility.
 *
 * Routes:
 * - `/` - Home page (root album)
 * - `/album/:id` - Album detail page
 * - `/album/:albumId/image/:imageId` - Image detail page with lightbox (hierarchical route)
 * - `/image/:id` - Image detail page (legacy route, still supported)
 * - `*` - 404 Not Found page
 *
 * Note: The hierarchical route `/album/:albumId/image/:imageId` should be defined before
 * the simpler `/album/:id` route to ensure proper matching, but React Router v6 matches
 * more specific routes first, so ordering doesn't matter here.
 *
 * @returns React component
 */
function App() {
  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/album/:albumId/image/:imageId" element={<ImageDetailPage />} />
          <Route path="/album/:id" element={<AlbumDetailPage />} />
          <Route path="/image/:id" element={<ImageDetailPage />} />
          <Route path="/not-found" element={<NotFoundPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}

export default App;
