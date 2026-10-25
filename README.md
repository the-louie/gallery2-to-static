# gallery2-to-static
Generate a static copy of your Menalto Gallery 2 structure

## What
This script is meant to be used to create a static archive of a Gallery 2. It reads the database and
creates a static directory structure and HTML files to display the albums.

## Why
Since Menalto ceased development of the Gallery product it's almost impossible to maintain a secure
gallery. So the options are to convert to another gallery like Flikr or Piwig, or just create a
static dump of the current state. This does the latter.

## How
Requires Node.js 22.23.4 or later (earlier 22.x releases bundle a Brotli decoder with CVE-2026-111497).

1. **Extract** (needs the Gallery 2 MySQL database):
   ```bash
   cd backend
   npm ci
   cp config_example.json config.json   # then edit it (DB credentials, image paths)
   npm test                             # optional: backend unit tests
   node index.ts                        # writes ../data/ (via data.new-<time>/) and the thumbnails
   ```
2. **Build the site**:
   ```bash
   cd frontend
   npm ci
   npm run build        # type check + production build into dist/
   # optional: VITE_SENTRY_DSN=<dsn> npm run build  turns on error reporting (see Building & Deployment)
   npm run check:dist   # fails if dist/ contains images, sourcemaps or the bundle report
   npm run size-check   # bundle size budgets
   ```
3. **Deploy**: serve `frontend/dist/` as the site root, `data/` at `/data/` and the images at
   `/g2data/`: full images from the tree `cd backend && node publishImages.ts` builds after each export
   (`g2data/published/`: links to the exported images only, so ignored and orphaned files in the
   Gallery 2 tree are not reachable) at `/g2data/albums/`, thumbnails from `g2data/thumbnails/`. Answer unknown paths with
   `index.html`: the app uses clean path URLs (albums `/dreamhack/dhw05/`, photos `/dreamhack/dhw05/cimg0053`; URL-01), so old path links open directly. See [Building & Deployment](frontend/docs/user-guides/06-building-deployment.md).
4. **Release checks**: `node scripts/check-brotli.mjs` (Brotli decoders on this host and in the build).

## Documentation

Comprehensive user documentation is available in the [frontend/docs/user-guides/](frontend/docs/user-guides/) directory:

- **[Getting Started](frontend/docs/user-guides/01-getting-started.md)** - Installation and first steps
- **[Configuration](frontend/docs/user-guides/02-configuration.md)** - Complete configuration reference
- **[Local image copy](frontend/docs/user-guides/08-local-images.md)** - Serve images from a local path (e.g. `/images`)
- **[Backend Usage](frontend/docs/user-guides/03-backend-usage.md)** - Running the conversion script
- **[Frontend Usage](frontend/docs/user-guides/04-frontend-usage.md)** - Using the gallery application
- **[Features](frontend/docs/user-guides/05-features.md)** - Detailed feature documentation
- **[Building & Deployment](frontend/docs/user-guides/06-building-deployment.md)** - Production build and deployment
- **[Troubleshooting](frontend/docs/user-guides/07-troubleshooting.md)** - Common issues and solutions

See [frontend/docs/user-guides/README.md](frontend/docs/user-guides/README.md) for the complete documentation index.

## Browser Support

The frontend application supports modern browsers with ES2020 support:

- **Desktop**: Chrome (80+), Firefox (75+), Safari (13.1+), Edge (80+)
- **Mobile**: iOS Safari (12.2+), Chrome Mobile (Android)

All CSS features (Grid, Flexbox, Custom Properties) and JavaScript features (async/await, IntersectionObserver) are natively supported in these browsers. Where a feature is missing the gallery degrades instead of failing: for example, without IntersectionObserver every image loads at once instead of lazily.

## Does it really work?
Well, works for me.