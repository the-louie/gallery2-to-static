import { useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import type { AdminItem, AdminUser } from "../../types";
import "./DelegateBox.css";

/**
 * Admin-only: who this album is delegated to, and a picker to delegate it to
 * another user (the operator creates an album in the root, then delegates it).
 */
export function DelegateBox({ album }: { album: AdminItem }): ReactNode {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [pick, setPick] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    try {
      setUsers((await api.users()).users);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    }
  };
  useEffect(() => {
    void load();
  }, [album.id]);

  if (!users) return null;
  const delegates = users.filter((u) => (u.albums ?? []).includes(album.id));
  const candidates = users.filter(
    (u) => u.enabled && !(u.albums ?? []).includes(album.id)
  );

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="delegate-box" aria-label="Delegation">
      <span className="delegate-box-label">Delegated to:</span>
      {delegates.length === 0 ? (
        <span className="muted">nobody (admins only)</span>
      ) : (
        delegates.map((u) => (
          <span key={u.id} className="delegate-chip">
            {u.nickname ?? u.email}
            <button
              type="button"
              title={`Undelegate ${u.email}`}
              disabled={busy}
              onClick={() =>
                void run(() => api.undelegate(u.id, album.id).then(() => {}))
              }
            >
              ×
            </button>
          </span>
        ))
      )}
      {candidates.length > 0 && (
        <span className="delegate-box-add">
          <label htmlFor={`delegate-${album.id}`} className="visually-hidden">
            Delegate to
          </label>
          <select
            id={`delegate-${album.id}`}
            value={pick}
            disabled={busy}
            onChange={(ev) => setPick(ev.target.value)}
          >
            <option value="">Delegate to…</option>
            {candidates.map((u) => (
              <option key={u.id} value={String(u.id)}>
                {u.nickname ? `${u.nickname} (${u.email})` : u.email}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || pick === ""}
            onClick={() =>
              void run(() =>
                api.delegate(Number(pick), album.id).then(() => setPick(""))
              )
            }
          >
            Delegate
          </button>
        </span>
      )}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </section>
  );
}
