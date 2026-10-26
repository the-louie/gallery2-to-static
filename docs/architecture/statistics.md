# Visitor statistics (Sprint 17)

**Status:** running on lanbilder2 since 2026-10-26, dashboard not yet reachable (operator steps in
`/srv/share/lanbilder2/stats-runbook.txt`). Decided by the operator: Plausible Community Edition,
self-hosted, cookieless, data stays on the VM; dashboard at `https://stats.phetast.nu`.

## What runs where

| Piece | Where | Notes |
| --- | --- | --- |
| Plausible CE `v3.2.1` | Docker on lanbilder2, container `plausible-plausible-1` | listens on `127.0.0.1:8000` only (`LISTEN_IP=127.0.0.1`, `HTTP_PORT=8000`) |
| PostgreSQL `16.9-alpine` | container `plausible-plausible_db-1` | `127.0.0.1:5432`, Plausible's own metadata (sites, users) |
| ClickHouse `24.12.6.70-alpine` | container `plausible-plausible_events_db-1` | `127.0.0.1:8123` (HTTP) and `9000`; the events |
| Compose project | `/mnt/storage/plausible/` (`compose.yml`, `.env` mode 600, `clickhouse/*.xml`) | `restart: unless-stopped`; `docker compose` from Debian 13 (`docker.io` 26.1, `docker-compose` 2.26) |
| Docker data-root | `/mnt/storage/docker` (`/etc/docker/daemon.json`) | images and container layers stay off the 16 GB OS disk |
| nginx proxy | `/etc/nginx/sites-available/lanbilder-new` (enabled) | `location = /js/259wlemz.js` and `location = /api/event` |
| nginx dashboard vhost | `/etc/nginx/sites-available/stats` (**not** enabled until DNS + tunnel exist) | `stats.phetast.nu` on `127.0.0.1:80` -> `127.0.0.1:8000` |

Everything is on the encrypted disk `/mnt/storage`. Nothing listens on a non-loopback address; the
VM's nftables input policy is drop anyway.

### Why `network_mode: host`

The VM firewall (`/etc/nftables.conf`, managed outside this project) has a `forward` chain with
policy `drop` and no exceptions. Docker enables `bridge-nf-call-iptables`, so traffic between
containers on a Docker bridge network traverses that chain and is dropped (verified: `pg_isready`
between two containers on a test network timed out). The three services therefore share the host's
network namespace and talk over loopback: Postgres runs with `listen_addresses=127.0.0.1`,
ClickHouse gets `clickhouse/listen.xml` (removes the image's `::`/`0.0.0.0` listeners), Plausible
uses `DATABASE_URL=postgres://...@127.0.0.1:5432/plausible_db` and
`CLICKHOUSE_DATABASE_URL=http://127.0.0.1:8123/plausible_events_db`. If the firewall ever gets
`iifname docker0 accept` / `oifname docker0 accept` forward rules the stack can move back to the
upstream bridge layout, but there is no need.

ClickHouse has no password (upstream default); it is reachable only from processes on the VM.

## The script and the proxy

`frontend/index.html` has, in `<head>`:

```html
<script defer data-domain="lanbilder.se" data-api="/api/event" src="/js/259wlemz.js"></script>
```

- `src=/js/259wlemz.js`: nginx proxies it to `http://127.0.0.1:8000/js/script.js` (Plausible's
  tracker, cookieless, no personal data stored) with `Host: stats.phetast.nu` and a one hour cache
  (`expires 1h`, upstream `Cache-Control`/`Expires` hidden). The random name (made with
  `tr -dc a-z0-9 </dev/urandom | head -c 8`) and the same-origin path keep filter lists
  (EasyPrivacy blocks `plausible.io` and `/js/script.js`-style names) from touching it.
- `data-api=/api/event`: the page posts events to its own origin; nginx forwards to
  `http://127.0.0.1:8000/api/event` with `X-Forwarded-For $remote_addr` (which is the visitor's IP:
  the vhost sets `real_ip_header CF-Connecting-IP` for requests from cloudflared on 127.0.0.1) and
  the visitor's `User-Agent`. Plausible needs both for its unique-visitor hash (daily salted hash
  of IP + UA, never stored raw).
- `data-domain=lanbilder.se`: the site as registered in Plausible. The test hostname
  (`lanbilder-new.phetast.nu`) reports under the same site on purpose, so the dashboard has data
  before the real hostname moves.

The script tag is asserted by `frontend/src/indexHtml.test.ts`. Changing the random name means
changing both the nginx `location` and `index.html` (and the test). The nginx vhost copies for the
operator are `/srv/share/lanbilder2/lanbilder-new.nginx.conf` and `.../stats.nginx.conf`.

## Data and backup

| Directory (under `/mnt/storage/plausible/data/`) | Content | Owner |
| --- | --- | --- |
| `postgres/` | Postgres cluster: users, sites, goals, API keys | uid 70 (image) |
| `clickhouse/` | Event data, the bulk; grows with traffic | uid 101 (image) |
| `clickhouse-logs/` | ClickHouse server log (level warning, system log tables disabled in `clickhouse/logs.xml`) | uid 101 |
| `plausible/` | `tzdata_data/` (seeded from the image once, a bind mount is not auto-populated like a named volume) and `tmp/` for CSV import/export | uid 999 |

Secrets live only in `/mnt/storage/plausible/.env` (`SECRET_KEY_BASE`, `TOTP_VAULT_KEY`,
`POSTGRES_PASSWORD`, plus `BASE_URL` and `DISABLE_REGISTRATION`). Losing `TOTP_VAULT_KEY` locks out
any account with 2FA; losing `SECRET_KEY_BASE` only invalidates sessions. Back up `.env` with the data.

Backup, consistent and simple (a few MB today):

```sh
cd /mnt/storage/plausible && docker compose stop
tar -C /mnt/storage -czf /mnt/storage/backup/plausible-$(date +%F).tar.gz plausible/.env plausible/compose.yml plausible/clickhouse plausible/data
docker compose start
```

Online alternative (no stop): `docker compose exec -T plausible_db pg_dump -U postgres plausible_db > pg.sql`
and `docker compose exec -T plausible_events_db clickhouse-client -q "BACKUP DATABASE plausible_events_db TO Disk('backups', 'events')"`
(needs a `backups` disk configured in ClickHouse; not set up). The nightly `gallery.sqlite` copy
(`docs/architecture/data-master.md`) does not include Plausible; add the tar step to that job if
the statistics are worth keeping across a disk loss.

Restore: stop the stack, unpack over `/mnt/storage/plausible`, keep the ownership from the tar,
`docker compose up -d`.

## Updating the images

1. Check the release notes: <https://github.com/plausible/community-edition/releases> (Plausible
   also says there which ClickHouse/Postgres versions it supports; ClickHouse minor jumps are
   usually fine, major jumps go step by step).
2. Edit the tags in `/mnt/storage/plausible/compose.yml`, then
   `docker compose pull && docker compose up -d`. Plausible's `command` runs `db createdb`,
   `db migrate`, `run` on every start, so schema migrations happen automatically.
3. Verify: `docker compose ps` (all `Up`, databases `healthy`),
   `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/` is `302`, and
   `curl -s -o /dev/null -w '%{http_code}' -H 'Host: lanbilder-new.phetast.nu' http://127.0.0.1/js/259wlemz.js` is `200`.
4. `docker image prune -f` removes the old layers from `/mnt/storage/docker`.

Debian's `docker.io`/`docker-compose` packages update with the normal `apt` upgrades.

## Operations cheat sheet

```sh
cd /mnt/storage/plausible
docker compose ps                      # state
docker compose logs -f plausible       # app log
docker compose up -d                   # apply .env or compose.yml changes
docker compose down                    # stop (data stays in ./data)
```

Registration: the first start leaves it open so the operator can create the first account; the
runbook then sets `DISABLE_REGISTRATION=invite_only` in `.env` and runs `docker compose up -d`.
