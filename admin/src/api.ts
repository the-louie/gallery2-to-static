/**
 * Typed client for the admin API (docs/architecture/admin-api.md). All calls
 * are same-origin with `credentials: "include"` so the `__Host-lbadmin`
 * session cookie travels along. Non-2xx replies throw an {@link ApiError}
 * carrying the status and the server's `{error}` body.
 */
import type {
  AdminItem,
  AdminUser,
  AlbumPatch,
  AlbumView,
  AuditPage,
  Me,
  NewAlbumInput,
  PhotoPatch,
  Profile,
  ProfilePatch,
  RegenStatus,
  Role,
  TotpSetup,
  UploadResult,
} from "./types";

/** A non-2xx reply. `body` is the parsed JSON when the server sent any. */
export class ApiError extends Error {
  readonly status: number;
  readonly body: Record<string, unknown>;

  constructor(status: number, body: Record<string, unknown>) {
    const message =
      typeof body.error === "string" ? body.error : `HTTP ${status}`;
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }

  /** True for the 401 the service sends until the TOTP step passed. */
  get totpRequired(): boolean {
    return this.status === 401 && this.body.error === "totp_required";
  }

  /** `totpSetup` of a `totp_required` reply: enrol first, then verify. */
  get totpSetup(): boolean {
    return this.body.totpSetup === true;
  }
}

async function parseBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return { error: text };
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const init: RequestInit = { method, credentials: "include" };
  if (body !== undefined) {
    init.headers = { "content-type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(path, init);
  if (!res.ok) throw new ApiError(res.status, await parseBody(res));
  if (res.status === 204) return undefined as T;
  return (await parseBody(res)) as T;
}

/** Date input value (YYYY-MM-DD) for a unix-seconds timestamp, "" for null. */
export function eventAtToDateInput(eventAt: number | null): string {
  if (eventAt === null) return "";
  return new Date(eventAt * 1000).toISOString().slice(0, 10);
}

/** Unix seconds (UTC midnight) for a date input value, null for "". */
export function dateInputToEventAt(value: string): number | null {
  if (!value) return null;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

export const api = {
  // --- session -------------------------------------------------------------
  me: () => request<Me>("GET", "/api/me"),
  totpSetup: () => request<TotpSetup>("POST", "/api/auth/totp/setup"),
  totpVerify: (code: string) =>
    request<{ ok: true }>("POST", "/api/auth/totp/verify", { code }),
  logout: () => request<void>("POST", "/api/auth/logout"),

  // --- albums and photos ---------------------------------------------------
  album: (id: number | "root") =>
    request<AlbumView>("GET", `/api/albums/${id}`),
  createAlbum: (input: NewAlbumInput) =>
    request<AdminItem>("POST", "/api/albums", input),
  patchAlbum: (id: number, patch: AlbumPatch) =>
    request<AdminItem>("PATCH", `/api/albums/${id}`, patch),
  setAlbumHidden: (id: number, hidden: boolean) =>
    request<AdminItem>("PUT", `/api/albums/${id}/hidden`, { hidden }),
  deleteAlbum: (id: number) => request<void>("DELETE", `/api/albums/${id}`),
  restoreAlbum: (id: number) =>
    request<AdminItem>("POST", `/api/albums/${id}/restore`),
  setHighlight: (albumId: number, photoId: number | null) =>
    request<AdminItem>("PUT", `/api/albums/${albumId}/highlight`, { photoId }),
  setOrder: (albumId: number, ids: number[]) =>
    request<{ ok: true }>("PUT", `/api/albums/${albumId}/order`, { ids }),
  patchPhoto: (id: number, patch: PhotoPatch) =>
    request<AdminItem>("PATCH", `/api/photos/${id}`, patch),
  /** Bulk edit of several photos in one request (the multi-select action): photographer and/or owner. */
  patchPhotos: (
    ids: number[],
    fields: { photographer?: string | null; ownerOverride?: string | null }
  ) => request<AdminItem[]>("PATCH", "/api/photos", { ids, ...fields }),
  setPhotoHidden: (id: number, hidden: boolean) =>
    request<AdminItem>("PUT", `/api/photos/${id}/hidden`, { hidden }),
  deletePhoto: (id: number) => request<void>("DELETE", `/api/photos/${id}`),
  restorePhoto: (id: number) =>
    request<AdminItem>("POST", `/api/photos/${id}/restore`),

  // --- regeneration --------------------------------------------------------
  regenStatus: () => request<RegenStatus>("GET", "/api/regen/status"),
  regenNow: () => request<{ ok: true }>("POST", "/api/regen"),

  // --- profile -------------------------------------------------------------
  profile: () => request<Profile>("GET", "/api/me/profile"),
  updateProfile: (patch: ProfilePatch) =>
    request<Profile>("PUT", "/api/me/profile", patch),
  uploadPicture: async (file: File): Promise<Profile> => {
    const form = new FormData();
    form.append("file", file, file.name);
    const res = await fetch("/api/me/picture", {
      method: "PUT",
      credentials: "include",
      body: form,
    });
    if (!res.ok) throw new ApiError(res.status, await parseBody(res));
    return (await parseBody(res)) as unknown as Profile;
  },

  // --- users (admin) -------------------------------------------------------
  users: () => request<{ users: AdminUser[] }>("GET", "/api/admin/users"),
  inviteUser: (email: string, role: Role) =>
    request<AdminUser>("POST", "/api/admin/users", { email, role }),
  setUserEnabled: (id: number, enabled: boolean) =>
    request<AdminUser>("PUT", `/api/admin/users/${id}/enabled`, { enabled }),
  delegate: (userId: number, albumId: number) =>
    request<AdminUser>("PUT", `/api/admin/users/${userId}/albums/${albumId}`),
  undelegate: (userId: number, albumId: number) =>
    request<AdminUser>(
      "DELETE",
      `/api/admin/users/${userId}/albums/${albumId}`
    ),
  resetTotp: (userId: number) =>
    request<AdminUser>("POST", `/api/admin/users/${userId}/totp/reset`),
  audit: (before?: number | null, limit = 100) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before !== undefined && before !== null)
      params.set("before", String(before));
    return request<AuditPage>("GET", `/api/admin/audit?${params}`);
  },
};

export type Api = typeof api;

/** Progress callback of {@link uploadPhotos}: bytes sent and total. */
export type UploadProgress = (loaded: number, total: number) => void;

/**
 * `POST /api/albums/:id/photos` as multipart `files[]` through XMLHttpRequest,
 * which (unlike fetch) reports upload progress. Resolves with the per-file
 * result; rejects with an {@link ApiError} on a non-2xx reply or a network
 * failure (status 0).
 */
export function uploadPhotos(
  albumId: number,
  files: File[],
  onProgress?: UploadProgress
): { promise: Promise<UploadResult>; abort: () => void } {
  const xhr = new XMLHttpRequest();
  const promise = new Promise<UploadResult>((resolve, reject) => {
    const form = new FormData();
    for (const file of files) form.append("files[]", file, file.name);
    xhr.upload.addEventListener("progress", (ev) => {
      if (onProgress && ev.lengthComputable) onProgress(ev.loaded, ev.total);
    });
    xhr.addEventListener("load", () => {
      let body: Record<string, unknown> = {};
      try {
        const parsed: unknown = JSON.parse(xhr.responseText || "{}");
        if (typeof parsed === "object" && parsed !== null)
          body = parsed as Record<string, unknown>;
      } catch {
        body = { error: xhr.responseText };
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as unknown as UploadResult);
      } else {
        reject(new ApiError(xhr.status, body));
      }
    });
    xhr.addEventListener("error", () =>
      reject(new ApiError(0, { error: "network error" }))
    );
    xhr.addEventListener("abort", () =>
      reject(new ApiError(0, { error: "aborted" }))
    );
    xhr.open("POST", `/api/albums/${albumId}/photos`);
    xhr.withCredentials = true;
    xhr.send(form);
  });
  return { promise, abort: () => xhr.abort() };
}
