/**
 * Keeps the Cloudflare Access policies in step with the admin user list (operator, 2026-10-26: "the
 * system must be open to all invited addresses"). Cloudflare sends a one-time code, and lets a
 * GitHub/Google login through, only for addresses an Access policy includes; our "Add user" is the
 * single place a person is allowed, so the policies' e-mail rules are rewritten from `users` after
 * every invite/enable/disable. Rules that are not single e-mails (a domain, a group) are kept.
 *
 * Needs, in the service's environment (/etc/lanbilder-admin.env): CF_API_TOKEN (scope: Access:
 * Apps and Policies: Edit), CF_ACCOUNT_ID, CF_ACCESS_POLICIES = "appId:policyId,appId:policyId".
 */
import type { Db } from './db/db.ts';

export interface AccessSyncConfig {
    token: string;
    accountId: string;
    policies: Array<{ appId: string; policyId: string }>;
    fetch?: typeof fetch;
}

export interface AccessSyncResult {
    emails: string[];
    updated: Array<{ appId: string; policyId: string; rules: number }>;
}

/** Parses "appId:policyId,appId:policyId". */
export function parsePolicyList(s: string | undefined): Array<{ appId: string; policyId: string }> {
    return (s ?? '').split(',').map((p) => p.trim()).filter(Boolean).map((p) => {
        const [appId, policyId] = p.split(':');
        if (!appId || !policyId) throw new Error(`CF_ACCESS_POLICIES: expected appId:policyId, got "${p}"`);
        return { appId, policyId };
    });
}

/** The enabled users' e-mails, the set the policies must allow. */
export function allowedEmails(db: Db): string[] {
    return db.all<{ email: string }>('SELECT email FROM users WHERE enabled = 1 ORDER BY email').map((r) => r.email);
}

export async function syncAccessPolicies(db: Db, cfg: AccessSyncConfig): Promise<AccessSyncResult> {
    const f = cfg.fetch ?? fetch;
    const emails = allowedEmails(db);
    const headers = { authorization: `Bearer ${cfg.token}`, 'content-type': 'application/json' };
    const base = `https://api.cloudflare.com/client/v4/accounts/${cfg.accountId}/access/apps`;
    const updated: AccessSyncResult['updated'] = [];
    for (const { appId, policyId } of cfg.policies) {
        const get = await f(`${base}/${appId}/policies/${policyId}`, { headers });
        const current = (await get.json()) as { success: boolean; result?: { name: string; decision: string; precedence?: number; include: Array<Record<string, unknown>> }; errors?: unknown };
        if (!get.ok || !current.success || !current.result) throw new Error(`Access policy ${policyId}: ${JSON.stringify(current.errors ?? get.status)}`);
        const p = current.result;
        const kept = p.include.filter((r) => !('email' in r));
        const include = [...kept, ...emails.map((email) => ({ email: { email } }))];
        const put = await f(`${base}/${appId}/policies/${policyId}`, { method: 'PUT', headers, body: JSON.stringify({ name: p.name, decision: p.decision, precedence: p.precedence ?? 1, include }) });
        const res = (await put.json()) as { success: boolean; errors?: unknown };
        if (!put.ok || !res.success) throw new Error(`Access policy ${policyId} update: ${JSON.stringify(res.errors ?? put.status)}`);
        updated.push({ appId, policyId, rules: include.length });
    }
    return { emails, updated };
}
