/**
 * The SQLite data master (FUT-01; docs/architecture/data-master.md): open, migrate, small typed
 * helpers. Uses Node's built-in `node:sqlite` (no native module). Every migration is a file
 * `db/migrations/NNN-*.sql` applied once, in order, inside one transaction each; `schema.sql` is
 * migration 1.
 */
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Row = Record<string, SQLInputValue>;

const here = path.dirname(fileURLToPath(import.meta.url));

/** The migrations in order: [id, name, sql]. Migration 1 is schema.sql; later ones live in db/migrations/. */
export function listMigrations(dir: string = here): Array<[number, string, string]> {
    const out: Array<[number, string, string]> = [[1, 'schema', fs.readFileSync(path.join(dir, 'schema.sql'), 'utf8')]];
    const mdir = path.join(dir, 'migrations');
    if (fs.existsSync(mdir)) {
        for (const f of fs.readdirSync(mdir).filter((n) => /^\d{3}-.*\.sql$/.test(n)).sort()) {
            const id = Number(f.slice(0, 3));
            if (id <= 1) throw new Error(`migration ${f}: ids start at 002`);
            out.push([id, f.slice(4, -4), fs.readFileSync(path.join(mdir, f), 'utf8')]);
        }
    }
    return out;
}

export class Db {
    readonly raw: DatabaseSync;
    readonly file: string;

    constructor(file: string, migrationsDir: string = here) {
        this.file = file;
        this.raw = new DatabaseSync(file);
        this.raw.exec('PRAGMA foreign_keys = ON');
        // two writers exist at times (the service and the nightly run): wait instead of SQLITE_BUSY
        this.raw.exec('PRAGMA busy_timeout = 5000');
        if (file !== ':memory:') this.raw.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL');
        this.migrate(migrationsDir);
    }

    private migrate(dir: string): void {
        this.raw.exec('CREATE TABLE IF NOT EXISTS migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
        const applied = new Set(this.all<{ id: number }>('SELECT id FROM migrations').map((r) => r.id));
        for (const [id, name, sql] of listMigrations(dir)) {
            if (applied.has(id)) continue;
            this.transaction(() => {
                this.raw.exec(sql);
                this.run('INSERT INTO migrations (id, name, applied_at) VALUES (?, ?, ?)', id, name, new Date().toISOString());
            });
        }
    }

    /** Applied migration ids, ascending. */
    migrations(): number[] {
        return this.all<{ id: number }>('SELECT id FROM migrations ORDER BY id').map((r) => r.id);
    }

    run(sql: string, ...params: SQLInputValue[]): { changes: number; lastInsertRowid: number } {
        const r = this.raw.prepare(sql).run(...params);
        return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    }

    get<T extends object = Row>(sql: string, ...params: SQLInputValue[]): T | undefined {
        return this.raw.prepare(sql).get(...params) as T | undefined;
    }

    all<T extends object = Row>(sql: string, ...params: SQLInputValue[]): T[] {
        return this.raw.prepare(sql).all(...params) as T[];
    }

    /** Runs fn inside BEGIN/COMMIT; rolls back and rethrows on error. Not re-entrant. */
    transaction<T>(fn: () => T): T {
        this.raw.exec('BEGIN');
        try {
            const out = fn();
            this.raw.exec('COMMIT');
            return out;
        } catch (e) {
            this.raw.exec('ROLLBACK');
            throw e;
        }
    }

    setting(key: string): string | null {
        return this.get<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', key)?.value ?? null;
    }

    setSetting(key: string, value: string | null): void {
        this.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', key, value);
    }

    close(): void {
        this.raw.close();
    }
}

/** Opens (creating and migrating if needed) the database at `file`, or an in-memory one for tests. */
export function openDb(file: string = ':memory:'): Db {
    return new Db(file);
}
