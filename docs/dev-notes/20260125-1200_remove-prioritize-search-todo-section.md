# Remove Prioritize search by album context from TODO.md

## Summary

The "Prioritize search by album context (Frontend)" task was fully implemented; this note records the cleanup of TODO.md.

- **TODO-summarized.md:** Already updated in a prior session (task bullet and counts removed).
- **TODO.md:** The full "Prioritize search by album context (Frontend)" section and an adjacent corrupted block were removed. The corrupted block started with a malformed line mixing a BBCode test reference with a duplicate of backend/titles content and ran into the Prioritize section. Removal was done by line range (Node one-liner) because Unicode curly quotes in the file prevented reliable search-and-replace. The document now goes cleanly from the "Remove root-album-list-view-header" section to "## Remove nav (Main navigation) and make root album intro title the only h1 (Frontend)" with a single `---` separator. The placeholder text `DELETED_PRIORITIZE_SECTION` had been replaced in the Description in a prior edit; that entire section is now removed, so no placeholder remains.

## Status

The Prioritize search by album context frontend feature is complete and fully removed from both TODO files.
