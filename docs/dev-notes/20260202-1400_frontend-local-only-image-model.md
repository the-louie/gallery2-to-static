# Frontend Local-Only Image Model

## Summary

Updated the frontend to use a local-only image model. All images (full-size and thumbnails) load from `frontend/public/g2data` (symlink). Removed remote URL support, proxy logic, and config complexity.

## Changes

- **imageConfig.ts**: Replaced async config loading with fixed constants `IMAGE_BASE_URL = '/g2data/albums'` and `THUMBNAIL_BASE_URL = '/g2data/thumbnails'`. Removed `loadImageConfig`, `maybeProxyForDev`, env var handling, and fetch of `/image-config.json`.
- **ImageConfigContext**: Removed entirely. No component uses `useImageBaseUrl`; all call `getImageUrl` and `getAlbumThumbnailUrl` without base override.
- **App.tsx**: Removed `ImageConfigProvider` wrapper.
- **Components**: AlbumCard, RootAlbumListBlock, useProgressiveImage, useImagePreload no longer pass `baseUrlOverride`; they use the fixed bases from imageConfig.
- **vite.config.ts**: Removed proxy block for `/image-proxy` and `VITE_IMAGE_PROXY_TARGET`.
- **image-config.json**: Kept for backend `verifyImagePaths`; frontend ignores it.
- **Documentation**: Updated IMAGES-LOCAL.md and 08-local-images.md to document local-only model and g2data paths.
- **Tests**: Rewrote imageConfig.test.ts for fixed constants; updated imageUrl.test.ts to expect `/g2data/albums` and `/g2data/thumbnails`.
- **Scripts**: check-album-assets.mjs now uses `/g2data/albums` and `/g2data/thumbnails` by default; supports separate imageBase and thumbnailBase from image-config.json. Added deprecation note to fuzzy-filename-match-algorithms.mjs.

## Iteration Review Fixes

- **getAlbumThumbnailUrl**: When falling back to `highlightImageUrl` (full-size path), use image base (`/g2data/albums`) not thumbnail base. Applied in frontend imageUrl.ts, backend verifyImagePaths.ts, and scripts/check-album-assets.mjs.
- **Docstrings**: Updated stale references to `/images` and CDN in imageUrl.ts.
- **Tests**: Removed config-mock tests; fixed highlightImageUrl fallback expectations to use IMAGE_BASE.

## Result

- Full-size images: `/g2data/albums/{pathComponent}`
- Thumbnails: `/g2data/thumbnails/{thumbnailUrlPath}`
- No remote URLs, no proxy, no async config load
- Backend `verifyImagePaths` still reads image-config.json for verification; frontend uses fixed paths only
