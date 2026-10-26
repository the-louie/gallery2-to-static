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
