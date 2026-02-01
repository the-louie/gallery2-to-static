# Backend Extraction: Image Path Verification

**Date:** 2026-02-01
**Source:** backend-extraction-verify-image-paths-deviation-report-plan

## Summary

After extraction, the backend verifies image paths by loading `frontend/public/image-config.json`, collecting all image URLs from the generated album JSON (built from baseUrl + path), and fetching each to confirm it resolves. Failures are written to a deviation report in the project root.

## Changes

- **verifyImagePaths.ts:** New module with loadImageConfigForVerification, collectImageUrlsFromAlbumTree, verifyImageUrl, verifyUrls, writeDeviationReport, runVerification.
- **index.ts:** After writing index.json, calls runVerification; logs summary. Verification errors do not fail extraction.
- **Config:** verifyImagePaths (default true), verifyTimeoutMs (10000), verifyConcurrency (5), imageConfigPath (optional override).
- **Report:** `deviation-report_YYYYMMDD-HHMMSS.md` in project root; format matches check-album-assets style.
- **imageConfigPath:** When provided, relative paths are resolved against project root; absolute paths used as-is.

## Verification Flow

1. Load image-config.json from frontend/public (or imageConfigPath).
2. Skip if baseUrl missing or not HTTP(S).
3. Read data/index.json and data/{albumId}.json; collect URLs (highlight, album thumb, photo full, photo thumb).
4. Fetch each URL with concurrency limit; record failures.
5. If any failures, write deviation report.
