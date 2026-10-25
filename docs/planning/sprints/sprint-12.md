# Sprint 12: the data behind the 2006 look (PRIO-THEME-01..05, SEARCH-01)

**Status:** in progress (opened 2026-10-25)
**Current ticket:** T-02 (`in-progress` — Export Gallery 2's thumbnail crop and apply it)
**Last completed:** T-01 (`done` — commit `5bb2fa9`)

**Goal:** the album and photo pages show what Gallery 2 showed — its chosen highlights, its thumbnail crops, its item counts and a resized photo — so the remaining visible differences from the 2006 pages are gone.

**Demo:** the T-13 comparison re-run: the root page's 12 album cells show the same highlight images as the 2006 root page; the DH-Photo cell reads "Size: 9 items (878 items total)"; a photo page loads a ~100 KB resize instead of the 1–2 MB original and the "Full size" link still gives the original; search results show descriptions without `[url=…]`.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Export Gallery 2's chosen highlight per album | PRIO-THEME-02 | 3h | – | done | `sqlUtils.ts`: the album's thumbnail derivative (`g2_DerivativeImage` on the album id → `g2_Derivative.g_derivativeSourceId` → source photo, possibly through a chain); `extract.ts` prefers it over the first photo; fallback unchanged. Verify on the root: 2006 root highlights (`inspo/wayback-2006/main.html` lists them by album). Test with the fake sql. Landed in `5bb2fa9` |
| T-02 | Export Gallery 2's thumbnail crop and apply it | PRIO-THEME-03 | 4h | – | in-progress | `g_derivativeOperations` of each photo's thumbnail derivative (`crop\|x,y,w,h` percentages + `thumbnail\|150`); `generateThumbnail.ts` applies the crop with sharp `extract` before resizing to 300px; `thumb_width/height` follow. No crop → as today. Re-export regenerates only changed thumbnails? (check `skipped` logic; else a full regeneration, 25 min on lanbilder2) |
| T-03 | "(N items total)" counts sub-albums too | PRIO-THEME-04 | 1.5h | – | todo | `descendantImageCount.ts` → also a `totalDescendantCount` (photos + exported albums); `MatrixThumbMatrix`/`MatrixAlbum` show it in "(… items total)". DH-Photo: 878 as in 2006 |
| T-04 | 1024px resize for photo pages | PRIO-THEME-05 | 4h | – | todo | export writes `<dir>/r__<file>` (longest side 1024, quality as thumbnails) next to the thumbnail; `Child.resizeUrlPath`; `publishImages` links them; nginx `/g2data/resized/` or same tree; `MatrixPhoto` shows the resize by default, `?size=full` the original. Photos ≤ 1024px: no resize. Size check: CIMG0053_.JPG resize ≈ 100 KB |
| T-05 | Owner name: "Gallery Administrator" or "Unknown" | PRIO-THEME-01 | 0.5h | – | todo | **Operator decided 2026-10-25: "Gallery Administrator"** (1:1 with 2006). `ownerDisplayName.ts` stops mapping it to "Unknown"; test; re-export |
| T-06 | Search results without raw BBCode | SEARCH-01 | 1.5h | – | todo | `SearchResultsPage`: descriptions through the BBCode stripper (or the search index carries stripped text); highlighting on the stripped text; test with the DH-Photo description |
| T-07 | Re-run the measured comparison | – | 1h | T-01..T-06 | todo | `compare.cjs` at 1280px for root, album p1, photo; the 2006 root (Classic layout) compared cell by cell for highlights; results into `theme-matrix.md`; any new difference → PRIO-THEME row |

Total ≈ 15.5h.

## Open points
- **T-05** decided (operator, 2026-10-25): show "Gallery Administrator".
- **T-02 / T-04** re-export on lanbilder2 (thumbnails and new resizes: about 1.2 GB + ~5 GB for 57k resizes at ~100 KB; `/mnt/storage` has 51 GB free).
- The 2006 root used the Classic list layout, so T-07 compares its highlights by album name, not by position.
