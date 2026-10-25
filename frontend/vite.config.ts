import { defineConfig, type Plugin } from 'vite';
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

/**
 * Files from public/ that ship in dist/. public/ is NOT copied wholesale (build.copyPublicDir is
 * false): it holds the g2data image symlink (the whole photo tree) plus example and backend-only
 * config files. The dev server still serves all of public/.
 */
const PUBLIC_FILES_TO_SHIP = ['album-themes.json'];

function copyPublicFilesPlugin(): Plugin {
  return {
    name: 'copy-public-files',
    apply: 'build',
    generateBundle() {
      for (const fileName of PUBLIC_FILES_TO_SHIP) {
        this.emitFile({
          type: 'asset',
          fileName,
          source: fs.readFileSync(path.resolve(__dirname, 'public', fileName)),
        });
      }
    },
  };
}

// https://vitejs.dev/config/
// `vite build --mode analyze` (npm run build:analyze) adds the bundle report (dist/stats.html) and
// sourcemaps; a normal production build ships neither (they expose the full source).
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    serveDataPlugin(),
    copyPublicFilesPlugin(),
    ...(mode === 'analyze'
      ? [
          visualizer({
            filename: './dist/stats.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
          }),
        ]
      : []),
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
    // Ignore g2data symlink (large directory) to prevent watcher hang
    watch: {
      ignored: ['**/public/g2data/**'],
    },
  },
  build: {
    outDir: 'dist',
    copyPublicDir: false, // see PUBLIC_FILES_TO_SHIP
    sourcemap: mode === 'analyze',
    // minify: Vite 8 default (Oxc); 'esbuild' would need esbuild installed separately
    cssMinify: true, // Minify CSS
    chunkSizeWarningLimit: 500, // build option (was inside rollupOptions, where it was ignored)
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Split vendor chunks by package directory (ARCH-07: a substring test for 'react' also
          // caught react-router, so router-vendor never existed, and any path containing "react")
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react-router|react-router-dom)[\\/]/.test(id)) {
              return 'router-vendor';
            }
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'react-vendor';
            }
            // Web Vitals (code-split, loaded dynamically)
            if (id.includes('web-vitals')) {
              return 'web-vitals-vendor';
            }
            // Sentry (loaded dynamically, only when VITE_SENTRY_DSN is set; SENTRY-01)
            if (/[\\/]node_modules[\\/]@sentry(-internal)?[\\/]/.test(id)) {
              return 'sentry-vendor';
            }
            // Other vendor dependencies
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
  },
}));
