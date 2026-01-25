# Album titles are plain text from backend

During extraction the backend strips BBCode from all album title fields (metadata.albumTitle, children titles, index.json, search index). Emitted JSON has no raw `[b]`, `[i]`, `[color=…]`, etc. in any title or albumTitle field.

The frontend may continue to use `decodeHtmlEntities` on titles if needed. It can optionally stop using `parseBBCodeDecoded()` for album titles and treat them as plain text. No mandatory frontend change is required.

**TODO cleanup:** The Strip BBCode task was removed from TODO-summarized.md. If an orphan block remains in TODO.md above “**Album descriptions**” (a “### Requirements” heading followed by “#### Scope”, three scope bullets, “#### Implementation Tasks”, and two implementation bullets about stripBBCode), delete that entire block manually. Automated removal was not possible due to Unicode apostrophes in the text.
