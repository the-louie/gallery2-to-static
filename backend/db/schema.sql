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
    UNIQUE (parent_id, path_component)
);
CREATE INDEX items_parent ON items(parent_id, position);
-- album URL segments are unique among siblings (getSegmentForAlbum disambiguates); photo slugs may
-- collide (IMG_1.jpg / IMG_1.JPG in one album exist in the data) and the frontend takes the first
CREATE UNIQUE INDEX items_album_segment ON items(parent_id, url_segment) WHERE type = 'album';

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

-- Dirty tracking (data-master.md invariant 3): a change marks the item's album and its parent;
-- the generator expands the set to every ancestor at run time (SQLite triggers take no CTE).
-- NOT EXISTS instead of OR IGNORE: the outer statement's conflict policy (an UPSERT) would override OR IGNORE.
CREATE TRIGGER items_dirty_insert AFTER INSERT ON items BEGIN
    INSERT INTO dirty_albums (album_id) SELECT NEW.parent_id WHERE NEW.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT NEW.id WHERE NEW.type = 'album'
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.id);
END;

CREATE TRIGGER items_dirty_update AFTER UPDATE OF parent_id, position, order_weight, title, description, summary, path_component,
    url_segment, event_at, width, height, thumb_width, thumb_height, owner_id, view_count, hidden, deleted_at ON items BEGIN
    INSERT INTO dirty_albums (album_id) SELECT OLD.parent_id WHERE OLD.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = OLD.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT NEW.parent_id WHERE NEW.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT NEW.id WHERE NEW.type = 'album'
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.id);
    UPDATE items SET changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id AND changed_at = OLD.changed_at;
END;

CREATE TRIGGER highlights_dirty_insert AFTER INSERT ON highlights BEGIN
    INSERT INTO dirty_albums (album_id) SELECT NEW.album_id WHERE NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.album_id);
    INSERT INTO dirty_albums (album_id) SELECT i.parent_id FROM items i WHERE i.id = NEW.album_id AND i.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = i.parent_id);
END;
CREATE TRIGGER highlights_dirty_update AFTER UPDATE ON highlights BEGIN
    INSERT INTO dirty_albums (album_id) SELECT NEW.album_id WHERE NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.album_id);
    INSERT INTO dirty_albums (album_id) SELECT i.parent_id FROM items i WHERE i.id = NEW.album_id AND i.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = i.parent_id);
END;
CREATE TRIGGER highlights_dirty_delete AFTER DELETE ON highlights BEGIN
    INSERT INTO dirty_albums (album_id) SELECT OLD.album_id WHERE NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = OLD.album_id);
    INSERT INTO dirty_albums (album_id) SELECT i.parent_id FROM items i WHERE i.id = OLD.album_id AND i.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = i.parent_id);
END;

-- an owner's display name appears in every album and child entry they own
CREATE TRIGGER owners_dirty_update AFTER UPDATE OF nickname, full_name, show_full_name ON owners BEGIN
    INSERT INTO dirty_albums (album_id) SELECT DISTINCT i.parent_id FROM items i WHERE i.owner_id = NEW.id AND i.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = i.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT i.id FROM items i WHERE i.owner_id = NEW.id AND i.type = 'album'
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = i.id);
END;
