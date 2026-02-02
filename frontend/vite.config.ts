import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { visualizer } from 'rollup-plugin-visualizer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Serve project-root data/ at /data/ in dev so album JSON (e.g. /data/338910.json) loads without copying to public. */
function serveDataPlugin() {
  const dataDir = path.resolve(__dirname, '..', 'data');
  return {
    name: 'serve-data',
    apply: 'serve',
    configureServer(server: { middlewares: { use: (path: string, handler: (req: unknown, res: unknown, next: () => void) => void) => void } }) {
      server.middlewares.use('/data', (req: { url?: string; method?: string }, res: { setHeader: (n: string, v: string) => void }, next: () => void) => {
        if (req.method !== 'GET' || !req.url) {
          next();
          return;
        }
        const rawPath = req.url.split('?')[0];
        const afterData = rawPath.startsWith('/data') ? rawPath.slice('/data'.length) || '/' : rawPath;
        let segment: string;
        try {
          segment = decodeURIComponent(afterData).replace(/^\//, '').trim() || '';
        } catch {
          next();
          return;
        }
        if (segment.includes('..')) {
          next();
          return;
        }
        const filePath = path.join(dataDir, segment);
        const resolved = path.resolve(filePath);
        if (!resolved.startsWith(path.resolve(dataDir)) || !resolved.endsWith('.json')) {
          next();
          return;
        }
        fs.stat(filePath, (err, stat) => {
          if (err || !stat?.isFile()) {
            next();
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          const stream = fs.createReadStream(filePath);
          stream.on('error', next);
          stream.pipe(res as NodeJS.WritableStream);
        });
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serveDataPlugin(),
    visualizer({
      filename: './dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/styles': path.resolve(__dirname, './src/styles'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
    },
  },
  server: {
    // Allow access to parent directory for JSON imports from ../data/
    fs: {
      allow: ['..'],
    },
    // Proxy cross-origin image base URL in dev to avoid OpaqueResponseBlocking (CORS/CORP).
    // Set VITE_IMAGE_PROXY_TARGET to match image-config.json baseUrl (e.g. https://lanbilder.se).
    proxy:
      process.env.VITE_IMAGE_PROXY_TARGET ?
        {
          '/image-proxy': {
            target: process.env.VITE_IMAGE_PROXY_TARGET.replace(/\/+$/, ''),
            changeOrigin: true,
            rewrite: (path: string) => path.replace(/^\/image-proxy\/?/, '/') || '/',
          },
        }
      : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild', // Use esbuild for faster minification
    cssMinify: true, // Minify CSS
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor chunks
          if (id.includes('node_modules')) {
            // React and React DOM
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Web Vitals (code-split, loaded dynamically)
            if (id.includes('web-vitals')) {
              return 'web-vitals-vendor';
            }
            // Other vendor dependencies
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
      chunkSizeWarningLimit: 500,
    },
  },
});
