-- Operator item 11 (2026-10-26): a hidden photo may still be an album's chosen highlight. The Gallery 2
-- ignore lists (SEC-18: photos and albums that must never be served) are a different thing, so they
-- get their own flag: the rows the import hid (created at or before settings.imported_at); albums the
-- operator hid afterwards stay merely hidden. (On lanbilder2 the first version of this migration blocked
-- every hidden row; one operator album was unblocked by hand on 2026-10-26.)
ALTER TABLE items ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0, 1));
UPDATE items SET blocked = 1 WHERE hidden = 1
    AND created_at <= COALESCE((SELECT value FROM settings WHERE key = 'imported_at'), '9999');
