# Fuzzy Match Best-Strategy Output for Backend

**Date:** 2026-02-01

## Summary

Implemented `--output-strategy [path]` in `scripts/fuzzy-filename-match-algorithms.mjs` so the best algorithm strategy is written as machine-readable JSON for backend consumption.

## Changes

- **parseArgs:** Added `--output-strategy` with optional path. When the flag is present without a path, writes to `fuzzy-match-strategy.json` in the repo root.
- **main:** After computing results and selecting the best algorithm (`results[0]`), builds a strategy object with `algorithm`, `type` (single or consensus), `params` (null for single algorithms; for "Weighted fuzzy consensus (path+album+filename)" includes threshold, confidenceGap, lowerThreshold, weights), `hits`, `total`, `hitRate`. When `outputStrategyPath` is set, writes the JSON file with UTF-8. File write errors are caught and cause exit(1).
- **Documentation:** Script header documents the new flag, the output JSON schema, and default path. Usage section updated.

## Output Schema

For single algorithms, `params` is null. For the fuzzy consensus algorithm, `params` includes `threshold`, `confidenceGap`, `lowerThreshold`, and `weights` (pathWeight, albumWeight, fileWeight). Backend can read this file and use it during extraction.

## File Modified

- `scripts/fuzzy-filename-match-algorithms.mjs`

## Backend

No backend changes in this work. The produced JSON file is the contract; backend integration (reading and using the strategy) is left for later.
