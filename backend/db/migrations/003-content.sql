-- Sprint 18 (albums, uploads): the URL-segment lock. url_locked_at is set by the generator the first
-- time an album is written while not hidden; after that a title change never changes the public
-- path (data-master.md invariant 4). (owners.email exists since migration 1.)
ALTER TABLE items ADD COLUMN url_locked_at TEXT;
