# Replace "Gallery Administrator" with "The Louie" in ownerName (Backend)

## Summary

Backend extraction now normalizes the owner display name so that any `ownerName` value equal to `"Gallery Administrator"` (from the Gallery 2 database) is replaced with `"The Louie"` before being written to emitted JSON. Album metadata (`metadata.ownerName`) and child items (`children[].ownerName`) are both affected; normalization is applied at the single source of truth in `backend/sqlUtils.ts` so all consumers receive the normalized value.

**Where:** New module `backend/ownerDisplayName.ts` exports constants (`OWNER_DISPLAY_NAME_GALLERY_ADMIN`, `OWNER_DISPLAY_NAME_THE_LOUIE`) and `normalizeOwnerDisplayName(name: string | null): string | null`. `backend/sqlUtils.ts` imports the helper and uses it when assigning `ownerName` in `getAlbumInfo` and in `getChildren`. Unit tests added in `backend/ownerDisplayName.test.ts`.

**Unchanged:** No frontend or type changes; no changes to `backend/index.ts` or `backend/types.ts`. Search index does not include ownerName, so no change there.
