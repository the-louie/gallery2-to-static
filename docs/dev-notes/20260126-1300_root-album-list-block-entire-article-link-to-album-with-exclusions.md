# Root Album List Block Entire Article Link to Album (With Exclusions)

**Date:** 2026-01-26

## Summary

The root album list block was updated so the whole block (title, description, metadata, and in classic theme the thumbnail) acts as a single link to the album page. Two areas are explicitly excluded: the optional event website link (from BBCode in summary/description) continues to open the external URL only, and the entire subalbums section (including subalbum links and “…and more!”) keeps its own behavior so that clicks there do not navigate to the parent album.

## Implementation

- **Link-wrapper approach:** A single `<Link>` with class `root-album-list-block-block-link` wraps the clickable area: in classic theme the thumbnail (now a non-link div) plus the main content (title, description, meta). The title is no longer a separate link; it is a `<span>` inside the heading. The website paragraph and the subalbums section are rendered as siblings of this link inside `.root-album-list-block-main` and `.root-album-list-block-inner`, so there are no nested links.
- **CSS:** Styles were added for `.root-album-list-block-block-link` (display, cursor, focus-visible outline). Title-link and thumb-link styles were removed or repurpose; the block link carries focus styling. Classic theme: the block link is flex row so thumb and content sit side by side.
- **Tests:** New tests cover the presence and href of the block link, that the website link and subalbum links are not inside the block link, that there is only one link to the album page, and that the block link contains no duplicate album link. Existing tests were updated so the single “Open album” link is the block link (no link inside the h2).

## Exclusions

- Event website link: outside the block link; opens external URL.
- Subalbums section: outside the block link; subalbum links go to respective album pages; “…and more!” does not trigger parent navigation.
