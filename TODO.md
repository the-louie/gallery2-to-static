# TODO

Backlog rebuilt 2026-10-25 from a colleague's review list, after verifying every claim
against the code at `61c80e6`. Numbering continues the existing `SEC-`/`LOGIC-`/`ARCH-`
series (see `.claude/plans/`); `BUILD-`, `PERF-` and `TEST-` are new prefixes.

**Verification summary:** 8 of 10 "must fix" items confirmed as described, 2 confirmed
with a materially different mechanism (#7, #8), 1 understated by a wide margin (#1).
The reported test failures (214/1249) could **not** be reproduced — see TEST-01.

---

## P0 — Blocks all other work

Nothing below this line can be validated until the build runs.

## P1 — Must be fixed before anything is published

## P2 — Correctness and cost

## P3 — Quality, hygiene and latent bugs

## Added 2026-10-25: second pass of the review, verified at `c750fbf`

These come from the full review (`code-review-rc1.md`, items B1–B16 and C), which was written
against the older `9790743`. Each one was re-checked against `c750fbf`; only items that are still
open are listed here. The items already fixed are at the end of "Not reproduced / no action".

### P1 additions

### P2 additions

### P3 additions

## Not reproduced / no action

- **"No XSS path and no committed secrets"** — confirmed for secrets. `backend/config.json`
  is ignored at `.gitignore:1`, has never appeared in any of the 228 commits
  (`git log --all -- backend/config.json` is empty), and no `.env`/secret/credential file is
  tracked among the 375 tracked files. Note the file does hold a plaintext password on disk,
  which is why SEC-14's `mysql2` advisory matters.
- **"214 of 1249 tests fail"** — see TEST-01. Not reproducible; please confirm the source.
- **Already fixed at `c750fbf` (from the second pass, no action):**
  - stale album response after fast back/forward: `useAlbumData` `requestIdRef` (LOGIC-01);
  - thumbnail path traversal: `validateNoTraversal` (SEC-05) and component checks (SEC-11);
  - `/album/7abc` accepted: strict `/^\d+$/` in `routeParams.ts`;
  - raw `ownerId` in the output: rows are now mapped field by field (LOGIC-05), `ownerId` is not emitted.
- **Per-album themes for paths with é/æ/ø** (was "not re-verified"): checked 2026-10-25 (Sprint 11 T-02): all 1,389 `pathIndex` keys are ASCII (titles are transliterated), so a percent-encoded `location.pathname` (BrowserRouter) cannot miss a key.

## Open for the operator (2026-10-26)

- ~~**QA3-04: Google as a second login method**~~ — **CLOSED, verified 2026-10-26:** the operator's Google OAuth client (from `google-auth.json` on the share, removed afterwards) is registered as the identity provider "Google" in Cloudflare Access and allowed on the "lanbilder admin" and "lanbilder statistics" applications next to GitHub and the one-time e-mail code; no automatic jump to GitHub. Original row kept for the record: *2026-10-26: both Access applications now offer GitHub and a one-time e-mail code (no automatic jump to GitHub); Google still* needs a Google OAuth client (Google Cloud Console → OAuth consent screen → Credentials → OAuth client ID, Web application, authorised redirect URI `https://telamon.cloudflareaccess.com/cdn-cgi/access/callback`); put the client id and secret in `/srv/share/lanbilder2/google-oauth.txt`; then Claude adds the Google identity provider in Cloudflare Access, allows it on the "lanbilder admin" and "lanbilder statistics" applications and turns off the auto-redirect to GitHub.

## BEFORE GO-LIVE (operator 2026-10-26: "lift FUT tasks to before go-alive so we are ready to add new albums")

Operator, 2026-10-25, lifted 2026-10-26: **all five rows ship before lanbilder.se switches** to the new
site (interview 2026-10-26, decision 1: "All five rows"). The notes under each row are first answers
to the questions asked; the **Decisions** blocks are the operator's rulings from the interview.

## FUTURE (after go-live, operator 2026-10-26: "we wait with this")

- **UPTIME-01: Healthchecks ping from lanbilder2** — operator ruling 2026-10-26: reuse the existing Healthchecks system (`hc.phetast.nu`); lanbilder2 itself runs a cron job that checks its services are up (nginx answers on the public vhost, `lanbilder-admin` healthz, cloudflared, the nightly timer) and pings its check URL only when all pass, so a missed ping alerts. No Cloudflare health check. Was Sprint 20 T-07; moved here on the operator's word, not scheduled.
- **AUTH-FUT-01: Discord as a login provider** — operator 2026-10-26: wanted, not now. Access has no built-in Discord provider and Discord is OAuth2, not OIDC, so the route is a Cloudflare Worker that wraps Discord OAuth as an OIDC provider (open-source `discord-oidc-worker`: 1 Worker, 1 KV namespace, a Discord application with scope `identify email`, client secret as a Worker secret), added in Access as a generic OIDC provider on the "lanbilder admin" and "lanbilder statistics" applications. Admin service unchanged (reads the e-mail claim; invite-only by e-mail applies, so the Discord account needs a verified e-mail). Est 2–3 h.
- **BOT-01: Detect and slow down bot crawling** — operator 2026-11-12: think of custom and novel ways to detect and mitigate crawlers. Real visitors have sessions, localStorage and cookies; can a CSRF-token-like mechanism block at least some bots? Trigger: Sentry LANBILDER-6 (2026-11-11) came from a crawler rotating through 43.172/43.173.x addresses with outdated Chrome user agents (old `/v/…` links, 27,702 requests since 01 Nov); the server answered every request with 200. Ideas to evaluate: a short-lived token the SPA obtains (signed cookie, or a value in localStorage) and sends with `/data/*.json` requests, with nginx/the admin service rejecting requests without it; a JS proof-of-work or a simple challenge before the data loads; per-IP-range rate limits; Cloudflare features (Bot Fight Mode, WAF rules on ASN). Constraints: the site is static (nginx + JSON), so a check must not break caching, old deep links, or search engines we want to keep. Also: filter bot noise out of Sentry and Plausible.
  - **Research 2026-11-12:** report `hosting/lanbilder2/Bot crawling mitigation options.md` on the share (sources, numbers). A plain JS-obtained token does not stop the current crawler (it runs the SPA's JavaScript); it still raises the cost for IP-rotating crawlers and stops no-JS scrapers.
  - **Operator decisions 2026-11-12:**
    1. **Do:** Cloudflare WAF custom rule (Free plan, 1 of 5) on Tencent Cloud AS132203 + AS45090, skipping verified bots (`cf.client.bot`): block `/data/*` and `/v/*`, managed challenge on the rest; watch firewall events a few days, then decide block vs challenge. Needs an API token with Zone WAF edit (the tunnel-cutover token is DNS-only) or the operator does it in the dashboard.
    2. **Rejected:** per-IP/per-ASN rate limits and outdated-Chrome flagging in nginx. Traffic is bursty and LAN parties put many real users behind one ASN or even one IP. (Logging the real client IP via `CF-Connecting-IP` is still useful for diagnosis.)
    3. **Do:** the token: short-lived HMAC token the SPA obtains and sends in a **header** (not the query string, keeps the Cloudflare cache whole) with `/data/*.json`; nginx (njs or `secure_link`) rejects requests without a valid one. Bind to an address prefix, not one IP (mobile/IPv6). Must not break old deep links (they load the SPA first) or Googlebot/Bingbot (allowlist verified crawlers).
    4. **Do:** honeypot: trap entries in the `/data/` index the SPA never shows + a hidden link; a request for them bans the IP automatically (mind LAN parties: ban short, log first).
    5. **Later:** proof-of-work gate (Anubis/go-away): revisit only if real problems appear.
    6. **Rejected:** Cloudflare Bot Fight Mode (whole-domain, no path skip, breaks JSON fetch).
    7. **Rejected:** tarpits (Nepenthes/iocaine): burn our own bandwidth.
    8. **Verified on 2026-11-12:** Cloudflare "Block AI bots" + managed robots.txt (Content-Signal `ai-train=no`). GPTBot/ClaudeBot/Bytespider/CCBot user agents get 403 "Your request was blocked." at the edge, nothing in the nginx log; a normal browser UA gets 200. Plan: Free Website.
