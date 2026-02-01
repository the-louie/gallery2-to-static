# Customize Album Pages with Metadata – Summary

## Objective

Use `albumTitle` and `albumDescription` from album JSON metadata to customize the Albums and Images section headers on album detail pages. Section titles use metadata when present (with BBCode for titles, plain text for descriptions) and fall back to "Albums" / "Images" when missing.

## Changes Made

**AlbumDetail.tsx:** Section headers now use `metadata` from `useAlbumData`. Added `useMemo` for `sectionTitleAlbums`, `sectionTitleImages`, and `sectionDescription`. Titles use `metadata.albumTitle` (trimmed) with `parseBBCode` when non-empty, otherwise "Albums" or "Images". Description uses `metadata.albumDescription` (trimmed), plain text only; the description element is rendered only when non-empty. Both sections use a shared title-block wrapper (`.album-detail-section-title-block`) with an optional `.album-detail-section-description` paragraph. ARIA labels ("Child albums", "Images"), SortDropdown, and grid layout are unchanged. Module JSDoc updated to describe section header behavior.

**AlbumDetail.css:** Added `.album-detail-section-title-block` (flex column, small gap) and `.album-detail-section-description` (smaller font, muted color). Updated `.album-detail-section-header` to `align-items: flex-start` and to contain the title-block plus controls. Responsive rules at 768px and 480px scale the section description font size. No layout change when description is omitted.

**AlbumDetail.test.tsx:** "handles missing album metadata gracefully" now also asserts "Images" for fallback. New "Section Headers and Metadata" describe block: tests for custom title only, description only with fallback titles, both title and description, no description when null/empty, fallback when title null/empty, and BBCode parsing in section titles. Mocks use `useAlbumData` with `metadata` matching `AlbumMetadata` shape.

**Types:** No changes. `AlbumMetadata` and `useAlbumData` already provide `albumTitle` / `albumDescription` as `string | null`; null checks and optional chaining used throughout.

## Data Flow

Section headers use `metadata` from `useAlbumData` only (current album’s JSON). Main header still uses `useAlbumMetadata` / `albumFromMetadata`; no changes there. Frontend-only; no backend or API updates.

## Fallbacks

- Title: "Albums" / "Images" when `metadata` is null or `albumTitle` is null, empty, or whitespace-only.
- Description: Rendered only when `albumDescription` is non-null and non-empty after trim; otherwise the description element is not rendered.
