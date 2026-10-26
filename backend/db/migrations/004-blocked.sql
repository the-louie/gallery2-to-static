-- Operator item 11 (2026-10-26): a hidden photo may still be an album's chosen highlight. The Gallery 2
-- ignore lists (SEC-18: photos and albums that must never be served) are a different thing, so they
-- get their own flag. At this point every hidden row came from the import, so blocked = hidden.
ALTER TABLE items ADD COLUMN blocked INTEGER NOT NULL DEFAULT 0 CHECK (blocked IN (0, 1));
UPDATE items SET blocked = 1 WHERE hidden = 1;
