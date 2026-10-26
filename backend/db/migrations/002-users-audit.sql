-- Admin users, delegation, sessions and the audit log (Sprint 16 T-04/T-05; TODO.md FUT-02..04
-- "Decisions"; docs/architecture/admin-service.md). Migration 2.

-- Invite-only accounts keyed by the e-mail Cloudflare Access asserts (always lower case).
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email TEXT NOT NULL UNIQUE CHECK (email = lower(trim(email)) AND email LIKE '%_@_%'),
    role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    nickname TEXT UNIQUE,                 -- shown as "Owner:" (FUT-03); NULL until the user picks one
    full_name TEXT,
    show_full_name INTEGER NOT NULL DEFAULT 0 CHECK (show_full_name IN (0, 1)),
    totp_secret TEXT,                     -- base32; set by /api/auth/totp/setup, NULL after an admin reset
    totp_verified_at TEXT,                -- first successful code; NULL = setup still allowed
    totp_last_step INTEGER,               -- last accepted time step (a code is accepted once)
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    last_login_at TEXT
);

-- 0..n delegated albums per user; rights cover the whole subtree (users.ts canWrite).
CREATE TABLE user_albums (
    user_id INTEGER NOT NULL REFERENCES users(id),
    album_id INTEGER NOT NULL REFERENCES items(id),
    PRIMARY KEY (user_id, album_id)
);

-- Server-side sessions; the cookie carries the id signed with the server secret.
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    totp_ok INTEGER NOT NULL DEFAULT 0 CHECK (totp_ok IN (0, 1))
);
CREATE INDEX sessions_user ON sessions(user_id);

-- A nickname may not collide with a historical Gallery 2 owner name (FUT-03 "Decisions").
CREATE TRIGGER users_nickname_not_owner_insert BEFORE INSERT ON users
WHEN NEW.nickname IS NOT NULL AND EXISTS (SELECT 1 FROM owners WHERE nickname = NEW.nickname COLLATE NOCASE)
BEGIN SELECT RAISE(ABORT, 'nickname taken by a Gallery 2 owner'); END;
CREATE TRIGGER users_nickname_not_owner_update BEFORE UPDATE OF nickname ON users
WHEN NEW.nickname IS NOT NULL AND EXISTS (SELECT 1 FROM owners WHERE nickname = NEW.nickname COLLATE NOCASE)
BEGIN SELECT RAISE(ABORT, 'nickname taken by a Gallery 2 owner'); END;

-- Append-only audit log (FUT-04 "Decisions"): kept forever, mirrored to a JSONL file, admin-only.
CREATE TABLE audit_log (
    id INTEGER PRIMARY KEY,
    at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    user_id INTEGER,                      -- no FK: the row must survive anything that happens to the user
    email TEXT,
    ip TEXT,
    action TEXT NOT NULL,                 -- login, logout, session, totp_setup, totp_verify, authorize, invite, enable, disable, delegate, undelegate, totp_reset, ...
    target TEXT,                          -- what it concerned (user id, album id, route)
    result TEXT NOT NULL CHECK (result IN ('ok', 'denied', 'error')),
    detail TEXT                           -- JSON
);
CREATE INDEX audit_log_user ON audit_log(user_id, id);
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
