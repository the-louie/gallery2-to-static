# Backend Fuzzy Filename Matching Integration

**Date:** 2026-02-01

## Summary

Integrated fuzzy filename matching into the backend extraction so database-derived image URLs are resolved against actual file paths from the file list using the strategy from fuzzy-match-strategy.json.

## Changes

- **backend/fuzzyMatch.ts (new):** Ported weighted fuzzy consensus algorithm from scripts/fuzzy-filename-match-algorithms.mjs. Exports loadFileList, buildFileIndex, resolveFuzzy. Supports consensus and single strategies.
- **backend/index.ts:** Added startup loading of file list and strategy from config. Created createResolveImagePath that uses fuzzy matching when available. Integrated resolution into photo urlPath, album thumbnail paths, and highlight image URLs. All URL building now goes through resolveImagePath when fuzzy is enabled; falls back to getLinkTarget/getThumbTarget on miss.
- **backend/types.ts:** Added fileListPath, fuzzyStrategyPath, enableFuzzyMatch to Config.
- **backend/config_example.json:** Added example fuzzy config entries.
- **backend/fuzzyMatch.test.ts (new):** Unit tests for loadFileList, buildFileIndex, resolveFuzzy.

## Config

Set fileListPath (e.g. backend/all-lanbilder-files.txt) and fuzzyStrategyPath (e.g. fuzzy-match-strategy.json) in config.json. When both load successfully, fuzzy matching is used during extraction.

## TODO

No related tasks in TODO.md or TODO-summarized.md.
