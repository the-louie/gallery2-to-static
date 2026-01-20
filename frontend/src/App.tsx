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
 * - `/image/:id` - Image detail page (placeholder for lightbox)
 * - `*` - 404 Not Found page
 *
 * @returns React component
 */
function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/album/:id" element={<AlbumDetailPage />} />
        <Route path="/image/:id" element={<ImageDetailPage />} />
        <Route path="/not-found" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
