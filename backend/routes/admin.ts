/**
 * Admin-only user management (Sprint 16 T-05) and the audit log reader (T-06): invite,
 * enable/disable, delegate/undelegate albums, reset a user's TOTP, read the audit trail. Every
 * route requires an admin with a TOTP-passed session; every change is audited. 403 (not admin) is
 * answered before any lookup, so non-admins learn nothing.
 */
import type { Router } from '../http.ts';
import { json, noContent, error, intParam, HttpError } from '../http.ts';
import { requireUser, type AuthDeps, type AuthCtx } from '../auth/guard.ts';
import { inviteUser, listUsers, findUserById, setEnabled, delegate, undelegate, resetTotp, delegatedAlbumIds, publicUser, type Role, type User } from '../auth/users.ts';
import { listAudit } from '../audit.ts';

function userJson(ctx: AuthCtx, u: User): Record<string, unknown> {
    return { ...publicUser(u), albums: delegatedAlbumIds(ctx.db, u.id) };
}

function targetUser(ctx: AuthCtx): User {
    const id = intParam(ctx.params.id);
    const u = id === undefined ? undefined : findUserById(ctx.db, id);
    if (!u) throw new HttpError(404, 'user not found');
    return u;
}

export function registerAdminRoutes(router: Router, deps: AuthDeps): void {
    const admin = (handler: (ctx: AuthCtx) => ReturnType<typeof json> | Promise<ReturnType<typeof json>>) => requireUser(deps, handler, { admin: true });
    const audit = (ctx: AuthCtx, action: string, target: string, result: 'ok' | 'denied' | 'error', detail?: unknown) =>
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action, target, result, detail });

    router.get('/api/admin/users', admin((ctx) => json(200, { users: listUsers(ctx.db).map((u) => userJson(ctx, u)) })));

    router.post('/api/admin/users', admin((ctx) => {
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        const email = typeof body.email === 'string' ? body.email : '';
        const role = body.role === undefined ? 'user' : body.role;
        try {
            const u = inviteUser(ctx.db, email, role as Role);
            audit(ctx, 'invite', `user:${u.id}`, 'ok', { email: u.email, role: u.role });
            deps.onUsersChanged?.();
            return json(201, userJson(ctx, u));
        } catch (e) {
            if (e instanceof HttpError) audit(ctx, 'invite', email.trim().toLowerCase().slice(0, 254), 'error', { error: e.message });
            throw e;
        }
    }));

    router.put('/api/admin/users/:id/enabled', admin((ctx) => {
        const u = targetUser(ctx);
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        if (typeof body.enabled !== 'boolean') return error(400, 'enabled must be a boolean');
        if (!body.enabled && u.id === ctx.user.id) {
            audit(ctx, 'disable', `user:${u.id}`, 'denied', { reason: 'own account' });
            return error(400, 'you cannot disable your own account');
        }
        const updated = setEnabled(ctx.db, u.id, body.enabled);
        audit(ctx, body.enabled ? 'enable' : 'disable', `user:${u.id}`, 'ok', { email: u.email });
        deps.onUsersChanged?.();
        return json(200, userJson(ctx, updated));
    }));

    router.put('/api/admin/users/:id/albums/:albumId', admin((ctx) => {
        const u = targetUser(ctx);
        const albumId = intParam(ctx.params.albumId);
        if (albumId === undefined) return error(404, 'album not found');
        delegate(ctx.db, u.id, albumId);
        audit(ctx, 'delegate', `user:${u.id}`, 'ok', { albumId, email: u.email });
        return json(200, userJson(ctx, u));
    }));

    router.delete('/api/admin/users/:id/albums/:albumId', admin((ctx) => {
        const u = targetUser(ctx);
        const albumId = intParam(ctx.params.albumId);
        if (albumId === undefined || !undelegate(ctx.db, u.id, albumId)) return error(404, 'delegation not found');
        audit(ctx, 'undelegate', `user:${u.id}`, 'ok', { albumId, email: u.email });
        return json(200, userJson(ctx, u));
    }));

    // Audit trail, newest first: ?limit=100&before=<id> pages backwards.
    router.get('/api/admin/audit', admin((ctx) => {
        const limitRaw = ctx.url.searchParams.get('limit');
        const beforeRaw = ctx.url.searchParams.get('before');
        const limit = limitRaw === null ? undefined : intParam(limitRaw);
        const before = beforeRaw === null ? undefined : intParam(beforeRaw);
        if ((limitRaw !== null && limit === undefined) || (beforeRaw !== null && before === undefined)) return error(400, 'limit and before must be positive integers');
        const entries = listAudit(ctx.db, { limit, before });
        return json(200, { entries, next: entries.length ? entries[entries.length - 1].id : null });
    }));

    router.post('/api/admin/users/:id/totp/reset', admin((ctx) => {
        const u = targetUser(ctx);
        resetTotp(ctx.db, u.id);
        audit(ctx, 'totp_reset', `user:${u.id}`, 'ok', { email: u.email });
        return noContent();
    }));
}
