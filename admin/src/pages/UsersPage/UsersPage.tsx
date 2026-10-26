import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { api, ApiError } from "../../api";
import { useAlbumTitles } from "../../hooks/useAlbumTitles";
import { useSession } from "../../session/SessionContext";
import { AlbumPicker } from "../../components/AlbumPicker";
import type { AdminUser, Role } from "../../types";
import "./UsersPage.css";

function describe(e: unknown): string {
  return e instanceof ApiError ? `${e.message} (${e.status})` : String(e);
}

/**
 * Admin-only user management: list, invite, enable/disable, delegate and
 * undelegate albums (with the {@link AlbumPicker}), TOTP reset.
 */
export function UsersPage(): ReactNode {
  const { me, isAdmin } = useSession();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState<AdminUser | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");

  const allAlbumIds = Array.from(
    new Set((users ?? []).flatMap((u) => u.albums ?? []))
  );
  const titles = useAlbumTitles(allAlbumIds);

  const load = useCallback(async () => {
    try {
      const r = await api.users();
      setUsers(r.users);
      setError(null);
    } catch (e) {
      setError(describe(e));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!isAdmin) return <p className="error">Admins only.</p>;

  function replace(u: AdminUser): void {
    setUsers((list) =>
      list ? list.map((x) => (x.id === u.id ? u : x)) : list
    );
  }

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(describe(e));
    } finally {
      setBusy(false);
    }
  }

  async function invite(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    const e = email.trim();
    if (!e) return;
    await run(async () => {
      const u = await api.inviteUser(e, role);
      setUsers((list) => (list ? [...list, u] : [u]));
      setEmail("");
    });
  }

  return (
    <div className="users-page">
      <h1>Users</h1>
      <p className="muted">
        Invited e-mails must also be allowed in the Cloudflare Access policy.
      </p>

      <form
        className="users-invite card"
        onSubmit={(ev) => void invite(ev)}
        aria-label="Invite user"
      >
        <div className="field users-invite-email">
          <label htmlFor="invite-email">E-mail</label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="field">
          <label htmlFor="invite-role">Role</label>
          <select
            id="invite-role"
            value={role}
            onChange={(ev) =>
              setRole(ev.target.value === "admin" ? "admin" : "user")
            }
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" className="primary" disabled={busy}>
          Invite
        </button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {picking && (
        <AlbumPicker
          excludeIds={picking.albums ?? []}
          onCancel={() => setPicking(null)}
          onPick={(album) => {
            const target = picking;
            setPicking(null);
            void run(async () =>
              replace(await api.delegate(target.id, album.id))
            );
          }}
        />
      )}

      {users === null ? (
        <p className="muted" role="status">
          Loading…
        </p>
      ) : (
        <div className="users-table-wrap">
          <table className="users-table">
            <thead>
              <tr>
                <th>E-mail</th>
                <th>Role</th>
                <th>Status</th>
                <th>Delegated albums</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const self = u.id === me.user.id;
                return (
                  <tr key={u.id} className={u.enabled ? "" : "is-disabled"}>
                    <td>
                      <div>{u.email}</div>
                      {u.nickname && <div className="muted">{u.nickname}</div>}
                    </td>
                    <td>{u.role}</td>
                    <td>
                      {u.enabled ? "enabled" : "disabled"}
                      <div className="muted">
                        {u.totpEnrolled ? "TOTP enrolled" : "TOTP not set up"}
                      </div>
                    </td>
                    <td>
                      {u.role === "admin" ? (
                        <span className="muted">everything</span>
                      ) : (
                        <ul className="users-albums">
                          {(u.albums ?? []).map((id) => (
                            <li key={id}>
                              <span>{titles.get(id) ?? `#${id}`}</span>
                              <button
                                type="button"
                                disabled={busy}
                                aria-label={`Undelegate ${titles.get(id) ?? `#${id}`} from ${u.email}`}
                                onClick={() =>
                                  void run(async () =>
                                    replace(await api.undelegate(u.id, id))
                                  )
                                }
                              >
                                ×
                              </button>
                            </li>
                          ))}
                          <li>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setPicking(u)}
                              aria-label={`Delegate an album to ${u.email}`}
                            >
                              + Delegate
                            </button>
                          </li>
                        </ul>
                      )}
                    </td>
                    <td className="muted">{u.lastLoginAt ?? "never"}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          disabled={busy || self}
                          title={
                            self
                              ? "You cannot disable your own account"
                              : undefined
                          }
                          onClick={() =>
                            void run(async () =>
                              replace(
                                await api.setUserEnabled(u.id, !u.enabled)
                              )
                            )
                          }
                        >
                          {u.enabled ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Reset the authenticator of ${u.email}? Their sessions end and they enrol again.`
                              )
                            )
                              return;
                            void run(async () =>
                              replace(await api.resetTotp(u.id))
                            );
                          }}
                        >
                          Reset TOTP
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
