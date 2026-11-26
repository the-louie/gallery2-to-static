-- Per-photo photographer credit (Glitched, our first hosting customer, 2026-11): they require the
-- photographer's name shown on each image. Nullable, empty by default; the public photo page shows it
-- only when set. Previously the name was put in the description by hand; that free text is left as-is.
--
-- The column is added to the items_dirty_update trigger so that editing ONLY the photographer still
-- marks the album for regeneration. SQLite can't ALTER a trigger, so it is dropped and recreated with
-- the same body plus the photographer column (this trigger is still the one defined in schema.sql;
-- migrations 002-004 did not change it).
ALTER TABLE items ADD COLUMN photographer TEXT;

DROP TRIGGER items_dirty_update;

CREATE TRIGGER items_dirty_update AFTER UPDATE OF parent_id, position, order_weight, title, description, summary, path_component,
    url_segment, event_at, width, height, thumb_width, thumb_height, owner_id, view_count, hidden, deleted_at, photographer ON items
    WHEN OLD.parent_id IS NOT NEW.parent_id OR OLD.position IS NOT NEW.position OR OLD.order_weight IS NOT NEW.order_weight
        OR OLD.title IS NOT NEW.title OR OLD.description IS NOT NEW.description OR OLD.summary IS NOT NEW.summary
        OR OLD.path_component IS NOT NEW.path_component OR OLD.url_segment IS NOT NEW.url_segment OR OLD.event_at IS NOT NEW.event_at
        OR OLD.width IS NOT NEW.width OR OLD.height IS NOT NEW.height OR OLD.thumb_width IS NOT NEW.thumb_width
        OR OLD.thumb_height IS NOT NEW.thumb_height OR OLD.owner_id IS NOT NEW.owner_id OR OLD.view_count IS NOT NEW.view_count
        OR OLD.hidden IS NOT NEW.hidden OR OLD.deleted_at IS NOT NEW.deleted_at OR OLD.photographer IS NOT NEW.photographer
    BEGIN
    INSERT INTO dirty_albums (album_id) SELECT OLD.parent_id WHERE OLD.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = OLD.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT NEW.parent_id WHERE NEW.parent_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.parent_id);
    INSERT INTO dirty_albums (album_id) SELECT NEW.id WHERE NEW.type = 'album'
        AND NOT EXISTS (SELECT 1 FROM dirty_albums WHERE album_id = NEW.id);
    UPDATE items SET changed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id AND changed_at = OLD.changed_at;
END;
