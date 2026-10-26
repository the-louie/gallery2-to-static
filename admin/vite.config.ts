import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Admin UI build. `base: "./"` makes the asset paths relative so `dist/` can be
 * served from any path on the admin hostname. In dev, `/api` is proxied to the
 * mock server (`npm run mock`, port 3101) or to the real admin service when
 * `ADMIN_API` is set (e.g. `ADMIN_API=http://127.0.0.1:3100 npm run dev`).
 */
export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: process.env.ADMIN_API ?? "http://127.0.0.1:3101",
        changeOrigin: false,
      },
      // The mock serves placeholder thumbnails; the real ones live on the public site
      // (set VITE_PUBLIC_SITE=https://lanbilder.se when developing against the real API).
      "/g2data": {
        target: process.env.ADMIN_API ?? "http://127.0.0.1:3101",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
  },
  test: {
    globals: false,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    maxWorkers: 2,
  },
});
