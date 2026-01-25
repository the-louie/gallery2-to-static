# Investigate: album 338910 / image 395090 page loads no images

**Date:** 2026-01-25

## Problem
URL `/#/album/338910/image/395090` did not load or display any images. Album data in `data/338910.json` is valid (children include `GalleryPhotoItem` id 395090).

## Root cause
In development, the frontend requests `/data/338910.json` from the Vite dev server. Vite serves static files only from `frontend/public/`. The project stores album JSON in the project-root `data/` directory, and `frontend/public/data/` did not exist. So the fetch returned 404, `loadAlbum` threw `NotFoundError`, and ImageDetailPage received no data — resulting in an empty page or error state.

## Solution
Added a Vite plugin (`serve-data`) in `frontend/vite.config.ts` that runs only in dev (`apply: 'serve'`) and serves the project-root `data/` directory at `/data/`. Requests to `/data/*.json` are fulfilled from the repo `data/` folder with basic path validation (no path traversal, `.json` only). Production build and deployment are unchanged: deployers still copy or serve `data/` into `dist/data/` per existing docs.

## Changes
- **frontend/vite.config.ts**: New `serveDataPlugin()` that mounts a middleware at `/data` to serve JSON files from `../data` with security checks.
- **frontend/docs/user-guides/04-frontend-usage.md**: Documented that dev serves project-root `data/` at `/data/` via the plugin.
- **frontend/docs/user-guides/07-troubleshooting.md**: Updated data-directory verification to describe the dev plugin.
- **frontend/src/pages/ImageDetailPage.test.tsx**: Mocked `useAlbumData` and added a test that when album 338910 data (including image 395090) is returned, the page does not show "Image Not Found" or "Error Loading Image" and renders the image-detail page.

## Verification
- With the plugin, running the dev server and opening `/#/album/338910/image/395090` should load `data/338910.json` and show image 395090 in the lightbox.
- `/#/album/338910` (without image id) loads the same JSON and shows the album grid.
- Production build and deployment docs still require `dist/data/` or equivalent; no change to build output.
