# Fuzzy filename match algorithm script

**Date:** 2026-02-01

## Summary

Created `scripts/fuzzy-filename-match-algorithms.mjs`, a JavaScript script that evaluates 10 matching algorithms to map database-derived URLs from the mismatch report (1043 URLs) to actual files in `__docs/missing_images_20260201/all-lanbilder-files.txt`.

The script parses URLs from `02-mismatch-backend-vs-extract-py.md`, extracts base filenames from the thumb format (`__t_X___Y.jpg`), and tests each algorithm against the file list. Results are output as a table sorted by hits (best first), with sample hit and miss examples.

Algorithms include: exact normalized, case-insensitive, path variants (hyphen/underscore/collapsed), space normalization, last-segment priority (album-first), numeric suffix stripping, Levenshtein on segments, and a combined algorithm that applies all normalizations with album-first matching.

Optional args: `--mismatch-file` and `--file-list` to override default paths.

No TODO task for this work existed in TODO.md or TODO-summarized.md; none removed.
