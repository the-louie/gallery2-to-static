import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import {
  HomePage,
  AlbumDetailPage,
  ImageDetailPage,
  NotFoundPage,
} from './pages';

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
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/album/:albumId/image/:imageId" element={<ImageDetailPage />} />
        <Route path="/album/:id" element={<AlbumDetailPage />} />
        <Route path="/image/:id" element={<ImageDetailPage />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
