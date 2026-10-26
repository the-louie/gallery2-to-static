/**
 * Users tests (Sprint 16 T-05): migration 002 constraints (lower-case unique e-mail, role check,
 * nickname unique and not a Gallery 2 owner name, composite key on user_albums), invite /
 * enable / delegate / undelegate / resetTotp, and canWrite over the album tree.
 */
import assert from 'assert';
import { openDb } from './db/db.ts';
import { HttpError } from './http.ts';
import { inviteUser, findUserByEmail, findUserById, listUsers, setEnabled, delegate, undelegate, resetTotp, canWrite, delegatedAlbumIds, publicUser } from './auth/users.ts';
import { createSession, getSession } from './auth/session.ts';

async function run(): Promise<void> {
    const db = openDb();
    const tables = db.all<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").map((r) => r.name);
    for (const t of ['users', 'user_albums', 'sessions', 'audit_log']) assert.ok(tables.includes(t), `table ${t}`);

    // tree: 7 (root) > 10 > 11 > photo 111; 20 > photo 201
    db.run("INSERT INTO owners (id, nickname) VALUES (1, 'Gallery Administrator')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (7, 'album', NULL, '', '')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (10, 'album', 7, 'a', 'a')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (11, 'album', 10, 'b', 'b')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (111, 'photo', 11, 'p.jpg', 'p')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (20, 'album', 7, 'c', 'c')");
    db.run("INSERT INTO items (id, type, parent_id, path_component, url_segment) VALUES (201, 'photo', 20, 'q.jpg', 'q')");

    // schema constraints
    assert.throws(() => db.run("INSERT INTO users (email, role) VALUES ('Mixed@Case.se', 'user')"), /CHECK/, 'e-mail must be stored lower-case');
    assert.throws(() => db.run("INSERT INTO users (email, role) VALUES ('nope', 'user')"), /CHECK/, 'e-mail shape');
    assert.throws(() => db.run("INSERT INTO users (email, role) VALUES ('x@y.se', 'root')"), /CHECK/, 'role');
    assert.throws(() => db.run("INSERT INTO users (email, role, enabled) VALUES ('x@y.se', 'user', 2)"), /CHECK/, 'enabled 0/1');
    db.run("INSERT INTO users (id, email, role, nickname) VALUES (50, 'nick@y.se', 'user', 'Nick')");
    assert.throws(() => db.run("INSERT INTO users (email, role, nickname) VALUES ('nick2@y.se', 'user', 'Nick')"), /UNIQUE/, 'nickname unique');
    assert.throws(() => db.run("INSERT INTO users (email, role, nickname) VALUES ('ga@y.se', 'user', 'gallery administrator')"), /Gallery 2 owner/, 'owner names are reserved');
    assert.throws(() => db.run("UPDATE users SET nickname = 'Gallery Administrator' WHERE id = 50"), /Gallery 2 owner/);
    db.run("INSERT INTO users (email, role, nickname) VALUES ('n2@y.se', 'user', NULL)");
    db.run("INSERT INTO users (email, role, nickname) VALUES ('n3@y.se', 'user', NULL)"); // several NULL nicknames allowed
    assert.throws(() => db.run('INSERT INTO user_albums (user_id, album_id) VALUES (50, 999)'), /FOREIGN KEY/);
    db.run('INSERT INTO user_albums (user_id, album_id) VALUES (50, 10)');
    assert.throws(() => db.run('INSERT INTO user_albums (user_id, album_id) VALUES (50, 10)'), /UNIQUE|PRIMARY KEY/, 'composite key');
    db.raw.exec("DELETE FROM user_albums; DELETE FROM users");

    // invite
    const admin = inviteUser(db, '  Admin@Example.COM ', 'admin');
    assert.deepStrictEqual([admin.email, admin.role, admin.enabled, admin.nickname, admin.totp_secret, admin.last_login_at], ['admin@example.com', 'admin', 1, null, null, null]);
    assert.match(admin.created_at, /^\d{4}-\d\d-\d\dT/);
    const user = inviteUser(db, 'user@example.com', 'user');
    assert.ok(user.id > admin.id);
    const rejects = (fn: () => unknown, status: number, re: RegExp) => assert.throws(fn, (e: unknown) => e instanceof HttpError && e.status === status && re.test(e.message), `${status} ${re}`);
    rejects(() => inviteUser(db, 'USER@example.com', 'user'), 409, /exists/);
    rejects(() => inviteUser(db, 'not an email', 'user'), 400, /e-mail/);
    rejects(() => inviteUser(db, 'a@b', 'user'), 400, /e-mail/);
    rejects(() => inviteUser(db, 'x@example.com', 'owner' as never), 400, /role/);
    assert.strictEqual(findUserByEmail(db, 'ADMIN@example.com')!.id, admin.id);
    assert.strictEqual(findUserByEmail(db, 'nobody@example.com'), undefined);
    assert.deepStrictEqual(listUsers(db).map((u) => u.email), ['admin@example.com', 'user@example.com']);
    assert.strictEqual('totp_secret' in publicUser(admin), false);
    assert.deepStrictEqual(publicUser(user).enabled, true);

    // enable/disable ends sessions
    const s = createSession(db, user.id);
    assert.strictEqual(setEnabled(db, user.id, false).enabled, 0);
    assert.strictEqual(getSession(db, s.id), undefined, 'disabling ends sessions');
    assert.strictEqual(canWrite(db, user.id, 10), false, 'disabled users write nothing');
    assert.strictEqual(setEnabled(db, user.id, true).enabled, 1);
    rejects(() => setEnabled(db, 999, true), 404, /user/);

    // delegation
    assert.strictEqual(canWrite(db, admin.id, 201), true, 'admin writes everything');
    assert.strictEqual(canWrite(db, admin.id, 7), true);
    assert.strictEqual(canWrite(db, user.id, 7), false);
    assert.strictEqual(canWrite(db, user.id, 10), false);
    delegate(db, user.id, 10);
    delegate(db, user.id, 10); // idempotent
    assert.deepStrictEqual(delegatedAlbumIds(db, user.id), [10]);
    assert.strictEqual(canWrite(db, user.id, 10), true, 'the delegated album itself');
    assert.strictEqual(canWrite(db, user.id, 11), true, 'a sub-album');
    assert.strictEqual(canWrite(db, user.id, 111), true, 'a photo deep inside');
    assert.strictEqual(canWrite(db, user.id, 7), false, 'not the parent');
    assert.strictEqual(canWrite(db, user.id, 20), false, 'not a sibling');
    assert.strictEqual(canWrite(db, user.id, 201), false);
    assert.strictEqual(canWrite(db, user.id, 999), false, 'unknown item');
    assert.strictEqual(canWrite(db, 999, 10), false, 'unknown user');
    rejects(() => delegate(db, user.id, 999), 404, /album/);
    rejects(() => delegate(db, user.id, 111), 400, /not an album/);
    rejects(() => delegate(db, 999, 10), 404, /user/);
    delegate(db, user.id, 20);
    assert.deepStrictEqual(delegatedAlbumIds(db, user.id), [10, 20]);
    assert.strictEqual(undelegate(db, user.id, 10), true);
    assert.strictEqual(undelegate(db, user.id, 10), false, 'already gone');
    assert.strictEqual(canWrite(db, user.id, 111), false);
    assert.strictEqual(canWrite(db, user.id, 201), true);
    // the root delegated = everything
    delegate(db, user.id, 7);
    assert.strictEqual(canWrite(db, user.id, 111), true);
    undelegate(db, user.id, 7);

    // TOTP reset
    db.run("UPDATE users SET totp_secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', totp_verified_at = '2026-10-26T00:00:00.000Z', totp_last_step = 5 WHERE id = ?", user.id);
    const s2 = createSession(db, user.id);
    resetTotp(db, user.id);
    const after = findUserById(db, user.id)!;
    assert.deepStrictEqual([after.totp_secret, after.totp_verified_at, after.totp_last_step], [null, null, null]);
    assert.strictEqual(getSession(db, s2.id), undefined, 'reset ends sessions');
    rejects(() => resetTotp(db, 999), 404, /user/);

    db.close();
    console.log('users tests passed');
}

run().catch((e) => { console.error(e); process.exit(1); });
