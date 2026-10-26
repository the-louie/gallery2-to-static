# Admin API contract (Sprint 18)

The routes the admin UI (`admin/`, a separate Vite build served on the admin hostname) talks to.
Authentication, sessions, TOTP, users and audit are in `admin-service.md`; this file adds the
album/photo/upload/profile routes of Sprint 18. All replies are JSON (`cache-control: no-store`),
errors `{error: "<message>"}`; 401 `{error:"totp_required", totpSetup: bool}` until TOTP passed;
403 for anything outside the user's delegated subtree (admins: everywhere).

## Shapes

```ts
interface AdminItem {               // one row of `items` as the UI sees it
  id: number; type: 'album' | 'photo'; parentId: number | null; position: number;
  title: string | null; description: string | null; summary: string | null;
  urlSegment: string; urlLocked: boolean;      // albums: the public path segment, locked once published
  path: string;                                // albums: public URL path ('/dreamhack/dhw05/'), photos: album path + slug
  eventAt: number | null;                      // unix seconds ("Date:")
  width: number | null; height: number | null; // photos
  owner: string | null;                        // owner display name
  viewCount: number | null;
  hidden: boolean; deletedAt: string | null;   // soft state
  highlightPhotoId: number | null;             // albums: the chosen highlight (null = first photo)
  currentHighlightPhotoId?: number | null;     // albums: the photo shown as highlight (chosen, else the first photo)
  thumbnailUrl: string | null;                 // '/g2data/thumbnails/…' on the public site (null until generated)
  childCount?: number;                         // albums: visible children
  canWrite: boolean;                           // for the calling user
}
interface AlbumView { album: AdminItem; breadcrumb: Array<{id: number; title: string}>; children: AdminItem[]; }
interface RegenStatus { pending: boolean; running: boolean; lastRun: { mode: string; finishedAt: string | null; ok: boolean } | null; dirty: number; }
interface Profile { nickname: string | null; fullName: string | null; showFullName: boolean; hasPicture: boolean; email: string; role: 'admin'|'user'; }
```

## Albums and photos

| Route | Body / params | Reply | Notes |
|---|---|---|---|
| `GET /api/albums/:id` | – | `AlbumView` | hidden and soft-deleted children included when `canWrite`; `id` = root id gives the root; children: sub-albums first (alphabetically, Swedish collation), then photos in order |
| `GET /api/albums/root` | – | `AlbumView` | the root album (admins) or a synthetic list of the user's delegated albums (`album: null`, `children` = delegated albums) |
| `POST /api/albums` | `{parentId, title, description?, summary?, eventAt?}` | `AdminItem` (201) | admin anywhere; user only under a delegated album. Starts `hidden: true`. `urlSegment` derived from the title |
| `PATCH /api/albums/:id` | any of `{title, description, summary, eventAt, urlSegment}` | `AdminItem` | `urlSegment` only while `!urlLocked` (admin override: `{urlSegment, force: true}` writes the old path into `legacy_paths`) |
| `PUT /api/albums/:id/hidden` | `{hidden: bool}` | `AdminItem` | |
| `DELETE /api/albums/:id` | – | 204 | soft delete; files to `.trash/<id>/` |
| `POST /api/albums/:id/restore` | – | `AdminItem` | admin |
| `PUT /api/albums/:id/highlight` | `{photoId}` | `AdminItem` | photo must be below the album; `{photoId: null}` = back to the first photo |
| `PUT /api/albums/:id/order` | `{ids: number[]}` | `{ok: true}` | the album's direct children in the new order (all of them) |
| `POST /api/albums/:id/photos` | multipart `files[]` (≤ 50 MB each, ≤ 500 MB) | `{created: AdminItem[], rejected: Array<{name, reason}>}` (201) | JPEG/PNG/GIF/WebP/HEIC by content; HEIC → JPEG; GPS stripped |
| `PATCH /api/photos/:id` | any of `{title, description, eventAt}` | `AdminItem` | |
| `PUT /api/photos/:id/hidden` | `{hidden: bool}` | `AdminItem` | a hidden photo is not listed publicly but may stay the album's chosen highlight |
| `DELETE /api/photos/:id` | – | 204 | soft delete; file to `.trash/<id>/` |
| `POST /api/photos/:id/restore` | – | `AdminItem` | admin |

Every write audits and asks the regeneration queue; the public site follows within about a minute.

## Regeneration

| Route | Reply |
|---|---|
| `GET /api/regen/status` | `RegenStatus` |
| `POST /api/regen` | `{ok: true}` — asks for a run now (admin) |

## Profile

| Route | Body | Reply |
|---|---|---|
| `GET /api/me/profile` | – | `Profile` |
| `PUT /api/me/profile` | `{nickname?, fullName?, showFullName?}` | `Profile` (409 nickname taken) |
| `PUT /api/me/picture` | multipart `file` (≤ 2 MB, image) | `Profile` |
| `GET /api/me/picture` | – | image/jpeg 256×256 or 404 |
| `GET /api/users/:id/picture` | – | image/jpeg (admin) |

`GET /api/me` (admin-service.md) stays the entry point: `{user, role, albums, session}`.
