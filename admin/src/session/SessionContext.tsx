import { createContext, useContext } from "react";
import type { Me } from "../types";

/** What the signed-in user can see about themselves, plus session actions. */
export interface Session {
  me: Me;
  isAdmin: boolean;
  /** Re-fetch `/api/me` (after profile edits etc.). */
  refresh: () => Promise<void>;
  /** `POST /api/auth/logout` and return to the gate. */
  logout: () => Promise<void>;
}

export const SessionContext = createContext<Session | null>(null);

/** The current session; throws outside the AuthGate. */
export function useSession(): Session {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession outside SessionContext");
  return session;
}
