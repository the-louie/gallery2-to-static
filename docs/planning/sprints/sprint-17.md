# Sprint 17: visitor statistics (FUT-05) — parallel track

**Status:** in progress (opened 2026-10-26; runs in parallel on branch `s17-stats`, worktree `../wt-stats`)
**Current ticket:** T-01..T-05 (worker)
**Last completed:** —

**Goal:** Plausible Community Edition runs on lanbilder2 (Docker, data on the encrypted disk), the gallery sends cookieless page views through a same-origin proxy, and the dashboard is reachable on its own hostname once the operator's DNS/tunnel entry exists.

| # | Ticket | Backlog | Est | Status | Acceptance / Notes |
|---|---|---|---|---|---|
| T-01 | Docker on lanbilder2 | FUT-05 | 1h | todo | `docker.io` + compose plugin from Debian 13; daemon data under `/mnt/storage/docker` (encrypted disk); no change to nftables beyond what Docker needs for loopback |
| T-02 | Plausible CE compose | FUT-05 | 3h | todo | `/mnt/storage/plausible/` (compose, `.env` 600, ClickHouse + Postgres volumes); listens 127.0.0.1:8000; `BASE_URL=https://stats.phetast.nu`; registration disabled after the first user; systemd-managed restart |
| T-03 | Same-origin proxy on the gallery vhost | FUT-05 | 1h | todo | `sites-available/lanbilder-new`: `/js/<random>.js` → container script, `/api/event` → container; `nginx -t`, reload; backup of the vhost; copy to the share |
| T-04 | Script tag + test | FUT-05 | 1h | todo | `frontend/index.html`: `<script defer data-domain="lanbilder.se" data-api="/api/event" src="/js/<random>.js">`; `indexHtml.test.ts`; build; no CSP header exists today, so none to change |
| T-05 | Docs + operator steps | FUT-05 | 1h | todo | `docs/architecture/statistics.md`; what the operator does: DNS CNAME + tunnel ingress for `stats.phetast.nu`, first login; runbook on the share |

## Retro / Demo notes
(filled at merge)
