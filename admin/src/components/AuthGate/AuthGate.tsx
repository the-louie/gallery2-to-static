import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "../../api";
import type { Me } from "../../types";
import { SessionContext, type Session } from "../../session/SessionContext";
import { TotpSetup } from "./TotpSetup";
import { TotpVerify } from "./TotpVerify";
import "./AuthGate.css";

type GateState =
  | { kind: "loading" }
  | { kind: "ready"; me: Me }
  | { kind: "totp"; setup: boolean }
  | { kind: "denied"; email: string | null }
  | { kind: "error"; message: string }
  | { kind: "logged-out" };

/**
 * Status gate in front of the whole app: `GET /api/me` decides whether to show
 * the TOTP enrolment, the TOTP code form, a "not invited" notice or the app
 * itself (with a {@link SessionContext}).
 */
export function AuthGate({ children }: { children: ReactNode }): ReactNode {
  const [state, setState] = useState<GateState>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const me = await api.me();
      setState({ kind: "ready", me });
    } catch (e) {
      if (e instanceof ApiError && e.totpRequired) {
        setState({ kind: "totp", setup: e.totpSetup });
      } else if (e instanceof ApiError && e.status === 403) {
        const email = typeof e.body.email === "string" ? e.body.email : null;
        setState({ kind: "denied", email });
      } else {
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setState({ kind: "logged-out" });
    }
  }, []);

  const session = useMemo<Session | null>(
    () =>
      state.kind === "ready"
        ? {
            me: state.me,
            isAdmin: state.me.role === "admin",
            refresh: load,
            logout,
          }
        : null,
    [state, load, logout]
  );

  switch (state.kind) {
    case "loading":
      return (
        <div className="auth-gate" role="status">
          Checking session…
        </div>
      );
    case "ready":
      return (
        <SessionContext.Provider value={session}>
          {children}
        </SessionContext.Provider>
      );
    case "totp":
      return (
        <div className="auth-gate">
          <div className="card auth-gate-card">
            {state.setup ? (
              <TotpSetup onVerified={load} />
            ) : (
              <TotpVerify onVerified={load} />
            )}
            <p className="auth-gate-footer">
              <button type="button" onClick={() => void logout()}>
                Log out
              </button>
            </p>
          </div>
        </div>
      );
    case "denied":
      return (
        <div className="auth-gate">
          <div className="card auth-gate-card">
            <h1>Not invited</h1>
            <p>
              {state.email ? (
                <>
                  <strong>{state.email}</strong> is not on the admin user list.
                </>
              ) : (
                "This account is not on the admin user list."
              )}{" "}
              Ask the gallery admin for an invitation.
            </p>
          </div>
        </div>
      );
    case "logged-out":
      return (
        <div className="auth-gate">
          <div className="card auth-gate-card">
            <h1>Logged out</h1>
            <p>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setState({ kind: "loading" });
                  void load();
                }}
              >
                Log in again
              </button>
            </p>
          </div>
        </div>
      );
    case "error":
      return (
        <div className="auth-gate">
          <div className="card auth-gate-card">
            <h1>Cannot reach the admin service</h1>
            <p className="error">{state.message}</p>
            <p>
              <button
                type="button"
                onClick={() => {
                  setState({ kind: "loading" });
                  void load();
                }}
              >
                Retry
              </button>
            </p>
          </div>
        </div>
      );
  }
}
