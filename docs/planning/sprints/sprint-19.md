# Sprint 19: admin QA round (operator comments 2026-10-26)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** T-01 (`in-progress` — all eight items, one pass)
**Last completed:** —

**Goal:** the operator's eight comments after the first real albums and uploads are fixed on the admin site and the generated gallery.

**Demo:** album lists alphabetical in the admin and the classic root; "New sub-album" inside an album; a single breadcrumb entry per album; thumbnails right after upload with a "checking and storing" step shown; the effective highlight marked (no button on it); "Published hh:mm" with the publishing time; an admin can delegate an album from the album page.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Admin QA round, items 1–8 | QA2-01..08 | 6h | – | in-progress | 1 albums alphabetical (generator setting `album_sort`, default title; admin lists); 2 delegation from the album page (admin) + answer; 3 upload phases (uploading → checking and storing → done → publishing); 4 thumbnail generated at upload (media row) so the admin shows it at once; 5 publish timing in the indicator + answer; 6 breadcrumb duplicate removed; 7 "New sub-album"; 8 effective highlight marked, button hidden on it (API `currentHighlightPhotoId`) |

## Retro / Demo notes
(filled at sprint end)
