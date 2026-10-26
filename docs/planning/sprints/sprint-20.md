# Sprint 20: go-live rehearsal and cutover of lanbilder.se

**Status:** in progress (opened 2026-10-26, operator: "run sprint 20")
**Current ticket:** T-02 (`in-progress` — Production builds staged)
**Last completed:** T-01 (`done` — commit `04f224e`)

**Goal:** lanbilder.se and www.lanbilder.se are served by the new site on lanbilder2 through its tunnel, with everything that must be true before and after the switch checked, written down and rehearsed, and a rollback that takes one command.

**Demo:** `cutover.py cutover lanbilder.se` succeeds (its own 15–90 s check keeps the old records otherwise); from outside, 20 URLs answer as expected on https://lanbilder.se/ (root, an album, a photo, an old Gallery 2 URL redirect, a 402 for an old image link, data and thumbnails, the view beacon, the statistics script); the admin site shows the public thumbnails from lanbilder.se; the test hostnames are gone; the old site still reachable on `lanbilder2-test.phetast.nu` for a week as the reference.

**Verified before planning:** origin and www both answer 200 today (www is a CNAME to the apex, served directly, no redirect); lanbilder2's old-site vhost holds `lanbilder.se www.lanbilder.se lanbilder2-test.phetast.nu`, the new vhost only `lanbilder-new.phetast.nu`; `cutover.py` SITES already maps lanbilder.se to the lanbilder2 tunnel with rollback; SSH keyboard-interactive is off, password login still on, one root key; 44 GB free, 2 nightly backups so far, 60,911 original files on the copy (the 2020 backup matched the copy exactly in Sprint 11, and the old site is static).

| # | Ticket | Backlog | Est | Deps | Status | Acceptance / Notes |
|---|---|---|---|---|---|---|
| T-01 | Pre-flight checks | – | 2h | – | done | read-only comparison of the origin's image tree against the copy (file count + sizes by directory via the rsync daemon used for the copy, dry run, no deletes); test-site smoke (mobilecheck 66/66, beacon, stats proxy, admin healthz); backups present; the `generation_runs` of the last 24 h ok; disk; a note of every finding in the runbook. Landed in `04f224e` |
| T-02 | Production builds staged | – | 1h | – | in-progress | frontend `dist` (Sentry environment production, site name, banner vars unchanged) and admin UI (`VITE_PUBLIC_SITE=https://lanbilder.se`) built from master and staged on lanbilder2 as `dist.go` / `admin-ui.go`, swapped at go-live |
| T-03 | nginx vhosts for the switch | – | 2h | T-01 | todo | staged copies: `lanbilder-new` gains `lanbilder.se www.lanbilder.se` (www served as today, no redirect), the old-site vhost keeps only `lanbilder2-test.phetast.nu`; `nginx -t` on the staged files; a `go.sh` on lanbilder2 that swaps the two files, reloads nginx, and a `back.sh` that restores them (both tested on the test hostnames first) |
| T-04 | Cutover runbook | – | 2h | T-02, T-03 | todo | `/srv/share/lanbilder2/cutover-runbook.txt`: the order (vhost swap → `cutover.py cutover lanbilder.se` → dist/admin swap → verification list → watch), the 20 verification URLs with expected answers, the rollback (`back.sh` + `cutover.py rollback lanbilder.se`), what stays off until a week later (test hostnames), who does what; dry-run of every command except the DNS change |
| T-05 | Go-live | – | 2h | T-04 + the operator's word | todo | run the runbook; verify from outside (this machine and a phone); watch the nginx and service logs 15 min; Plausible shows lanbilder.se page views; ESXi todo updated; the old origin left untouched (read-only) |
| T-06 | After go-live | – | 2h | T-05 | todo | after one quiet day: remove `lanbilder-new.phetast.nu` and `lanbilder2-test.phetast.nu` from the tunnel ingress and DNS (the old-site vhost may stay disabled for the record); SSH password login off on lanbilder2 (key login confirmed 2026-10-26); drop the `claude` MySQL user on the dev machine and delete the local `.my.cnf`; operator rotates the MySQL password the origin's `config.py` leaks; `cutover.py` SITES note |
| T-07 | ~~Uptime check for lanbilder.se~~ | TODO FUTURE UPTIME-01 | – | – | dropped | operator 2026-10-26: reuse the Healthchecks system, cron on lanbilder2 checks its services and pings `hc.phetast.nu`; **waits until after go-live** (TODO.md FUTURE) |
| T-08 | Retro, docs, prune | – | 1h | T-01..T-06 | todo | sprint retro; CLAUDE.md and user guide 06 say the site is live on lanbilder2; `db-runbook`/`admin-runbook` final; TODO prune |

Total ≈ 12h (plus the quiet day before T-06).

## Open points for the operator
- The go-live moment (T-05 runs on your word; it takes about ten minutes, no visible downtime: DNS moves from the origin to the tunnel with automatic rollback).
- ~~T-06: confirm that your key login to lanbilder2 works before password login is turned off.~~ confirmed 2026-10-26 (kjelle3 key, login + su to root work).

## Retro
(filled at sprint end)

## Demo notes
(filled at sprint end)
