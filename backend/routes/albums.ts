/**
 * Album routes (Sprint 18 T-01; docs/architecture/admin-api.md). Authorisation: `canWrite` on the
 * target (for a new album: on the parent); admins everywhere. Every write is audited and asks the
 * regeneration queue (`onChange`).
 */
import type { Router } from '../http.ts';
import { json, noContent, intParam, HttpError } from '../http.ts';
import { requireUser, type AuthDeps, type AuthCtx } from '../auth/guard.ts';
import { canWrite } from '../auth/users.ts';
import { createAlbum, getAlbumView, getRootView, updateAlbum, setHidden, softDelete, restore, updatePhoto, reorderChildren, setHighlight } from '../albums.ts';
import { readMultipart } from '../multipart.ts';
import { processUpload, MAX_FILE_BYTES, MAX_REQUEST_BYTES } from '../upload.ts';
import * as path from 'node:path';

export interface ContentDeps {
    auth: AuthDeps;
    /** Where the originals live (config.albumsRoot resolved). */
    albumsRoot: string;
    /** Thumbnails generated at upload (root + sharp options), when the service knows them. */
    thumbnails?: { root: string; options: { maxWidth: number; maxHeight: number; quality: number } };
    /** Asks for a regeneration (RegenQueue.request). */
    onChange: () => void;
}

export function registerAlbumRoutes(router: Router, deps: ContentDeps): void {
    const user = (handler: (ctx: AuthCtx) => ReturnType<typeof json> | Promise<ReturnType<typeof json>>) => requireUser(deps.auth, handler);
    const audit = (ctx: AuthCtx, action: string, target: string, result: 'ok' | 'denied' | 'error', detail?: unknown) =>
        deps.auth.audit({ userId: ctx.user.id, email: ctx.user.email, ip: ctx.ip, action, target, result, detail });
    const id = (ctx: AuthCtx, name = 'id'): number => {
        const v = intParam(ctx.params[name]);
        if (v === undefined) throw new HttpError(404, 'not found');
        return v;
    };
    /** 403 (audited) unless the user may write the item; 403 before 404 so nothing leaks. */
    const guard = (ctx: AuthCtx, itemId: number, action: string) => {
        if (!canWrite(ctx.db, ctx.user.id, itemId)) {
            audit(ctx, 'authorize', `item:${itemId}`, 'denied', { action });
            throw new HttpError(403, 'forbidden');
        }
    };
    const body = (ctx: AuthCtx): Record<string, unknown> => (ctx.body && typeof ctx.body === 'object' ? ctx.body as Record<string, unknown> : {});

    router.get('/api/albums/root', user((ctx) => json(200, getRootView(ctx.db, ctx.user))));

    router.get('/api/albums/:id', user((ctx) => json(200, getAlbumView(ctx.db, id(ctx), ctx.user))));

    router.post('/api/albums', user((ctx) => {
        const b = body(ctx);
        const parentId = typeof b.parentId === 'number' ? b.parentId : NaN;
        if (!Number.isInteger(parentId)) throw new HttpError(400, 'parentId required');
        guard(ctx, parentId, 'album create');
        const item = createAlbum(ctx.db, parentId, b, ctx.user, deps.albumsRoot);
        audit(ctx, 'album create', `item:${item.id}`, 'ok', { parentId, title: item.title });
        deps.onChange();
        return json(201, item);
    }));

    router.patch('/api/albums/:id', user((ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'album update');
        const item = updateAlbum(ctx.db, albumId, body(ctx), ctx.user);
        audit(ctx, 'album update', `item:${albumId}`, 'ok', { fields: Object.keys(body(ctx)) });
        deps.onChange();
        return json(200, item);
    }));

    router.put('/api/albums/:id/hidden', user((ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'album hidden');
        const hidden = body(ctx).hidden;
        if (typeof hidden !== 'boolean') throw new HttpError(400, 'hidden must be a boolean');
        const item = setHidden(ctx.db, albumId, hidden, ctx.user);
        audit(ctx, hidden ? 'album hide' : 'album unhide', `item:${albumId}`, 'ok');
        deps.onChange();
        return json(200, item);
    }));

    router.delete('/api/albums/:id', user((ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'album delete');
        softDelete(ctx.db, albumId, ctx.user, deps.albumsRoot);
        audit(ctx, 'album delete', `item:${albumId}`, 'ok');
        deps.onChange();
        return noContent();
    }));

    router.post('/api/albums/:id/photos', user(async (ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'photo upload');
        const parts = await readMultipart(ctx.req, path.join(deps.albumsRoot, '.upload-tmp'), { maxFileBytes: MAX_FILE_BYTES, maxTotalBytes: MAX_REQUEST_BYTES, maxFiles: 500 });
        if (parts.files.length === 0) throw new HttpError(400, 'no files');
        const r = await processUpload(ctx.db, albumId, parts.files, ctx.user, { albumsRoot: deps.albumsRoot, thumbnails: deps.thumbnails, log: (l) => ctx.log({ level: 'warn', msg: l }) });
        audit(ctx, 'photo upload', `item:${albumId}`, r.created.length ? 'ok' : 'error', { created: r.created.map((c) => c.id), rejected: r.rejected });
        if (r.created.length) deps.onChange();
        return json(201, r);
    }));

    router.put('/api/albums/:id/highlight', user((ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'album highlight');
        const b = body(ctx);
        if (!('photoId' in b)) throw new HttpError(400, 'photoId required (or null)');
        const item = setHighlight(ctx.db, albumId, b.photoId, ctx.user);
        audit(ctx, 'album highlight', `item:${albumId}`, 'ok', { photoId: b.photoId });
        deps.onChange();
        return json(200, item);
    }));

    router.put('/api/albums/:id/order', user((ctx) => {
        const albumId = id(ctx);
        guard(ctx, albumId, 'album order');
        reorderChildren(ctx.db, albumId, body(ctx).ids);
        audit(ctx, 'album order', `item:${albumId}`, 'ok');
        deps.onChange();
        return json(200, { ok: true });
    }));

    router.patch('/api/photos/:id', user((ctx) => {
        const photoId = id(ctx);
        guard(ctx, photoId, 'photo update');
        const item = updatePhoto(ctx.db, photoId, body(ctx), ctx.user);
        audit(ctx, 'photo update', `item:${photoId}`, 'ok', { fields: Object.keys(body(ctx)) });
        deps.onChange();
        return json(200, item);
    }));

    router.put('/api/photos/:id/hidden', user((ctx) => {
        const photoId = id(ctx);
        guard(ctx, photoId, 'photo hidden');
        const hidden = body(ctx).hidden;
        if (typeof hidden !== 'boolean') throw new HttpError(400, 'hidden must be a boolean');
        const item = setHidden(ctx.db, photoId, hidden, ctx.user);
        audit(ctx, hidden ? 'photo hide' : 'photo unhide', `item:${photoId}`, 'ok');
        deps.onChange();
        return json(200, item);
    }));

    router.delete('/api/photos/:id', user((ctx) => {
        const photoId = id(ctx);
        guard(ctx, photoId, 'photo delete');
        softDelete(ctx.db, photoId, ctx.user, deps.albumsRoot);
        audit(ctx, 'photo delete', `item:${photoId}`, 'ok');
        deps.onChange();
        return noContent();
    }));

    router.post('/api/photos/:id/restore', requireUser(deps.auth, (ctx) => {
        const photoId = id(ctx);
        const item = restore(ctx.db, photoId, ctx.user, deps.albumsRoot);
        audit(ctx, 'photo restore', `item:${photoId}`, 'ok');
        deps.onChange();
        return json(200, item);
    }, { admin: true }));

    router.post('/api/albums/:id/restore', requireUser(deps.auth, (ctx) => {
        const albumId = id(ctx);
        const item = restore(ctx.db, albumId, ctx.user, deps.albumsRoot);
        audit(ctx, 'album restore', `item:${albumId}`, 'ok');
        deps.onChange();
        return json(200, item);
    }, { admin: true }));
}
