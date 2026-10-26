-- Gallery data master (FUT-01, docs/architecture/data-master.md). Migration 1.
-- Ids: Gallery 2 ids are kept on import; new rows continue the sequence.

CREATE TABLE owners (
    id INTEGER PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE,
    full_name TEXT,
    show_full_name INTEGER NOT NULL DEFAULT 0 CHECK (show_full_name IN (0, 1)),
    email TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('album', 'photo')),
    parent_id INTEGER REFERENCES items(id),
    position INTEGER NOT NULL DEFAULT 0,
    order_weight INTEGER,          -- Gallery 2 orderWeight as imported (emitted as "order" when present)
    title TEXT,
    description TEXT,
    summary TEXT,
    path_component TEXT NOT NULL,
    url_segment TEXT NOT NULL,
    event_at INTEGER,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    changed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    width INTEGER,
    height INTEGER,
    thumb_width INTEGER,           -- Gallery 2's derivative size as imported (photos: replaced by media at generation)
    thumb_height INTEGER,
    owner_id INTEGER REFERENCES owners(id),
    view_count INTEGER,            -- NULL = Gallery 2 had no counter; the view counter adds to it nightly
    hidden INTEGER NOT NULL DEFAULT 0 CHECK (hidden IN (0, 1)),
    deleted_at TEXT,
    UNIQUE (parent_id, path_component),
    UNIQUE (parent_id, url_segment)
);
CREATE INDEX items_parent ON items(parent_id, position);

CREATE TABLE highlights (
    album_id INTEGER PRIMARY KEY REFERENCES items(id),
    photo_id INTEGER NOT NULL REFERENCES items(id),
    chosen INTEGER NOT NULL DEFAULT 0 CHECK (chosen IN (0, 1))
);

CREATE TABLE media (
    item_id INTEGER PRIMARY KEY REFERENCES items(id),
    thumb_w INTEGER, thumb_h INTEGER, thumb_at TEXT,
    resize_w INTEGER, resize_h INTEGER, resize_at TEXT,
    thumb_failed INTEGER NOT NULL DEFAULT 0 CHECK (thumb_failed IN (0, 1)),  -- source could not be decoded: photo kept without thumbnail
    published_at TEXT,
    file_size INTEGER, file_mtime INTEGER
);

CREATE TABLE legacy_paths (
    g2_path TEXT PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES items(id)
);

CREATE TABLE view_counts (
    item_id INTEGER PRIMARY KEY REFERENCES items(id),
    pending INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT
);

CREATE TABLE dirty_albums (
    album_id INTEGER PRIMARY KEY REFERENCES items(id),
    since TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

CREATE TABLE generation_runs (
    id INTEGER PRIMARY KEY,
    mode TEXT NOT NULL,            -- all | changed | images
    started_at TEXT NOT NULL,
    finished_at TEXT,
    albums INTEGER NOT NULL DEFAULT 0,
    ok INTEGER NOT NULL DEFAULT 0 CHECK (ok IN (0, 1)),
    note TEXT
);
