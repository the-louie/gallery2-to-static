# The data master (FUT-01, Sprint 15)

**Status:** decided 2026-10-26 (operator interview; `TODO.md` FUT-01 "Decisions"). Implemented by Sprint 15.

## Why

Until Sprint 14 the gallery was a one-shot export: `backend/extract.ts` read the Gallery 2 MySQL
database and wrote the static files the SPA reads (`data/<id>.json`, `data/index.json`,
`data/legacy.json`, `data/search/index.json`) plus thumbnails, 1024px resizes and the published
link tree. Nothing could change after the export except by running it again against Gallery 2.
The operator wants to add albums and photos without Gallery 2, so a database of our own becomes
the master and the static files become derived output that is regenerated per changed branch.

## Where it lives

- File: `/mnt/storage/lanbilder-app/db/gallery.sqlite` on lanbilder2 (user `lanbilder`, mode 600),
  WAL mode. A nightly copy (`sqlite3 .backup`) goes to `/mnt/storage/backup/gallery-<date>.sqlite`;
  the last 30 copies are kept. The repo never contains a database.
- Engine: Node's built-in `node:sqlite` (`DatabaseSync`), available in Node 22.23 on lanbilder2 and
  on the build machine; no native module. The npm scripts pass `--no-warnings=ExperimentalWarning`.
  Fallback if it misbehaves: `better-sqlite3` behind the same `backend/db/db.ts` interface.
- Writers: the importer (`backend/importG2.ts`, once), the generator's bookkeeping, the
  `lanbilder-admin` service (Sprint 15 T-08 onwards: view counts, later the admin UI). Readers: the
  generator. The SPA never talks to the database.

## Schema (`backend/db/schema.sql`)

```
migrations     (id INTEGER PK, applied_at TEXT)

owners         (id INTEGER PK,                 -- imported rows: one per Gallery 2 display name (ids from 1)
                nickname TEXT NOT NULL,        -- shown as "Owner:"; unique (FUT-03)
                full_name TEXT,                -- optional; shown instead of the nickname when show_full_name = 1
                show_full_name INTEGER NOT NULL DEFAULT 0,
                email TEXT UNIQUE,             -- the admin user's e-mail (profile.ts keeps the row in step); NULL for imported owners
                created_at TEXT NOT NULL)

items          (id INTEGER PK,                 -- Gallery 2 ids kept; new ids continue the sequence
                type TEXT NOT NULL CHECK (type IN ('album','photo')),
                parent_id INTEGER REFERENCES items(id),   -- NULL for the root
                position INTEGER NOT NULL,     -- order among siblings (Gallery 2 orderWeight, then insertion)
                title TEXT, description TEXT, summary TEXT,   -- decoded text as today (entities decoded; BBCode kept)
                path_component TEXT NOT NULL,  -- Gallery 2 pathComponent = directory / file name on disk
                url_segment TEXT NOT NULL,     -- albums: the clean URL segment (titleToSegment); locked once public
                event_at INTEGER,              -- Gallery 2 originationTimestamp (shown as "Date:"), editable
                created_at TEXT NOT NULL, changed_at TEXT NOT NULL,
                width INTEGER, height INTEGER, -- photos
                owner_id INTEGER REFERENCES owners(id),
                view_count INTEGER NOT NULL DEFAULT 0,  -- baseline from Gallery 2; the counter adds to it nightly
                hidden INTEGER NOT NULL DEFAULT 0,      -- not generated, files stay (ignoreAlbums/ignoreItems, new albums until unticked)
                deleted_at TEXT)               -- soft delete: not generated, file moved to <albumsRoot>/.trash/<id>/; never hard-deleted
   UNIQUE (parent_id, path_component), UNIQUE (parent_id, url_segment)

highlights     (album_id INTEGER PK REFERENCES items(id),
                photo_id INTEGER NOT NULL REFERENCES items(id),
                chosen INTEGER NOT NULL DEFAULT 0)      -- 1 = Gallery 2's / the user's choice; 0 = default (first photo), recomputed

media          (item_id INTEGER PK REFERENCES items(id),
                thumb_w INTEGER, thumb_h INTEGER, thumb_at TEXT,   -- thumbnail generated from the current file
                resize_w INTEGER, resize_h INTEGER, resize_at TEXT, -- 1024px copy, NULL when the original is small enough
                published_at TEXT,             -- link in the published tree exists
                file_size INTEGER, file_mtime INTEGER)             -- what the derivatives were made from (skip when unchanged)

legacy_paths   (g2_path TEXT PK,               -- Gallery 2 pathComponent chain, e.g. dreamhack/dhw05/dhphotos
                item_id INTEGER NOT NULL REFERENCES items(id))   -- old URL -> new path comes from the item

view_counts    (item_id INTEGER PK REFERENCES items(id), pending INTEGER NOT NULL DEFAULT 0, updated_at TEXT)

dirty_albums   (album_id INTEGER PK REFERENCES items(id), since TEXT NOT NULL)

settings       (key TEXT PK, value TEXT)       -- root_id, site_name, site_description(_override), thumb/resize sizes
```

Added since: `items.blocked` (migration 004: the Gallery 2 ignore lists, never served and never a
highlight; `hidden` alone is the operator's choice and a hidden photo may still be an album's chosen
highlight), `settings.album_sort` (`title` default: sub-albums alphabetically before the photos;
`position` = Gallery 2 order), `items.url_locked_at` (migration 003), `items.order_weight`, `thumb_width/height`
(the Gallery 2 values the extractor emitted), `media.thumb_failed`; the generator shows
`owners.full_name` instead of the nickname when `show_full_name = 1`.

Not carried over on purpose: Gallery 2 comments (operator, 2026-10-26: not imported), Gallery 2
users beyond the owner names, thumbnail crops (Sprint 12 measured 57,741 of 58,574 thumbnails as
plain centre crops, the rest trivial: `object-fit: cover` reproduces them).

### Invariants

1. **No hard delete.** `deleted_at` hides an item from generation; its files move to
   `<albumsRoot>/.trash/<id>/` (same relative layout) and come back on restore. Only the admin
   restores or purges (purge = operator action outside the app, never a button).
2. **`hidden`** is independent of deletion: a hidden album is not generated and its subtree is not
   either; the files stay in place. New albums start hidden (publishing decision).
3. **`changed_at` propagates.** Triggers on `items` (insert, update of the generated columns, change
   of `hidden`/`deleted_at`) and on `highlights`/`media` insert the item's album and every ancestor
   up to the root into `dirty_albums`. Moving an item marks both the old and the new parent chain.
4. **`url_segment` is locked** once the album has been generated while not hidden
   (`items.url_locked_at`, set by `generateAll`; migration 003). Renaming the title afterwards
   changes the heading, not the URL; a deliberate URL change is an admin action (`PATCH` with
   `force: true`) that also writes the old clean path into `legacy_paths` (`clean:/old/path/`).
5. **Ids are stable.** Gallery 2 ids are kept so `/album/<id>` routes, `legacy.json` and the search
   index keep working; new items get ids above the imported maximum.

## Generation contract (`backend/generate.ts`)

| Output | Source | Written when |
|---|---|---|
| `data/<albumId>.json` | the album row (metadata, breadcrumb from the ancestor chain, highlight, counts) + its non-hidden, non-deleted children with their `media` rows | `--all`, or the album is in `dirty_albums` |
| `data/index.json` | `settings` (root id, site name/description), the path index of every generated album | `--all`, or any album is dirty (path index may change) |
| `data/legacy.json` | `legacy_paths` + every photo's album | `--all`, or a dirty album has new/changed children |
| `data/search/index.json` | every generated album (title, description, parent, path) | every run |
| thumbnails, resizes, published links | `items` + `media` (skip when `file_size`/`file_mtime` unchanged) | `images` step, per dirty album, before its JSON |

Counts (`childCount`, `totalDescendantImageCount`, `totalDescendantCount`) are computed from the
tree at generation time, never stored. The output format is `backend/types.ts` unchanged, so the
SPA needs no change; the equivalence test (T-04) proves it against the old extractor on the fake
database, and T-07 proves it on the real data (1,392 files).

Atomicity: a run writes into `data.new-<stamp>/` and promotes it (`outputDir.ts`); the dirty set
is cleared in the same transaction that records the run, so a crash mid-run leaves the albums
dirty and the old files live.

## Commands

```
node importG2.ts           # once: Gallery 2 MySQL -> gallery.sqlite (idempotent)
node generate.ts --all     # everything, into a staging dir, then promote
node generate.ts --changed # only dirty albums (+ index/legacy/search as needed)
node generate.ts images    # derivatives only
```

The `lanbilder-admin` service (T-08) runs `--changed` itself, 5 seconds after the last change, one
run at a time, and the nightly timer folds `view_counts.pending` into `items.view_count` (marking
those albums dirty) and takes the backup.

## Migration from the one-shot export

Sprint 15 T-07: import on lanbilder2 while the MySQL copy is still reachable, generate everything
into staging, diff against the live `data/` (ids, titles, paths, highlights, counts, search entries),
promote. From then on `extract.ts` is superseded (kept as the historical one-shot; its tests stay
as the reference for the equivalence test). Later sprints (FUT-02..05) only ever write the database.
