# Fix HTML entities in titles and breadcrumbs — summary

**Date:** 2026-01-25

## Objective
Ensure all user-visible album titles and breadcrumb labels display with HTML entities decoded (e.g. &amp;, &eacute;, &ouml; → &, é, ö) everywhere.

## Changes made

### Backend
- **backend/decodeHtmlEntities.ts** — Extended `NAMED_ENTITIES` with Latin accent and related named entities: &agrave;/&Agrave;, &eacute;/&Eacute;, &egrave;/&Egrave;, &ecirc;/&Ecirc;, &euml;/&Euml;, &iacute;/&Iacute;, &ntilde;/&Ntilde;. Kept &amp; first for correct double-encoding handling.
- **backend/decodeHtmlEntities.test.ts** — Added tests for each new entity, for "Daniel Lehn&eacute;r" and "Catten &amp; Mamma", for &#233;, for double-encoded &amp;eacute;, and for a combined entity-heavy string.

### Frontend
- **frontend/src/utils/decodeHtmlEntities.ts** — Added the same `NAMED_ENTITIES` as backend and updated module JSDoc to mention Latin accents and display strings.
- **frontend/src/utils/decodeHtmlEntities.test.ts** — Added tests for the new named entities, real-world title/name examples, numeric &#233;, combined entity string, and double-encoded &amp;eacute;.
- **Component tests** — Added regression tests for Latin accent entities (e.g. "Daniel Lehn&eacute;r" → "Daniel Lehnér") in: Breadcrumbs.test.tsx, AlbumCard.test.tsx, RootAlbumListBlock.test.tsx, AlbumDetail.test.tsx, SearchResultsPage.test.tsx.

### Display paths
- No component logic changes. All title and breadcrumb display already used `parseBBCodeDecoded` (which decodes then parses BBCode) or `decodeHtmlEntities`; extending the entity list fixed remaining raw entities.

### TODO
- Removed the "Fix HTML entities in titles and breadcrumbs" task from TODO.md and TODO-summarized.md and updated summary counts and estimated time.

## Verification
- Backend and frontend `decodeHtmlEntities` share the same entity set; decode is used only for title/display strings, not for URLs or path segments.
- Decode runs before BBCode parsing where both apply (`parseBBCodeDecoded`). No double-decoding.
- Run backend and frontend tests to confirm all decodeHtmlEntities and component tests pass.
