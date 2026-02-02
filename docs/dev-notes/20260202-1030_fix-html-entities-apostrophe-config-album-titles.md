# Fix HTML entities (apostrophe) in config override and album titles

## Bug
- Header description from `layoutHeaderDescriptionOverride` in config.json displayed as "world&#039;s" instead of "world's"
- Some album titles (e.g. "McMoj&#039;s Bilder", "Hamatzu&#039;s Bilder") showed raw entities instead of apostrophe

## Cause
The `decodeHtmlEntities` function supported `&#039;` and `&#39;` but not the HTML5 named entity `&apos;`. Config or database content using `&apos;` was not decoded. The backend already applied `decodeHtmlEntities` to the config override and album titles; the missing entity mapping caused some cases to fail.

## Fix
Added `&apos;` to `NAMED_ENTITIES` in both backend and frontend `decodeHtmlEntities` modules. Updated JSDoc and added tests for `&apos;` in both test suites.

## Files changed
- backend/decodeHtmlEntities.ts — added `['&apos;', "'"]` to NAMED_ENTITIES
- backend/decodeHtmlEntities.test.ts — added tests for &apos;
- frontend/src/utils/decodeHtmlEntities.ts — added `['&apos;', "'"]` to NAMED_ENTITIES
- frontend/src/utils/decodeHtmlEntities.test.ts — added tests for &apos;

## Verification
- Backend decodeHtmlEntities tests pass
- Frontend decodeHtmlEntities tests pass (27 tests)
- Re-run backend extraction to regenerate index.json and album JSON files if config or database contains entities
