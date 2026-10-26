import { useCallback, useEffect, useState, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import { useSession } from "../../session/SessionContext";
import type { AuditEntry } from "../../types";
import "./AuditPage.css";

const PAGE = 100;

/** Admin-only audit trail (`GET /api/admin/audit`), newest first, "Older" paging. */
export function AuditPage(): ReactNode {
  const { isAdmin } = useSession();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (before: number | null) => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.audit(before, PAGE);
      setEntries((list) =>
        before === null ? page.entries : [...list, ...page.entries]
      );
      setNext(page.next);
      if (page.entries.length < PAGE || page.next === null) setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? `${e.message} (${e.status})` : String(e)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) void loadPage(null);
  }, [isAdmin, loadPage]);

  if (!isAdmin) return <p className="error">Admins only.</p>;

  return (
    <div className="audit-page">
      <h1>Audit log</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="audit-table-wrap">
        <table className="audit-table">
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Target</th>
              <th>Result</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className={`audit-${e.result}`}>
                <td className="audit-when">{e.at}</td>
                <td>
                  {e.email ?? <span className="muted">–</span>}
                  {e.ip && <div className="muted audit-ip">{e.ip}</div>}
                </td>
                <td>{e.action}</td>
                <td>{e.target ?? ""}</td>
                <td>{e.result}</td>
                <td className="audit-detail">
                  {e.detail === null || e.detail === undefined
                    ? ""
                    : JSON.stringify(e.detail)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="audit-footer">
        {entries.length === 0 && !loading && (
          <span className="muted">No entries.</span>
        )}
        {!done && (
          <button
            type="button"
            disabled={loading}
            onClick={() => void loadPage(next)}
          >
            {loading ? "Loading…" : "Older"}
          </button>
        )}
        {done && entries.length > 0 && (
          <span className="muted">End of log.</span>
        )}
      </p>
    </div>
  );
}
