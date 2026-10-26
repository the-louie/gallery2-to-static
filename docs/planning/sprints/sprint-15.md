# Sprint 15: the data master (FUT-01)

**Status:** in progress (opened 2026-10-26)
**Current ticket:** T-10 (`todo` — Docs, runbook, retro)
**Last completed:** T-09 (`done` — commit `685c74b`)

**Goal:** a SQLite database on lanbilder2 is the master of the gallery data; the static files are generated from it, a change regenerates only its branch, and the first admin service runs on the VM with the view counter.

**Demo:** on lanbilder2 the import from Gallery 2 has run once; `node generate.ts --all` reproduces today's 1,392 album files, index, legacy map and search index with no content differences; changing one album title in the database and running `node generate.ts --changed` rewrites only that album, its ancestors and the search index within seconds, and https://lanbilder-new.phetast.nu/ shows the new title; the `lanbilder-admin` service answers on 127.0.0.1 and every page view on the test site increments the album's or photo's counter, folded into the pages by the nightly run.

**Decisions this sprint implements** (interview 2026-10-26, `TODO.md` FUT-01): service on lanbilder2 itself; counters keep counting; comments not imported; originals keep the Gallery 2 directory layout; URL segment derived from the title and locked once public; event date editable; highlight defaults to the first image.

**Verified before planning:** `backend/extract.ts` (930 lines) does the Gallery 2 read, path building, highlight choice, counts, search index, `legacy.json` and `index.json` in one pass with the JSON files as the only output; thumbnails/resizes come from `generateThumbnail.ts` keyed on the file tree; Node 22.23 on lanbilder2 ships `node:sqlite` (`DatabaseSync`, experimental warning only), so no native module is needed; lanbilder2 has 12 GB RAM after the operator's reboot (2026-10-26), no Docker yet; the Gallery 2 MySQL copy is still reachable from the build machine for the import.

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Architecture note: the data master | FUT-01 | 2h | – | done | `docs/architecture/data-master.md`: schema (items, owners, highlights, thumbnail crops, legacy paths, view counts, generation state), invariants (no hard delete: `deleted_at`; `hidden`; `changed_at` propagates to ancestors), the generation contract (which files each table feeds), the CLI (`import`, `generate --all/--changed`, `images`), where the file lives (`/mnt/storage/lanbilder-app/db/gallery.sqlite`, 600, user lanbilder, nightly copy to `/mnt/storage/backup/`). Landed in `499e984` |
| T-02 | SQLite layer | FUT-01 | 3h | T-01 | done | `backend/db/schema.sql` + `backend/db/db.ts` (`node:sqlite`, WAL, foreign keys, migrations table, typed helpers, `--no-warnings=ExperimentalWarning` in the npm scripts); tests with an in-memory database. Landed in `eed0ea6` |
| T-03 | Importer: Gallery 2 → SQLite | FUT-01 | 4h | T-02 | done | `backend/importG2.ts`: items (albums/photos, parent, order, titles decoded + BBCode stripped as today, path components, timestamps, sizes, view counts), owners, chosen highlights (derivative chains, Sprint 12 T-01), legacy paths (no thumbnail crops: Sprint 12 measured them as plain centre crops); `ignoreAlbums`/`ignoreItems` become `hidden = 1` rows (nothing dropped); idempotent (re-import updates, never duplicates); test with the fake sql from `extract.test.ts`. Landed in `0e7812c` |
| T-04 | Generator: SQLite → static files | FUT-01 | 4h | T-02 | done | `backend/generate.ts --all`: `data/<id>.json` (metadata + children exactly as `types.ts`), `index.json`, `legacy.json`, `search/index.json`; equivalence test: fake-sql extraction → import → generate equals today's extractor output (deep-equal, key order free). Landed in `901bfd9` |
| T-05 | Image pipeline from the database | FUT-01 | 3h | T-04 | done | thumbnails (with crops), 1024px resizes and the published link tree driven by item rows instead of the file walk (`generateThumbnail.ts`, `publishImages.ts` reused); skipped when up to date; a `media` table records what exists; test. Landed in `0318ea5` |
| T-06 | Dirty tracking and branch regeneration | FUT-01 | 4h | T-04, T-05 | done | triggers set `changed_at` and insert into `dirty_albums` for the item's album and every ancestor on insert/update/soft delete; `generate --changed` rewrites those albums, `index.json` if the root changed, `legacy.json` if paths changed, the search index always; clears the dirty set in the same transaction as the write; tests: changed title, added photo, soft-deleted sub-album (its JSON removed from the output, parent counts updated). Landed in `71b7728` |
| T-07 | Full run on lanbilder2 and switch of the master | FUT-01 | 3h | T-03..T-06 | done | import from MySQL (`systemd-run`, log), `generate --all` into a staging dir, diff against the live `data/` (1,392 files; counts, highlights, search entries), promote; from here `data/` is never written by `extract.ts` again (left in the repo as the one-shot it was, marked superseded); the backup copy of the database to `/mnt/storage/backup/`. Landed in `12d2ba8` |
| T-08 | `lanbilder-admin` service skeleton | FUT-01 | 3h | T-06 | done | `backend/server.ts`: Node HTTP server on 127.0.0.1:3100 as user `lanbilder` (systemd unit, `MemoryMax`, restart), `/healthz`, a debounced regeneration queue (`generate --changed` 5 s after the last change, one run at a time), structured log to journald; nginx proxies `/api/` on the public vhost to it (only the paths the next tickets add); test the queue. Landed in `685c74b` |
| T-09 | View counter | FUT-01 | 3h | T-08 | done | (code landed in `685c74b` together with T-08's commit — the add -A swept it in; verified: beacons 204 from root/album/photo in classic and dark, nightly fold shows 5206 views on album 14364, backups in `/mnt/storage/backup/`)  decision: counters keep counting. `POST /api/view/<id>` (nginx `limit_req` 10/s per IP, 1-byte reply, no cookies) adds to `view_counts`; the frontend sends a `navigator.sendBeacon` on album and photo views in every theme (test); the nightly timer (`systemd` timer) folds the counts into `items.view_count` and marks the albums dirty, so the pages show them next morning; the old numbers are the baseline. Landed in `685c74b` |
| T-10 | Docs, runbook, retro | FUT-01 | 2h | T-07..T-09 | todo | CLAUDE.md data flow (DB master, generate, service), user guide 03 (import/generate/regenerate/service commands), `/srv/share/lanbilder2/db-runbook.txt` (where the file is, backup, restore, the three commands), ESXi todo note; retro |

Total ≈ 31h.

## Open points
- `node:sqlite` prints an experimental warning on Node 22; the npm scripts silence it. If it proves unstable, `better-sqlite3` is the fallback (needs a compiler on lanbilder2).
- The import needs the MySQL copy on the build machine (10.13.110.162); it is read once in T-07 and not needed afterwards.
- Soft-deleted items' files stay on disk (no-delete policy); only the generated JSON stops listing them.

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)
