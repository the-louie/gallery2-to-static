/**
 * Regeneration status and manual run (Sprint 18 T-04; admin-api.md "Regeneration").
 */
import type { Router } from '../http.ts';
import { json } from '../http.ts';
import { requireUser, type AuthDeps } from '../auth/guard.ts';
import type { RegenQueue } from '../regenQueue.ts';

export function registerRegenRoutes(router: Router, deps: AuthDeps, queue: RegenQueue | undefined, request: () => void): void {
    router.get('/api/regen/status', requireUser(deps, (ctx) => {
        const last = ctx.db.get<{ mode: string; finished_at: string | null; ok: number }>('SELECT mode, finished_at, ok FROM generation_runs ORDER BY id DESC LIMIT 1');
        const dirty = ctx.db.get<{ n: number }>('SELECT count(*) AS n FROM dirty_albums')!.n;
        const settleMs = Number(process.env.REGEN_SETTLE_MS ?? 60_000);
        const running = queue?.isRunning ?? false;
        return json(200, {
            pending: (queue ? queue.busy && !running : false) || (!queue && dirty > 0),
            running,
            lastRun: last ? { mode: last.mode, finishedAt: last.finished_at, ok: last.ok === 1 } : null,
            dirty,
            /** albums are published once their last change is older than this (operator, 2026-10-26) */
            settleMs,
        });
    }));

    router.post('/api/regen', requireUser(deps, (ctx) => {
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'regen request', target: null, result: 'ok' });
        request();
        return json(200, { ok: true });
    }, { admin: true }));
}
