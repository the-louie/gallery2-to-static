# Bundle Optimization and Code Splitting

This document describes the bundle optimization and code splitting strategy implemented in the gallery2-to-static frontend application.

## Overview

The application uses code splitting to improve initial load performance by splitting the JavaScript bundle into smaller chunks that are loaded on-demand. The goal is to keep the initial bundle size under 200KB gzipped.

## Architecture

### Code Splitting Strategy

The application implements a two-level code splitting approach:

1. **Route-based splitting**: Each page component is lazy-loaded when its route is accessed
2. **Component-based splitting**: Heavy components (like Lightbox) are lazy-loaded when needed

### Bundle Structure

```
Entry Chunk (main.js)
├── React Vendor Chunk (react, react-dom)
├── Router Vendor Chunk (react-router-dom)
├── Other Vendor Chunk (remaining node_modules)
├── HomePage Chunk (lazy loaded)
├── AlbumDetailPage Chunk (lazy loaded)
├── ImageDetailPage Chunk (lazy loaded)
├── NotFoundPage Chunk (lazy loaded)
└── Lightbox Chunk (lazy loaded component)
```

## Implementation Details

### Vite Configuration

The Vite configuration (`vite.config.ts`) includes:

- **Manual chunk splitting**: Separates React, React Router, and other vendor dependencies into separate chunks
- **Custom chunk naming**: Descriptive chunk file names for better debugging
- **Bundle analyzer**: Integrated rollup-plugin-visualizer for bundle size analysis

### Route-Based Code Splitting

All page components are lazy-loaded using React's `lazy()` function:

- `HomePage`: Loaded when accessing the root route (`/`)
- `AlbumDetailPage`: Loaded when accessing album routes (`/album/:id`)
- `ImageDetailPage`: Loaded when accessing image routes
- `NotFoundPage`: Loaded when accessing invalid routes

Each lazy-loaded route is wrapped in a `Suspense` boundary with a `PageLoader` fallback component.

### Component-Level Code Splitting

Heavy components are lazy-loaded at the component level:

- **Lightbox**: The Lightbox component (~877 lines) is lazy-loaded within `ImageDetailPage` to avoid including it in the initial bundle

Other large components were evaluated for code splitting:
- **AlbumDetail**: Used within AlbumDetailPage, which is already lazy-loaded, so additional splitting was not necessary
- **AlbumGrid**: Used within HomePage and AlbumDetailPage (both lazy-loaded), so it's already code-split at the route level
- **ImageGrid**: Used within AlbumDetailPage (lazy-loaded), so it's already code-split at the route level

Since these components are used within lazy-loaded route components, they are automatically included in the route chunks rather than the initial bundle, providing sufficient code splitting benefits.

### Tree-Shaking Optimization

- `sideEffects: false` in `package.json` enables aggressive tree-shaking
- Named imports are used throughout to allow better tree-shaking
- Barrel exports use named exports for optimal tree-shaking

## Bundle Analysis

### Running Bundle Analysis

To analyze bundle size and composition:

```bash
npm run build:analyze
```

This will:
1. Build the application in production mode
2. Generate `dist/stats.html` with a visual representation of the bundle
3. Show chunk sizes, dependencies, and gzipped sizes

Open `dist/stats.html` in a browser to view the interactive bundle visualization.

### Bundle Size Monitoring

Bundle size is monitored using two tools:

1. **rollup-plugin-visualizer**: Provides visual bundle analysis (see above)
2. **size-limit**: Automated size checking with configured limits

To check bundle sizes against configured limits:

```bash
npm run size-check:build
```

This will build the application and verify that bundle sizes are within the configured limits. The size limits are configured in `package.json`:

- Initial bundle (entry + vendor chunks): < 200KB gzipped

Target metrics:
- Initial bundle (entry + vendor chunks): < 200KB gzipped
- Individual route chunks: < 50KB gzipped each
- Lightbox chunk: < 30KB gzipped

## Adding New Lazy-Loaded Routes

To add a new lazy-loaded route:

1. Create your page component in `src/pages/`
2. Export it as a named export (not default export)
3. In `App.tsx`, import it using `lazy()`:

```tsx
const NewPage = lazy(() => import('./pages/NewPage').then((module) => ({ default: module.NewPage })));
```

4. Add the route inside the `Suspense` boundary:

```tsx
<Route path="/new-route" element={<NewPage />} />
```

The route will be automatically code-split into its own chunk.

## Adding New Lazy-Loaded Components

To lazy-load a heavy component:

1. Import it using `lazy()`:

```tsx
const HeavyComponent = lazy(() => import('@/components/HeavyComponent').then((module) => ({ default: module.HeavyComponent })));
```

2. Wrap it in a `Suspense` boundary with a fallback:

```tsx
<Suspense fallback={<div>Loading component...</div>}>
  <HeavyComponent {...props} />
</Suspense>
```

## Best Practices

1. **Keep initial bundle small**: Only include code needed for the initial page load
2. **Lazy load routes**: All page components should be lazy-loaded
3. **Lazy load heavy components**: Components over ~500 lines or with heavy dependencies should be lazy-loaded
4. **Use Suspense boundaries**: Always wrap lazy-loaded components in Suspense with appropriate fallbacks
5. **Monitor bundle size**: Regularly run bundle analysis to identify size regressions
6. **Optimize imports**: Use named imports for better tree-shaking
7. **Avoid unnecessary dependencies**: Remove unused dependencies to reduce bundle size

## Troubleshooting

### Chunk loading errors

If you see chunk loading errors in production:

1. Verify that the build output includes all expected chunks
2. Check that the server is configured to serve chunk files correctly
3. Ensure chunk file names match the manifest

### Large initial bundle

If the initial bundle is too large:

1. Run bundle analysis to identify large dependencies
2. Consider lazy-loading more components
3. Check for unnecessary imports in the entry point
4. Review vendor chunk sizes

### Missing chunk names

If chunks are not named as expected:

1. Check Vite configuration for `manualChunks` setup
2. Verify chunk naming patterns in `rollupOptions.output`

## References

- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [React.lazy() Documentation](https://react.dev/reference/react/lazy)
- [Rollup Plugin Visualizer](https://github.com/btd/rollup-plugin-visualizer)
