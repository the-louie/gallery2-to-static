# Fix HTML entities in description and summary (backend)

## Bug
Album descriptions, summaries, and root album description in index.json metadata contained raw HTML entities (e.g. &amp;, &auml;, &ouml;, &aring;) that displayed incorrectly in the UI.

## Cause
The backend applied decodeHtmlEntities only to titles (album titles, child titles, layout header override). Description and summary fields from the database were passed through without decoding. The frontend does decode on display via parseBBCodeDecoded/decodeHtmlEntities, but the emitted JSON contained raw entities.

## Fix
Apply decodeHtmlEntities to description and summary in backend sqlUtils:
- getChildren: decode child.description and child.summary before returning
- getRootAlbumInfo: decode row.description
- getAlbumInfo: decode row.description (albumDescription)

## Files changed
- backend/sqlUtils.ts — decode description and summary in getChildren, getRootAlbumInfo, getAlbumInfo
- backend/decodeHtmlEntities.ts — updated JSDoc to reflect use for descriptions/summaries

## Verification
Re-run backend extraction to regenerate data files. Then rsync to frontend/public/data and verify:
- Header description at /
- Album title and breadcrumbs at /internationella/usaroadtrip2010-hope_defcon
- JB-LAN subalbums at /jb-lan
