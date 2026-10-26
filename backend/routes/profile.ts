/**
 * Profile routes (Sprint 18 T-05; admin-api.md "Profile").
 */
import * as path from 'node:path';
import type { Router } from '../http.ts';
import { json, intParam, HttpError, type Reply } from '../http.ts';
import { requireUser, type AuthDeps } from '../auth/guard.ts';
import { readMultipart } from '../multipart.ts';
import { getProfile, updateProfile, setPicture, readPicture, MAX_PICTURE_BYTES } from '../profile.ts';

export interface ProfileDeps { avatarsDir: string; onChange: () => void }

export function registerProfileRoutes(router: Router, deps: AuthDeps, p: ProfileDeps): void {
    const picture = (buf: Buffer | null): Reply => buf ? { status: 200, body: buf, headers: { 'content-type': 'image/jpeg' } } : { status: 404, json: { error: 'no picture' } };

    router.get('/api/me/profile', requireUser(deps, (ctx) => json(200, getProfile(ctx.db, ctx.user, p.avatarsDir))));

    router.put('/api/me/profile', requireUser(deps, (ctx) => {
        const body = (ctx.body && typeof ctx.body === 'object' ? ctx.body : {}) as Record<string, unknown>;
        const profile = updateProfile(ctx.db, ctx.user, body, p.avatarsDir);
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'profile update', target: `user:${ctx.user.id}`, result: 'ok', detail: { fields: Object.keys(body) } });
        p.onChange(); // the owner name may appear on the public pages
        return json(200, profile);
    }));

    router.put('/api/me/picture', requireUser(deps, async (ctx) => {
        const parts = await readMultipart(ctx.req, path.join(p.avatarsDir, '.tmp'), { maxFileBytes: MAX_PICTURE_BYTES, maxTotalBytes: MAX_PICTURE_BYTES + 64 * 1024, maxFiles: 1 });
        const f = parts.files[0];
        if (!f) throw new HttpError(400, 'file required');
        if (f.truncated) throw new HttpError(413, `picture larger than ${MAX_PICTURE_BYTES} bytes`);
        const profile = await setPicture(ctx.db, ctx.user, f.path, p.avatarsDir);
        deps.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action: 'profile picture', target: `user:${ctx.user.id}`, result: 'ok' });
        return json(200, profile);
    }));

    router.get('/api/me/picture', requireUser(deps, (ctx) => picture(readPicture(p.avatarsDir, ctx.user.id))));

    router.get('/api/users/:id/picture', requireUser(deps, (ctx) => {
        const id = intParam(ctx.params.id);
        return picture(id === undefined ? null : readPicture(p.avatarsDir, id));
    }, { admin: true }));
}
