# Fuzzy filename match 98% hit rate – implementation summary

## Objective

Implement the full fuzzy-filename-match-98-percent-hit-rate plan in `scripts/fuzzy-filename-match-algorithms.mjs` to raise hit rate from ~6% toward ≥98% using weighted fuzzy consensus, trigram index, early-exit scoping, and related improvements.

## Changes made

- **Phase 2 – Fuzzy primitives and preprocessing:** Added `getJaroWinkler`, `getTokenOverlap`, `getLevenshteinNorm` (0–1). Added `dedupeBaseFilename` and use it in `extractBaseFilename`. Added `preprocess(str, options)` with lowercase, strip underscores/digits, skeleton (digits→#).
- **Phase 3 – Candidate pool:** Added `buildTrigramFilenameIndex(entries)` and included it in the file index. Added `getCandidates(parsed, fileIndex, options)` combining last-segment, path-variant, and trigram-based candidates; dedupe by fullPath; cap 500; early-exit scope to top 50 by trigram overlap and first-char/length heuristic.
- **Phase 4 – Weighted matcher:** Added `scoreCandidate(parsed, fileEntry, weights, options)` (path/album/file similarity, optional skeleton, containment multiplier, depth penalty). Added `bestMatch(parsed, fileIndex, weights, threshold, options)` with tiered threshold (confidence gap, lower threshold). Default weights 0.2/0.4/0.4, threshold 0.55, confidence gap 0.3, lower threshold 0.45.
- **Phase 5 – Stemming and synonyms:** Added `stemSegment(seg)` (lowercase, remove vowels). Added optional `SEGMENT_SYNONYMS` map. In `scoreCandidate`, optional stemmed path/album comparison and synonym expansion; segment containment bonus (+0.1) when URL album is contained in file album or vice versa.
- **Phase 6 – Consensus:** Added `getTopKCandidates` and `consensusMatch(parsed, fileIndex, weights, threshold, options)` using Jaro-Winkler and token-overlap strategies, Borda count (top-3), min consensus points 2; fallback to `bestMatch` with Jaro-Winkler.
- **Phase 7 – Training mode:** Extended `parseArgs` with `--train`, `--golden-set`, `--threshold`, `--confidence-gap`, `--lower-threshold`, `--weights`. Added `parseOneUrl`, `loadGoldenSet` (url TAB fullPath lines or JSON array). In `main`, when `--train` and `--golden-set` are set: load golden set and file list, loop over pathWeight/albumWeight/fileWeight combinations, run consensus for each golden URL, record best weights and print; then exit.
- **Phase 8 – Integration:** Added algorithm "Weighted fuzzy consensus (path+album+filename)" that calls `consensusMatch` with useSkeleton and useSynonyms. `runAlgorithms(parsedUrls, fileIndex, options)` now accepts options and passes them to algorithms that take a third argument; main passes threshold, confidenceGap, lowerThreshold, weights from CLI.
- **Phase 9 – Documentation:** Updated script header with 98% target, weighted fuzzy consensus description (trigram index, early-exit, Borda, tiered threshold, depth penalty, substring multiplier, skeleton, stemming, training). Documented Usage with `--threshold`, `--confidence-gap`, `--lower-threshold`, `--weights`, `--train`, `--golden-set`.
- **Phase 10–11 – Review:** Fixed Jaro-Winkler prefix to a proper common-prefix count (max 4). Capped candidate pool at CANDIDATE_CAP after merging. No fuzzy-match tasks in TODO.md/TODO-summarized.md; no changes there.

## File modified

- `scripts/fuzzy-filename-match-algorithms.mjs` – all new logic in this single file; no backend/frontend coupling.

## Result

The script now runs 11 algorithms including "Weighted fuzzy consensus (path+album+filename)". Hit rate can be tuned via default weights/thresholds and optionally via `--train --golden-set` and CLI flags. No terminal commands were run; implementation is code-only.
