// Tiny in-memory mock of the admin API (docs/architecture/admin-api.md,
// admin-service.md) so `npm run dev` works without the real service.
// node mock/server.mjs  → http://127.0.0.1:3101 (PORT to change).
// MOCK_SKIP_TOTP=1 skips the TOTP step; MOCK_ROLE=user plays a delegated user.
import http from "node:http";

const PORT = Number(process.env.PORT ?? 3101);
const SKIP_TOTP = process.env.MOCK_SKIP_TOTP === "1";
const ROLE = process.env.MOCK_ROLE === "user" ? "user" : "admin";

// ---------------------------------------------------------------- data
let nextId = 1000;
const now = () => new Date().toISOString();

const users = [
  {
    id: 1,
    email: "admin@example.com",
    role: "admin",
    enabled: true,
    nickname: "Admin",
    fullName: "Ada Admin",
    showFullName: false,
    totpEnrolled: !SKIP_TOTP ? false : true,
    createdAt: "2026-10-01T10:00:00Z",
    lastLoginAt: null,
    albums: [],
  },
  {
    id: 2,
    email: "delegate@example.com",
    role: "user",
    enabled: true,
    nickname: "Dee",
    fullName: null,
    showFullName: false,
    totpEnrolled: true,
    createdAt: "2026-10-02T10:00:00Z",
    lastLoginAt: "2026-10-20T18:00:00Z",
    albums: [3],
  },
];
const me = ROLE === "admin" ? users[0] : users[1];
const session = { totpOk: SKIP_TOTP, enrolled: SKIP_TOTP || ROLE === "user" };
let picture = null; // Buffer

/** @type {Map<number, object>} */
const items = new Map();
function addItem(partial) {
  const id = partial.id ?? nextId++;
  const type = partial.type ?? "photo";
  const parent = partial.parentId === null ? null : items.get(partial.parentId);
  const siblings = parent
    ? [...items.values()].filter((i) => i.parentId === parent.id).length
    : 0;
  const segment =
    partial.urlSegment ??
    (partial.title ?? `item-${id}`)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const item = {
    id,
    type,
    parentId: partial.parentId ?? null,
    position: partial.position ?? siblings,
    title: partial.title ?? null,
    description: partial.description ?? null,
    summary: partial.summary ?? null,
    urlSegment: segment,
    urlLocked: partial.urlLocked ?? false,
    path: parent
      ? `${parent.path}${segment}${type === "album" ? "/" : ""}`
      : "/",
    eventAt: partial.eventAt ?? null,
    width: type === "photo" ? (partial.width ?? 1600) : null,
    height: type === "photo" ? (partial.height ?? 1200) : null,
    owner: partial.owner ?? "Admin",
    viewCount: partial.viewCount ?? 0,
    hidden: partial.hidden ?? false,
    deletedAt: partial.deletedAt ?? null,
    pending: partial.pending ?? false,
    highlightPhotoId: null,
    thumbnailUrl:
      partial.thumbnailUrl === undefined
        ? `/g2data/thumbnails/${id}.svg`
        : partial.thumbnailUrl,
  };
  items.set(id, item);
  return item;
}

addItem({
  id: 1,
  type: "album",
  parentId: null,
  title: "lanbilder.se",
  urlSegment: "",
  urlLocked: true,
  thumbnailUrl: null,
});
addItem({
  id: 2,
  type: "album",
  parentId: 1,
  title: "Dreamhack",
  urlLocked: true,
  eventAt: 1130000000,
});
addItem({
  id: 3,
  type: "album",
  parentId: 2,
  title: "DHW05",
  summary: "Dreamhack Winter 2005",
  urlLocked: true,
  eventAt: 1133000000,
  viewCount: 1234,
});
addItem({
  id: 4,
  type: "album",
  parentId: 1,
  title: "Hidden test album",
  hidden: true,
  thumbnailUrl: null,
});
addItem({
  id: 5,
  type: "album",
  parentId: 1,
  title: "Deleted album",
  deletedAt: "2026-10-20T12:00:00Z",
});
for (let i = 1; i <= 7; i++) {
  addItem({
    type: "photo",
    parentId: 3,
    title: `IMG_000${i}`,
    description: i === 2 ? "Main hall" : null,
    eventAt: 1133000000 + i * 60,
    hidden: i === 6,
    deletedAt: i === 7 ? "2026-10-21T09:00:00Z" : null,
    thumbnailUrl: i === 5 ? null : undefined,
  });
}
addItem({ type: "photo", parentId: 2, title: "Banner" });

function childrenOf(id) {
  return [...items.values()]
    .filter((i) => i.parentId === id)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}
function ancestors(item) {
  const out = [];
  let p = item.parentId === null ? null : items.get(item.parentId);
  while (p) {
    out.unshift({ id: p.id, title: p.title ?? "" });
    p = p.parentId === null ? null : items.get(p.parentId);
  }
  return out;
}
function canWrite(item) {
  if (me.role === "admin") return true;
  let cur = item;
  while (cur) {
    if (me.albums.includes(cur.id)) return true;
    cur = cur.parentId === null ? null : items.get(cur.parentId);
  }
  return false;
}
function view(item) {
  return {
    ...item,
    childCount:
      item.type === "album"
        ? childrenOf(item.id).filter((c) => !c.hidden && !c.deletedAt).length
        : undefined,
    canWrite: canWrite(item),
  };
}

const audit = [];
let auditId = 1;
function log(action, target, result = "ok", detail = null) {
  audit.unshift({
    id: auditId++,
    at: now(),
    user_id: me.id,
    email: me.email,
    ip: "127.0.0.1",
    action,
    target,
    result,
    detail,
  });
}
log("login", null, "ok", { reason: "mock start" });

const regen = {
  pendingUntil: 0,
  runningUntil: 0,
  lastRun: { mode: "changed", finishedAt: now(), ok: true },
};
function touch() {
  regen.pendingUntil = Date.now() + 5000;
  regen.runningUntil = regen.pendingUntil + 4000;
}
function regenStatus() {
  const t = Date.now();
  if (t > regen.runningUntil && regen.runningUntil > 0) {
    regen.lastRun = {
      mode: "changed",
      finishedAt: new Date(regen.runningUntil).toISOString(),
      ok: true,
    };
    regen.runningUntil = 0;
    regen.pendingUntil = 0;
  }
  return {
    pending: t < regen.pendingUntil,
    running: t >= regen.pendingUntil && t < regen.runningUntil,
    lastRun: regen.lastRun,
    dirty: t < regen.runningUntil ? 3 : 0,
  };
}

// ---------------------------------------------------------------- http
function send(res, status, body, headers = {}) {
  const h = { "cache-control": "no-store", ...headers };
  if (body === undefined) {
    res.writeHead(status, h);
    res.end();
    return;
  }
  if (Buffer.isBuffer(body)) {
    res.writeHead(status, h);
    res.end(body);
    return;
  }
  res.writeHead(status, { ...h, "content-type": "application/json" });
  res.end(JSON.stringify(body));
}
const fail = (res, status, error, extra = {}) =>
  send(res, status, { error, ...extra });

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}
function readJson(req) {
  return readBody(req).then((b) =>
    b.length ? JSON.parse(b.toString("utf8")) : {}
  );
}

/** Minimal multipart/form-data parser: returns [{name, filename, data}]. */
function parseMultipart(buf, contentType) {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType ?? "");
  if (!m) return [];
  const boundary = Buffer.from(`--${m[1] ?? m[2]}`);
  const parts = [];
  let pos = buf.indexOf(boundary);
  while (pos !== -1) {
    pos += boundary.length;
    if (buf.slice(pos, pos + 2).toString() === "--") break;
    const headEnd = buf.indexOf("\r\n\r\n", pos);
    if (headEnd === -1) break;
    const head = buf.slice(pos, headEnd).toString("utf8");
    const next = buf.indexOf(boundary, headEnd);
    const data = buf.slice(headEnd + 4, next === -1 ? buf.length : next - 2);
    const name = /name="([^"]*)"/.exec(head)?.[1] ?? "";
    const filename = /filename="([^"]*)"/.exec(head)?.[1];
    parts.push({ name, filename, data });
    pos = next;
  }
  return parts;
}

function thumbnailSvg(id) {
  const hue = (id * 47) % 360;
  const item = items.get(id);
  const label = (item?.title ?? String(id)).slice(0, 14);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="hsl(${hue} 50% 70%)"/><text x="100" y="105" font-family="sans-serif" font-size="18" text-anchor="middle" fill="#222">${label}</text></svg>`
  );
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  const method = req.method ?? "GET";
  const route = (m, re) => method === m && re.exec(path);
  let m;

  if (path.startsWith("/g2data/thumbnails/")) {
    const id = Number(/(\d+)\.svg$/.exec(path)?.[1]);
    return send(res, 200, thumbnailSvg(id), {
      "content-type": "image/svg+xml",
    });
  }

  // --- auth ---------------------------------------------------------------
  if (method === "POST" && path === "/api/auth/logout") {
    session.totpOk = false;
    log("logout", null);
    return send(res, 204);
  }
  if (method === "POST" && path === "/api/auth/totp/setup") {
    if (session.enrolled) return fail(res, 409, "already enrolled");
    log("totp_setup", null);
    return send(res, 200, {
      secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
      otpauthUrl: `otpauth://totp/lanbilder%20admin:${encodeURIComponent(me.email)}?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=lanbilder%20admin`,
    });
  }
  if (method === "POST" && path === "/api/auth/totp/verify") {
    const { code } = await readJson(req);
    if (!/^\d{6}$/.test(String(code)) || String(code) === "000000") {
      log("totp_verify", null, "denied", { reason: "wrong code" });
      return fail(res, 401, "wrong code");
    }
    session.totpOk = true;
    session.enrolled = true;
    me.totpEnrolled = true;
    me.lastLoginAt = now();
    log("totp_verify", null);
    return send(res, 200, { ok: true });
  }
  if (!session.totpOk)
    return fail(res, 401, "totp_required", { totpSetup: !session.enrolled });

  const adminOnly = () => {
    if (me.role !== "admin") {
      log("authorize", path, "denied");
      fail(res, 403, "admin required");
      return false;
    }
    return true;
  };

  // --- me -----------------------------------------------------------------
  if (method === "GET" && path === "/api/me") {
    const { albums, ...user } = me;
    return send(res, 200, {
      user,
      role: me.role,
      albums,
      session: {
        createdAt: now(),
        expiresAt: new Date(Date.now() + 43200e3).toISOString(),
      },
    });
  }
  const profile = () => ({
    nickname: me.nickname,
    fullName: me.fullName,
    showFullName: me.showFullName,
    hasPicture: picture !== null,
    email: me.email,
    role: me.role,
  });
  if (method === "GET" && path === "/api/me/profile")
    return send(res, 200, profile());
  if (method === "PUT" && path === "/api/me/profile") {
    const b = await readJson(req);
    if (b.nickname !== undefined) {
      const taken = users.some(
        (u) =>
          u.id !== me.id &&
          u.nickname &&
          u.nickname.toLowerCase() === String(b.nickname).toLowerCase()
      );
      if (taken || String(b.nickname).toLowerCase() === "taken")
        return fail(res, 409, "nickname taken");
      me.nickname = b.nickname;
    }
    if (b.fullName !== undefined) me.fullName = b.fullName;
    if (b.showFullName !== undefined) me.showFullName = Boolean(b.showFullName);
    log("profile", `user:${me.id}`);
    return send(res, 200, profile());
  }
  if (method === "PUT" && path === "/api/me/picture") {
    const parts = parseMultipart(
      await readBody(req),
      req.headers["content-type"]
    );
    const file = parts.find((p) => p.name === "file");
    if (!file) return fail(res, 400, "file missing");
    if (file.data.length > 2 * 1024 * 1024)
      return fail(res, 413, "picture over 2 MB");
    picture = file.data;
    log("picture", `user:${me.id}`);
    return send(res, 200, profile());
  }
  if (method === "GET" && path === "/api/me/picture") {
    if (!picture) return fail(res, 404, "no picture");
    return send(res, 200, picture, { "content-type": "image/jpeg" });
  }
  if ((m = route("GET", /^\/api\/users\/(\d+)\/picture$/))) {
    if (!adminOnly()) return;
    if (Number(m[1]) === me.id && picture)
      return send(res, 200, picture, { "content-type": "image/jpeg" });
    return fail(res, 404, "no picture");
  }

  // --- regen --------------------------------------------------------------
  if (method === "GET" && path === "/api/regen/status")
    return send(res, 200, regenStatus());
  if (method === "POST" && path === "/api/regen") {
    if (!adminOnly()) return;
    touch();
    return send(res, 200, { ok: true });
  }

  // --- albums -------------------------------------------------------------
  if (method === "GET" && path === "/api/albums/root") {
    if (me.role === "admin") {
      const root = items.get(1);
      return send(res, 200, {
        album: view(root),
        breadcrumb: [],
        children: childrenOf(1).map(view),
      });
    }
    return send(res, 200, {
      album: null,
      breadcrumb: [],
      children: me.albums
        .map((id) => items.get(id))
        .filter(Boolean)
        .map(view),
    });
  }
  if ((m = route("GET", /^\/api\/albums\/(\d+)$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    return send(res, 200, {
      album: view(a),
      breadcrumb: ancestors(a),
      children: childrenOf(a.id).map(view),
    });
  }
  if (method === "POST" && path === "/api/albums") {
    const b = await readJson(req);
    const parent = items.get(Number(b.parentId));
    if (!parent || parent.type !== "album")
      return fail(res, 400, "parentId must be an album");
    if (!canWrite(parent)) return fail(res, 403, "forbidden");
    if (typeof b.title !== "string" || !b.title.trim())
      return fail(res, 400, "title required");
    const a = addItem({
      type: "album",
      parentId: parent.id,
      title: b.title.trim(),
      description: b.description ?? null,
      summary: b.summary ?? null,
      eventAt: b.eventAt ?? null,
      hidden: true,
      thumbnailUrl: null,
      owner: me.nickname,
    });
    log("album_create", `album:${a.id}`);
    touch();
    return send(res, 201, view(a));
  }
  if ((m = route("PATCH", /^\/api\/albums\/(\d+)$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    const b = await readJson(req);
    for (const k of ["title", "description", "summary", "eventAt"])
      if (b[k] !== undefined) a[k] = b[k];
    if (b.urlSegment !== undefined) {
      if (a.urlLocked && !(b.force && me.role === "admin"))
        return fail(res, 409, "url segment locked");
      a.urlSegment = b.urlSegment;
      const parent = items.get(a.parentId);
      a.path = `${parent.path}${a.urlSegment}/`;
    }
    log("album_edit", `album:${a.id}`);
    touch();
    return send(res, 200, view(a));
  }
  if ((m = route("PUT", /^\/api\/albums\/(\d+)\/hidden$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    const b = await readJson(req);
    a.hidden = Boolean(b.hidden);
    if (!a.hidden) a.urlLocked = true;
    log("album_hidden", `album:${a.id}`, "ok", { hidden: a.hidden });
    touch();
    return send(res, 200, view(a));
  }
  if ((m = route("DELETE", /^\/api\/albums\/(\d+)$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    a.deletedAt = now();
    log("album_delete", `album:${a.id}`);
    touch();
    return send(res, 204);
  }
  if ((m = route("POST", /^\/api\/albums\/(\d+)\/restore$/))) {
    if (!adminOnly()) return;
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    a.deletedAt = null;
    log("album_restore", `album:${a.id}`);
    touch();
    return send(res, 200, view(a));
  }
  if ((m = route("PUT", /^\/api\/albums\/(\d+)\/highlight$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    const b = await readJson(req);
    if (b.photoId !== null) {
      const p = items.get(Number(b.photoId));
      if (!p || p.type !== "photo")
        return fail(res, 400, "photoId must be a photo below the album");
    }
    a.highlightPhotoId = b.photoId === null ? null : Number(b.photoId);
    a.thumbnailUrl = a.highlightPhotoId
      ? items.get(a.highlightPhotoId).thumbnailUrl
      : a.thumbnailUrl;
    log("album_highlight", `album:${a.id}`, "ok", {
      photoId: a.highlightPhotoId,
    });
    touch();
    return send(res, 200, view(a));
  }
  if ((m = route("PUT", /^\/api\/albums\/(\d+)\/order$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    const b = await readJson(req);
    const kids = childrenOf(a.id)
      .map((c) => c.id)
      .sort();
    const ids = Array.isArray(b.ids) ? b.ids.map(Number) : [];
    if (JSON.stringify([...ids].sort()) !== JSON.stringify(kids))
      return fail(res, 400, "ids must be all direct children");
    ids.forEach((id, i) => (items.get(id).position = i));
    log("album_order", `album:${a.id}`);
    touch();
    return send(res, 200, { ok: true });
  }
  if ((m = route("POST", /^\/api\/albums\/(\d+)\/photos$/))) {
    const a = items.get(Number(m[1]));
    if (!a || a.type !== "album") return fail(res, 404, "not found");
    if (!canWrite(a)) return fail(res, 403, "forbidden");
    const parts = parseMultipart(
      await readBody(req),
      req.headers["content-type"]
    ).filter((p) => p.filename !== undefined);
    const created = [];
    const rejected = [];
    for (const p of parts) {
      const ok =
        /\.(jpe?g|png|gif|webp|heic)$/i.test(p.filename ?? "") &&
        p.data.length > 0;
      if (!ok) {
        rejected.push({ name: p.filename, reason: "not an image" });
        continue;
      }
      if (p.data.length > 50 * 1024 * 1024) {
        rejected.push({ name: p.filename, reason: "over 50 MB" });
        continue;
      }
      created.push(
        view(
          addItem({
            type: "photo",
            parentId: a.id,
            title: p.filename.replace(/\.[^.]+$/, ""),
            owner: me.nickname,
            thumbnailUrl: null,
          })
        )
      );
    }
    log("upload", `album:${a.id}`, "ok", {
      created: created.length,
      rejected: rejected.length,
    });
    if (created.length) touch();
    return send(res, 201, { created, rejected });
  }

  // --- photos -------------------------------------------------------------
  if ((m = route("PATCH", /^\/api\/photos\/(\d+)$/))) {
    const p = items.get(Number(m[1]));
    if (!p || p.type !== "photo") return fail(res, 404, "not found");
    if (!canWrite(p)) return fail(res, 403, "forbidden");
    const b = await readJson(req);
    for (const k of ["title", "description", "eventAt"])
      if (b[k] !== undefined) p[k] = b[k];
    log("photo_edit", `photo:${p.id}`);
    touch();
    return send(res, 200, view(p));
  }
  if ((m = route("DELETE", /^\/api\/photos\/(\d+)$/))) {
    const p = items.get(Number(m[1]));
    if (!p || p.type !== "photo") return fail(res, 404, "not found");
    if (!canWrite(p)) return fail(res, 403, "forbidden");
    p.deletedAt = now();
    log("photo_delete", `photo:${p.id}`);
    touch();
    return send(res, 204);
  }
  if ((m = route("POST", /^\/api\/photos\/(\d+)\/restore$/))) {
    if (!adminOnly()) return;
    const p = items.get(Number(m[1]));
    if (!p || p.type !== "photo") return fail(res, 404, "not found");
    p.deletedAt = null;
    log("photo_restore", `photo:${p.id}`);
    touch();
    return send(res, 200, view(p));
  }

  // --- admin: users and audit ---------------------------------------------
  if (path.startsWith("/api/admin/")) {
    if (!adminOnly()) return;
    if (method === "GET" && path === "/api/admin/users")
      return send(res, 200, { users });
    if (method === "POST" && path === "/api/admin/users") {
      const b = await readJson(req);
      const email = String(b.email ?? "")
        .trim()
        .toLowerCase();
      const role = b.role ?? "user";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return fail(res, 400, "invalid e-mail");
      if (!["admin", "user"].includes(role))
        return fail(res, 400, "role must be admin or user");
      if (users.some((u) => u.email === email))
        return fail(res, 409, "user exists");
      const u = {
        id: nextId++,
        email,
        role,
        enabled: true,
        nickname: null,
        fullName: null,
        showFullName: false,
        totpEnrolled: false,
        createdAt: now(),
        lastLoginAt: null,
        albums: [],
      };
      users.push(u);
      log("invite", `user:${u.id}`, "ok", { email, role });
      return send(res, 201, u);
    }
    if ((m = route("PUT", /^\/api\/admin\/users\/(\d+)\/enabled$/))) {
      const u = users.find((x) => x.id === Number(m[1]));
      if (!u) return fail(res, 404, "not found");
      const b = await readJson(req);
      if (u.id === me.id && !b.enabled)
        return fail(res, 400, "cannot disable your own account");
      u.enabled = Boolean(b.enabled);
      log(u.enabled ? "enable" : "disable", `user:${u.id}`);
      return send(res, 200, u);
    }
    if ((m = route("PUT", /^\/api\/admin\/users\/(\d+)\/albums\/(\d+)$/))) {
      const u = users.find((x) => x.id === Number(m[1]));
      const a = items.get(Number(m[2]));
      if (!u) return fail(res, 404, "user not found");
      if (!a || a.type !== "album") return fail(res, 400, "not an album");
      if (!u.albums.includes(a.id)) u.albums.push(a.id);
      log("delegate", `user:${u.id}`, "ok", { albumId: a.id });
      return send(res, 200, u);
    }
    if ((m = route("DELETE", /^\/api\/admin\/users\/(\d+)\/albums\/(\d+)$/))) {
      const u = users.find((x) => x.id === Number(m[1]));
      if (!u) return fail(res, 404, "user not found");
      u.albums = u.albums.filter((id) => id !== Number(m[2]));
      log("undelegate", `user:${u.id}`, "ok", { albumId: Number(m[2]) });
      return send(res, 200, u);
    }
    if ((m = route("POST", /^\/api\/admin\/users\/(\d+)\/totp\/reset$/))) {
      const u = users.find((x) => x.id === Number(m[1]));
      if (!u) return fail(res, 404, "not found");
      u.totpEnrolled = false;
      if (u.id === me.id) session.enrolled = false;
      log("totp_reset", `user:${u.id}`);
      return send(res, 200, u);
    }
    if (method === "GET" && path === "/api/admin/audit") {
      const limit = Math.min(
        1000,
        Math.max(1, Number(url.searchParams.get("limit") ?? 100))
      );
      const before = url.searchParams.get("before");
      const rows = audit
        .filter((r) => (before === null ? true : r.id < Number(before)))
        .slice(0, limit);
      return send(res, 200, {
        entries: rows,
        next: rows.length ? rows[rows.length - 1].id : null,
      });
    }
  }

  fail(res, 404, "not found");
});

// Pad the audit log so paging is visible.
for (let i = 0; i < 130; i++)
  log(
    i % 3 === 0 ? "view" : "album_edit",
    `album:${(i % 5) + 1}`,
    i % 17 === 0 ? "denied" : "ok"
  );

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `mock admin API on http://127.0.0.1:${PORT} (role ${ROLE}${SKIP_TOTP ? ", TOTP skipped" : ""})`
  );
});
