# Building and Deployment

This guide explains how to build the frontend application for production and deploy it to various hosting platforms.

## Building for Production

### Build Command

Navigate to the `frontend` directory and run:

```bash
cd frontend
npm run build
```

### Build Process

The build process:

1. **Type Checking**: Validates TypeScript types
2. **Compilation**: Compiles TypeScript to JavaScript
3. **Bundling**: Bundles code with Vite
4. **Optimization**: Minifies and optimizes code
5. **Asset Processing**: Processes and optimizes assets
6. **Code Splitting**: Creates separate bundles for routes

### Build Output

The build creates a `dist/` directory containing:

```
dist/
├── index.html          # Main HTML file
├── assets/
│   ├── js/            # JavaScript bundles
│   │   ├── index-[hash].js
│   │   ├── react-vendor-[hash].js
│   │   ├── router-vendor-[hash].js
│   │   └── [route]-[hash].js
│   ├── css/           # CSS files
│   │   └── index-[hash].css
│   └── [ext]/         # Other assets (images, fonts, etc.)
└── ...
```

### Build Optimizations

The production build includes:

- **Minification**: JavaScript and CSS are minified
- **Tree Shaking**: Unused code is removed
- **Code Splitting**: Separate bundles for faster loading
- **Asset Optimization**: Images and assets are optimized
- **Source Maps**: Optional source maps for debugging (enabled by default)

### Build Size Limits

The build includes size checks to ensure bundles stay within limits:

- **Initial Bundle**: 200 KB limit
- **Route Chunks**: 50 KB per route
- **Lightbox Chunk**: 30 KB
- **Total Bundle**: 500 KB limit

If bundles exceed limits, the build will warn you.

### Analyzing Bundle Size

To analyze bundle size:

```bash
npm run build:analyze
```

This generates a visual bundle analysis in `dist/stats.html`.

### Testing Production Build Locally

To test the production build locally:

```bash
npm run preview
```

This serves the `dist/` directory at `http://localhost:4173`.

## Deployment Requirements

### Static File Hosting

The application requires static file hosting that can serve:
- HTML files
- JavaScript bundles
- CSS files
- JSON data files
- Image assets

### Required Files and Directories

Deploy the following:

1. **dist/ directory**: All built files from `npm run build`
2. **data/ directory**: JSON files from backend conversion
   - Place in `dist/data/` or configure server to serve from appropriate location

### Data Directory Placement

The frontend expects JSON files at `/data/{id}.json` (relative to the served root).

**Options**:

1. **Place in dist/**: Copy `data/` directory to `dist/data/`
2. **Configure Server**: Configure server to serve `data/` from appropriate location
3. **CDN**: Serve data files from CDN (if using CDN for assets)

### Image Paths

Local-only model: all images load from `frontend/public/g2data` (symlink). No configuration required.

- Full-size images: `/g2data/albums/{pathComponent}`
- Thumbnails: `/g2data/thumbnails/{thumbnailUrlPath}`

The image tree is **not** part of the build: `vite build` does not copy `public/` (`build.copyPublicDir: false`; only the files in `PUBLIC_FILES_TO_SHIP` in `vite.config.ts`, today `album-themes.json`, are emitted). The `public/g2data` symlink is for the dev server only. In production, serve `/g2data/` next to `dist/` or from a separate image host with the same paths. Serve full images from the tree `node publishImages.ts` (backend) builds after each export, not from the Gallery 2 tree itself: it links only the images referenced from `data/`, so albums and photos left out by `ignoreAlbums`/`ignoreItems`, and files the database no longer knows, are not reachable by URL (nginx: `location /g2data/albums/ { alias /path/to/g2data/published/; try_files $uri =404; }` and `location /g2data/thumbnails/ { alias /path/to/g2data/thumbnails/; try_files $uri =404; }`).

**Old path URLs:** the app uses hash URLs (`/#/dreamhack/...`), while links to the old site are path URLs (`/dreamhack/dreamhack_97/`). The server must answer any unknown path with `index.html` (`try_files $uri $uri/ /index.html;` in nginx); the app then moves the path into the hash before the router starts (`src/utils/legacyPathRedirect.ts`), and the album opens. `/data/`, `/g2data/` and `/assets/` must not fall back (real 404 instead of the HTML page).

After a build, `npm run check:dist` fails if `dist/` contains `g2data/`, image files, or lacks `index.html` / `album-themes.json`.

### Base Path Configuration

If deploying to a subdirectory (e.g., `/gallery/`), you may need to configure the base path in `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/gallery/',
  // ... other config
});
```

## Deployment Platforms

### GitHub Pages

1. **Build the application**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Copy data directory**:
   ```bash
   cp -r ../data dist/data
   ```

3. **Configure base path** (if using GitHub Pages subdirectory):
   - Edit `vite.config.ts` and set `base: '/repository-name/'`

4. **Deploy**:
   - Use GitHub Actions, or
   - Push `dist/` contents to `gh-pages` branch

### Netlify

1. **Build command**: `cd frontend && npm run build`
2. **Publish directory**: `frontend/dist`
3. **Data files**: Add build step to copy `data/` to `dist/data/`

**netlify.toml example**:

```toml
[build]
  command = "cd frontend && npm run build && cp -r ../data dist/data"
  publish = "frontend/dist"
```

### Vercel

1. **Build command**: `cd frontend && npm run build`
2. **Output directory**: `frontend/dist`
3. **Data files**: Configure to serve `data/` directory

**vercel.json example**:

```json
{
  "buildCommand": "cd frontend && npm run build && cp -r ../data dist/data",
  "outputDirectory": "frontend/dist"
}
```

### Traditional Web Server

1. **Build the application**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Copy files to server**:
   - Upload `dist/` contents to web root
   - Upload `data/` directory to web root

3. **Configure server**:
   - Ensure server serves static files
   - Configure MIME types for JSON files
   - Set up proper caching headers

### Apache Configuration

Example `.htaccess` for Apache:

```apache
# Enable CORS for JSON files (if needed)
<FilesMatch "\.json$">
  Header set Access-Control-Allow-Origin "*"
</FilesMatch>

# Cache static assets
<FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg)$">
  Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

### Nginx Configuration

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/gallery/dist;

    # Serve JSON files
    location /data/ {
        alias /var/www/gallery/data/;
        add_header Access-Control-Allow-Origin *;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## Post-Deployment Verification

After deploying, verify everything works:

### 1. Check Pages Load

- Visit the home page
- Navigate to album pages
- Check that all routes work

### 2. Verify Data Files

- Check browser Network tab
- Verify JSON files load (not 404 errors)
- Check that data displays correctly

### 3. Test Features

- **Search**: Test search functionality
- **Filters**: Test filter panel
- **Lightbox**: Test image viewing
- **Navigation**: Test breadcrumbs and navigation
- **Themes**: Test theme switching

### 4. Test on Different Devices

- **Desktop**: Test on desktop browsers
- **Tablet**: Test on tablet devices
- **Mobile**: Test on mobile devices
- **Different Browsers**: Test on Chrome, Firefox, Safari, Edge

### 5. Check Performance

- **Load Time**: Check initial load time
- **Image Loading**: Verify images load efficiently
- **Smooth Scrolling**: Test scrolling performance
- **Bundle Size**: Verify bundles are optimized

## Common Deployment Issues

### Data Files Not Loading (404 Errors)

**Problem**: JSON files return 404 errors

**Solutions**:
- Verify `data/` directory is in correct location
- Check file paths match expected format (`/data/{id}.json`)
- Verify server serves JSON files correctly
- Check CORS settings if files are on different domain

### Images Not Displaying

**Problem**: Images don't load or show broken image icons

**Solutions**:
- Verify image paths are correct
- Check CORS settings for images
- Verify image files are accessible
- Check browser console for errors

### Routes Not Working (404 on Refresh)

**Problem**: Direct URLs or page refreshes return 404

**Solutions**:
- Configure server for SPA routing (see Apache/Nginx examples above)
- Ensure all routes fall back to `index.html`
- Check server configuration for single-page application support

### Build Fails

**Problem**: `npm run build` fails with errors

**Solutions**:
- Check TypeScript errors (run `npm run build` to see details)
- Verify all dependencies are installed
- Check for syntax errors in code
- Review build output for specific error messages

### Bundle Size Too Large

**Problem**: Build warns about bundle size limits

**Solutions**:
- Review bundle analysis (`npm run build:analyze`)
- Check for large dependencies
- Consider code splitting optimizations
- Remove unused code or dependencies

## Environment Variables

Build-time settings (all optional; set them in the environment or in `frontend/.env.production.local`, which git ignores, and rebuild):

| Variable | Effect |
| --- | --- |
| `VITE_SENTRY_DSN` | Turns on error reporting to Sentry (`src/utils/errorReporting.ts`). Without it the SDK is never loaded. With it, a separate chunk (about 27 KB compressed) loads after start; the initial load is unchanged. |
| `VITE_SENTRY_ENVIRONMENT` | Sentry environment name (default: the Vite mode, `production`). |
| `VITE_SENTRY_RELEASE` | Release name, e.g. the git commit (`git rev-parse --short HEAD`). |

What is sent: errors only (uncaught errors, unhandled rejections, and errors caught by `ErrorBoundary` with their component stack). No user fields, cookies, headers, request bodies or query strings (search terms), no performance tracing, no session replay. Source maps are not shipped (`check:dist`); upload them to Sentry separately if readable stack traces are wanted. In the Sentry project, also turn on *Prevent Storing of IP Addresses*.

```bash
VITE_SENTRY_DSN=https://<key>@<org>.ingest.de.sentry.io/<project> VITE_SENTRY_RELEASE=$(git rev-parse --short HEAD) npm run build
```

## CDN Deployment

If using a CDN for assets:

1. **Upload Assets**: Upload `dist/assets/` to CDN
2. **Update Paths**: Configure Vite to use CDN URLs
3. **Data Files**: Serve data files from CDN or origin server
4. **Cache Settings**: Configure appropriate cache headers

## Continuous Deployment

For automated deployments:

1. **GitHub Actions**: Set up workflow to build and deploy
2. **Netlify/Vercel**: Connect repository for automatic deployments
3. **CI/CD Pipeline**: Configure pipeline to build and deploy on commits

## Next Steps

- **Troubleshooting**: See [07-troubleshooting.md](07-troubleshooting.md) for deployment issues
- **Features**: Review [05-features.md](05-features.md) to understand all features
- **Configuration**: Review [02-configuration.md](02-configuration.md) for backend configuration
