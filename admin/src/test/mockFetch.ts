import { vi } from "vitest";
import type { AdminItem, AlbumView, Me } from "../types";

/** One canned reply: status + JSON body (or a handler computing them). */
export type Reply =
  | { status: number; body?: unknown }
  | ((
      init: RequestInit | undefined,
      url: string
    ) => { status: number; body?: unknown });

export interface FetchMock {
  /** The `vi.fn` standing in for `fetch`. */
  fn: ReturnType<typeof vi.fn>;
  /** Register a reply for `METHOD /path` (query string included). */
  on: (route: string, reply: Reply) => void;
  /** All calls seen so far as `METHOD /path` strings. */
  calls: () => string[];
  /** JSON body of the n-th call to a route (0-based). */
  bodyOf: (route: string, n?: number) => unknown;
}

/**
 * Installs a `fetch` stub keyed by `METHOD /path`. Unregistered routes answer
 * 404 `{error: "not found"}`.
 */
export function installFetchMock(): FetchMock {
  const routes = new Map<string, Reply>();
  const seen: Array<{ key: string; init: RequestInit | undefined }> = [];
  const fn = vi.fn(
    async (input: string | URL | Request, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const method = (init?.method ?? "GET").toUpperCase();
      const key = `${method} ${url}`;
      seen.push({ key, init });
      const reply = routes.get(key);
      const r =
        reply === undefined
          ? { status: 404, body: { error: "not found" } }
          : typeof reply === "function"
            ? reply(init, url)
            : reply;
      const nullBody = r.body === undefined || r.status === 204;
      const text = nullBody ? null : JSON.stringify(r.body);
      return new Response(text, {
        status: r.status,
        headers: { "content-type": "application/json" },
      });
    }
  );
  vi.stubGlobal("fetch", fn);
  return {
    fn,
    on: (route, reply) => routes.set(route, reply),
    calls: () => seen.map((s) => s.key),
    bodyOf: (route, n = 0) => {
      const hits = seen.filter((s) => s.key === route);
      const body = hits[n]?.init?.body;
      return typeof body === "string" ? JSON.parse(body) : body;
    },
  };
}

/** An `AdminItem` with sensible defaults. */
export function item(over: Partial<AdminItem> & { id: number }): AdminItem {
  const type = over.type ?? "photo";
  return {
    type,
    parentId: 1,
    position: 0,
    title: `Item ${over.id}`,
    description: null,
    summary: null,
    photographer: null,
    urlSegment: `item-${over.id}`,
    urlLocked: false,
    path: `/root/item-${over.id}${type === "album" ? "/" : ""}`,
    eventAt: null,
    width: type === "photo" ? 800 : null,
    height: type === "photo" ? 600 : null,
    owner: null,
    ownerOverride: null,
    viewCount: 0,
    hidden: false,
    deletedAt: null,
    pending: false,
    highlightPhotoId: null,
    thumbnailUrl: null,
    canWrite: true,
    ...over,
  };
}

export function albumView(over: Partial<AlbumView> = {}): AlbumView {
  return {
    album: item({
      id: 1,
      type: "album",
      title: "Root",
      path: "/",
      parentId: null,
    }),
    breadcrumb: [],
    children: [],
    ...over,
  };
}

export function me(over: Partial<Me> = {}): Me {
  return {
    user: {
      id: 1,
      email: "admin@example.com",
      role: "admin",
      enabled: true,
      nickname: "Admin",
      fullName: null,
      showFullName: false,
      totpEnrolled: true,
      createdAt: "2026-01-01T00:00:00Z",
      lastLoginAt: null,
    },
    role: "admin",
    albums: [],
    session: {
      createdAt: "2026-01-01T00:00:00Z",
      expiresAt: "2026-01-01T12:00:00Z",
    },
    ...over,
  };
}
