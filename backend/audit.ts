/**
 * Audit log (Sprint 16 T-06; TODO.md FUT-04 "Decisions"): every login, denial, TOTP event, admin
 * action and failed authorisation becomes one row in the append-only `audit_log` table (triggers
 * refuse UPDATE/DELETE) and one JSON line in a file (env AUDIT_LOG_FILE, default
 * backend/audit.jsonl). Kept forever; read by admins only (`GET /api/admin/audit`).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Db } from './db/db.ts';
import type { AuditEvent, AuditSink } from './auth/guard.ts';

export const DEFAULT_AUDIT_FILE = path.join(import.meta.dirname, 'audit.jsonl');
export const AUDIT_DEFAULT_LIMIT = 100;
export const AUDIT_MAX_LIMIT = 1000;

export interface AuditRow {
    id: number;
    at: string;
    user_id: number | null;
    email: string | null;
    ip: string | null;
    action: string;
    target: string | null;
    result: string;
    detail: string | null;
}

/** The file the sink appends to: env AUDIT_LOG_FILE or backend/audit.jsonl. */
export function auditFile(env: NodeJS.ProcessEnv = process.env): string {
    return env.AUDIT_LOG_FILE || DEFAULT_AUDIT_FILE;
}

/** Writes one event to the table and appends its JSON line to `file`. Returns the row. */
export function audit(db: Db, event: AuditEvent, file: string = auditFile(), now: Date = new Date()): AuditRow {
    const detail = event.detail === undefined ? null : JSON.stringify(event.detail);
    const at = now.toISOString();
    const id = db.run(
        'INSERT INTO audit_log (at, user_id, email, ip, action, target, result, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        at, event.userId, event.email, event.ip, event.action, event.target ?? null, event.result, detail,
    ).lastInsertRowid;
    const row: AuditRow = { id, at, user_id: event.userId, email: event.email, ip: event.ip, action: event.action, target: event.target ?? null, result: event.result, detail };
    fs.appendFileSync(file, JSON.stringify({ ...row, detail: event.detail ?? null }) + '\n', { mode: 0o600 });
    return row;
}

/** An AuditSink for the guard and routes: never throws (a logging failure must not break a request). */
export function createAuditSink(db: Db, file: string = auditFile(), onError: (e: unknown) => void = (e) => console.error(`audit failed: ${e instanceof Error ? e.message : String(e)}`)): AuditSink {
    return (event) => {
        try {
            audit(db, event, file);
        } catch (e) {
            onError(e);
        }
    };
}

/** Newest first; `before` = only ids below it (paging). `limit` is clamped to 1..AUDIT_MAX_LIMIT. */
export function listAudit(db: Db, opts: { limit?: number; before?: number } = {}): Array<AuditRow & { detail: unknown }> {
    const limit = Math.min(AUDIT_MAX_LIMIT, Math.max(1, Math.floor(opts.limit ?? AUDIT_DEFAULT_LIMIT)));
    const rows = opts.before !== undefined
        ? db.all<AuditRow>('SELECT * FROM audit_log WHERE id < ? ORDER BY id DESC LIMIT ?', opts.before, limit)
        : db.all<AuditRow>('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', limit);
    return rows.map((r) => ({ ...r, detail: r.detail === null ? null : JSON.parse(r.detail) }));
}
