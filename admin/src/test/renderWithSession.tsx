import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { SessionContext, type Session } from "../session/SessionContext";
import type { Me } from "../types";
import { me as makeMe } from "./mockFetch";

/** A SessionContext value around `me` with no-op actions. */
export function session(over: Partial<Me> = {}): Session {
  const m = makeMe(over);
  return {
    me: m,
    isAdmin: m.role === "admin",
    refresh: async () => undefined,
    logout: async () => undefined,
  };
}

/** Render inside a SessionContext (admin by default) and a MemoryRouter. */
export function renderWithSession(
  ui: ReactElement,
  opts: { session?: Session; path?: string; routePattern?: string } = {}
) {
  const s = opts.session ?? session();
  const path = opts.path ?? "/";
  const inner: ReactNode = opts.routePattern ? (
    <Routes>
      <Route path={opts.routePattern} element={ui} />
    </Routes>
  ) : (
    ui
  );
  return render(
    <SessionContext.Provider value={s}>
      <MemoryRouter initialEntries={[path]}>{inner}</MemoryRouter>
    </SessionContext.Provider>
  );
}
