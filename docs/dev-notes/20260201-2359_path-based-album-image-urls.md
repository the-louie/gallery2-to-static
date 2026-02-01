# Path-based album/image URLs – implementation summary

**Date:** 2026-02-01

## Objective

Migrate from ID-based URLs (`/album/2946`, `/album/2946/image/123`) to path-based URLs that mirror the breadcrumb hierarchy using album names (e.g. `/backspace_lan/backspace_2_0/marcus`). Backend emits path-based breadcrumb paths and a path index; frontend resolves path to albumId and uses path-based links everywhere.

## Backend

- **Research:** `__docs/path-based-urls-research.md` documents segment encoding (cleanup_uipathcomponent + encode), reserved segments, duplicate titles (append `--id`), and uipath vs pathComponent.
- **pathSegments.ts:** `titleToSegment`, `getSegmentForAlbum` (disambiguation), `buildPathFromBreadcrumb`, `appendSegment`. Unit tests in `pathSegments.test.ts`.
- **index.ts:** Breadcrumb `path` set to path-based URL per album; path index `Map<string, number>` built during traversal; `pathIndex` emitted in `index.json`. Child albums get `path` on each album child. Search index items get optional `path`.
- **types.ts:** `Child` has optional `path`; backend `SearchIndexItem` has optional `path`.

## Frontend

- **albumPath.ts:** `titleToSegment` (matches backend cleanup), `getAlbumPath`, `getImagePath`, `getAlbumPathFromAlbum`, `getChildAlbumPath`. Used for link generation.
- **dataLoader.ts:** `loadPathIndex()`, `resolvePathToAlbumId(path)`, `normalizePathForLookup`. Path index loaded from `index.json` `pathIndex`.
- **types:** `IndexMetadata.pathIndex`, `RouteParams['*']` for splat.
- **PathResolverPage:** Resolves `params['*']` to album (and optional image); delegates to `AlbumDetailPage` or `ImageDetailPage` with `resolvedAlbumId` / `resolvedImageId`. Handles `.../image/123` pattern.
- **App.tsx:** Route `/*` → `PathResolverPage`; explicit routes (`/`, `/search`, `/not-found`, `/album/...`, `/image/...`) before splat.
- **AlbumDetailPage / ImageDetailPage:** Accept optional `resolvedAlbumId` and `resolvedImageId` from PathResolverPage; use when provided instead of params.
- **Link generation:** AlbumDetail uses `getChildAlbumPath` / `getImagePath` when breadcrumbPath present; RootAlbumListBlock and HomePage use `album.path` or `getAlbumPathFromAlbum`; useLightbox accepts `albumPath` for path-based nav; SearchResultsPage uses `album.path` when present; ImageDetailPage “Go Back to Album” and lightbox use path when metadata available.
- **albumThemesConfig:** `getAlbumIdFromPath(pathname, pathIndex?)` tries path index first, then legacy `/album/\d+`. ThemeContext loads path index and passes it to `getAlbumIdFromPath`.

## Backward compatibility

- ID-based routes `/album/:id` and `/album/:albumId/image/:imageId` remain; path-based route `/*` added. No redirect from ID to path (optional per plan).
- When backend has not yet been re-run, `pathIndex` and `path` on breadcrumbs/children may be missing; frontend falls back to ID-based URLs where applicable.

## TODO.md / TODO-summarized.md

- Path-based URL task removed from TODO-summarized.md and summary counts updated.
- Path-based task heading and objective were removed from TODO.md; remnant body paragraphs (Context, Expected behavior, etc.) may remain and can be deleted manually if desired.
