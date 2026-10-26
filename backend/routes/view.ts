/**
 * View counter (Sprint 16 T-02; data-master.md `view_counts`): the SPA posts `/api/view/<id>` when a
 * photo or album is shown; the pending count is folded into `items.view_count` by the nightly job.
 * Public, anonymous, no cookies, no body: 204 for a visible item, 404 for anything else.
 */
import type { Router } from '../http.ts';
import { noContent, error, intParam } from '../http.ts';
import type { Db } from '../db/db.ts';

const SQL_VISIBLE_ITEM = 'SELECT 1 FROM items WHERE id = ? AND hidden = 0 AND deleted_at IS NULL';
const SQL_COUNT_VIEW = `INSERT INTO view_counts (item_id, pending, updated_at) VALUES (?, 1, ?)
    ON CONFLICT(item_id) DO UPDATE SET pending = pending + 1, updated_at = excluded.updated_at`;

/** Adds one pending view for a visible (not hidden, not deleted) item; false when there is none. */
export function countView(db: Db, itemId: number, now: Date = new Date()): boolean {
    if (!db.get(SQL_VISIBLE_ITEM, itemId)) return false;
    db.run(SQL_COUNT_VIEW, itemId, now.toISOString());
    return true;
}

export function registerViewRoutes(router: Router): void {
    router.post('/api/view/:id', (ctx) => {
        const id = intParam(ctx.params.id);
        if (id === undefined || !countView(ctx.db, id)) return error(404, 'not found');
        return noContent();
    });
}
