# Breadcrumbs Visible in Single-Image Lightbox

**Date:** 2026-02-01

## Summary

Breadcrumb navigation is now shown inside the Lightbox when viewing a single image via the image-detail route (`/album/:albumId/image/:imageId`). Previously, breadcrumbs were only rendered in AlbumDetail, so on the single-image page the hierarchy was not visible.

**Changes:**

- **Lightbox:** Added optional prop `breadcrumbPath` (BreadcrumbPath | null). When provided and the path has more than one item, a compact breadcrumb row is rendered at the top of the overlay (above the close button), with `aria-label="Album location"`. Styling uses `--lightbox-breadcrumb-*` theme variables for link, hover, focus, current, and separator colors on the dark overlay.
- **Lightbox.css:** Existing `.lightbox-breadcrumb-row` and `.breadcrumbs-lightbox` styles use the new theme variables with fallbacks for contrast on the dark backdrop.
- **themes.css:** Added `--lightbox-breadcrumb-bg`, `--lightbox-breadcrumb-link-color`, `--lightbox-breadcrumb-link-hover-bg`, `--lightbox-breadcrumb-link-hover-color`, `--lightbox-breadcrumb-focus`, `--lightbox-breadcrumb-link-focus-bg`, `--lightbox-breadcrumb-current-color`, and `--lightbox-breadcrumb-separator-color` in `:root`, `[data-theme="light"]`, `[data-theme="dark"]`, and `[data-theme="original"]` so breadcrumbs are readable in all themes.
- **ImageDetailPage:** Derives `breadcrumbPath` from `metadata?.breadcrumbPath ?? null` and passes it to Lightbox. Metadata is already loaded via `useAlbumData(routeParams.albumId)`.
- **TODO-summarized.md:** Removed the task "Make breadcrumbs more visible when viewing a single image" and updated the task count to 4.

**Edge cases:** Null or undefined `breadcrumbPath` results in no breadcrumb row. Single-item (root) path is not rendered (Breadcrumbs component returns null). Breadcrumb links use React Router navigation; clicking a crumb navigates to that album and the lightbox closes via route change. Breadcrumbs are inside the modal focus trap (lightbox-container).

**Manual step:** Remove the "Make the breadcrumbs more visible when viewing a single image" section from TODO.md (Unicode quotes in that section prevented automated removal).
