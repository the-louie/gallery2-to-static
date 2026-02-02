# Root Album Title and Description in Header

## Summary

Moved the root album title and description from the root album content area into the Layout header. The site name and description are now always visible in the header regardless of whether the user is viewing the root album or a subalbum, eliminating duplication.

## Changes

- **useSiteMetadata**: Added `siteDescription` to the hook return value, loaded from `index.json` (IndexMetadata.siteDescription).
- **Layout**: Display site name and description in the header. Wrapped title in a new `layout-header-branding` container; added `layout-header-description` for the description text. Description uses `parseBBCodeDecoded` for BBCode support.
- **Layout.css**: Added styles for `layout-header-branding` and `layout-header-description` (muted color, smaller font, max-width for readability).
- **RootAlbumListView**: Removed the intro block that displayed root album title and description. The list of root-level albums now renders directly without the duplicate intro.
- **RootAlbumListView.css**: Removed intro-related styles (root-album-list-view-intro, root-album-list-view-intro-title, root-album-list-view-intro-description).
- **RootAlbumListView.test.tsx**: Updated tests to reflect that the intro is no longer shown; albums render directly.

## Result

The header consistently shows the site name (e.g. "lanbilder.se") and description on all pages. The root album content area no longer repeats this information.
