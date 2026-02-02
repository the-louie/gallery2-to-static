# Local Albums Direct Path and Thumbnail Generation

## Summary

Replaced fuzzy filename matching with direct path resolution using the local `g2data/albums` directory. Full-size images are now resolved by pathComponent chain from the database; paths match the disk structure under `frontend/public/g2data/albums`. Thumbnail generation was added to the extract script with existence check (skip when thumbnail already exists). Output is written to `frontend/public/g2data/thumbnails` with mirrored directory structure.

## Changes

- **Backend**: Removed fuzzy match infrastructure (fuzzyMatch.ts, fuzzy-match-strategy.json, file list loading). Added `pathResolution.ts` with `buildPathsFromPathComponent` for direct path resolution. Added `generateThumbnail.ts` using sharp for thumbnail generation. Config now supports `albumsRoot`, `thumbnailsRoot`, `skipThumbnailGeneration`, `thumbnailMaxWidth`, `thumbnailMaxHeight`, `thumbnailQuality`, `thumbnailConcurrency`.
- **Frontend**: Added `thumbnailBaseUrl` to image-config.json and imageConfig.ts. When set, thumbnail URLs use this base; when unset, use `baseUrl`. Updated imageUrl.ts to use `getThumbnailBaseUrl()` for thumbnail URL construction.
- **Verification**: `loadImageConfigForVerification` now returns `{ baseUrl, thumbnailBaseUrl }`. Added local file verification when baseUrl is a relative path (e.g. `/g2data/albums`); uses `fs.access` instead of HTTP fetch.
- **Config**: `image-config.json` defaults to `baseUrl: /g2data/albums` and `thumbnailBaseUrl: /g2data/thumbnails` for local dev.

## Removed

- `backend/fuzzyMatch.ts`, `backend/fuzzyMatch.test.ts`, `fuzzy-match-strategy.json`
- Config keys: `fileListPath`, `fuzzyStrategyPath`, `enableFuzzyMatch`
