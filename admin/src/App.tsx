import type { ReactNode } from "react";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthGate } from "./components/AuthGate";
import { Layout } from "./components/Layout";
import { AlbumPage } from "./pages/AlbumPage";

/** Route table. A hash router: the app is served from one path, no rewrites. */
export function AppRoutes(): ReactNode {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/albums/root" replace />} />
        <Route path="/albums/:id" element={<AlbumPage />} />
        <Route path="*" element={<Navigate to="/albums/root" replace />} />
      </Route>
    </Routes>
  );
}

/** The admin app: session gate around the routed screens. */
export function App(): ReactNode {
  return (
    <AuthGate>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthGate>
  );
}
