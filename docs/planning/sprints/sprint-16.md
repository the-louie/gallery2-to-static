# Sprint 16: admin service and authentication (FUT-02 part 1, FUT-04) — parallel track

**Status:** in progress (opened 2026-10-26; runs in parallel with Sprint 15 on branch `s16-auth`, worktree `../wt-auth`, operator: "spin up several workers that work on parallel tasks")
**Current ticket:** T-01..T-07 (worker)
**Last completed:** —

**Goal:** the `lanbilder-admin` service exists with Cloudflare Access verification, the TOTP second factor, invite-only users, delegation, an append-only audit log and the view counter; album/upload features come in Sprint 17+.

**Demo:** `node server.ts` on 127.0.0.1:3100 answers `/healthz`; a request with a valid `Cf-Access-Jwt-Assertion` for an invited email reaches `/api/me` only after TOTP; every login, denial, invite and delegation is in `audit_log`; `POST /api/view/<id>` increments `view_counts.pending`.

| # | Ticket | Backlog | Est | Status | Acceptance / Notes |
|---|---|---|---|---|---|
| T-01 | Service skeleton + regeneration queue | FUT-01 (S15 T-08) | 3h | todo | `backend/server.ts`: HTTP on 127.0.0.1:3100, `/healthz`, JSON logging, `RegenQueue` (debounce 5 s, one run at a time, injected runner); `deploy/lanbilder-admin.service`, `deploy/nginx-admin.conf` (not installed) |
| T-02 | View counter endpoint | FUT-01 (S15 T-09) | 1.5h | todo | `POST /api/view/:id` → `view_counts.pending += 1` for existing, non-hidden, non-deleted items; 204; invalid → 404; test |
| T-03 | Cloudflare Access JWT verification | FUT-02 | 3h | todo | `backend/auth/access.ts`: RS256 via `node:crypto` against the team's JWKS (cached), `aud`, `exp`, `iss`; identity = email; tests with a generated key pair |
| T-04 | TOTP second factor + sessions | FUT-02 | 3h | todo | `backend/auth/totp.ts` RFC 6238 (RFC test vectors), setup/verify routes, `__Host-` session cookie signed with HMAC, 12 h; `backend/auth/session.ts`; tests |
| T-05 | Users, invites, delegation (migration 002) | FUT-02/03 | 3h | todo | `db/migrations/002-users.sql`: `users` (email unique, role, enabled, nickname, full_name, show_full_name, totp_secret, totp_verified_at, timestamps), `user_albums`; admin routes invite / enable / delegate / un-delegate / reset TOTP; `canWrite(user, album)` walks ancestors; tests |
| T-06 | Audit log (append-only) | FUT-04 | 2h | todo | `audit_log` table (triggers forbid UPDATE/DELETE) + JSONL mirror; every login, denial, admin action and failed authorisation written; `GET /api/audit` admin only; tests |
| T-07 | Docs | – | 1h | todo | `docs/architecture/admin-service.md` (routes, auth flow, cookies, what the operator sets up in Cloudflare Access) |

## Retro / Demo notes
(filled at merge)
