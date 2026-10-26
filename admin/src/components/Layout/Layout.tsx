import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useSession } from "../../session/SessionContext";
import { RegenIndicator } from "../RegenIndicator";
import "./Layout.css";

/** App frame: top bar with navigation, the signed-in user and logout. */
export function Layout(): ReactNode {
  const { me, isAdmin, logout } = useSession();
  const name = me.user.nickname ?? me.user.email;
  return (
    <div className="layout">
      <header className="layout-header">
        <nav className="layout-nav" aria-label="Main">
          <NavLink to="/albums/root" className="layout-brand">
            lanbilder admin
          </NavLink>
          <NavLink to="/albums/root">Albums</NavLink>
          {isAdmin && <NavLink to="/users">Users</NavLink>}
          {isAdmin && <NavLink to="/audit">Audit</NavLink>}
          <NavLink to="/profile">Profile</NavLink>
        </nav>
        <div className="layout-user">
          <RegenIndicator />
          <span className="layout-user-name" title={me.user.email}>
            {name}
            {isAdmin && <span className="layout-role"> admin</span>}
          </span>
          <button type="button" onClick={() => void logout()}>
            Log out
          </button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
    </div>
  );
}
