import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BreadcrumbEntry } from "../../types";
import "./Breadcrumb.css";

/** Site root (its title) → … → current album, each ancestor a link to `/albums/:id`; no extra "Albums" root (operator, 2026-10-26). */
export function Breadcrumb({
  entries,
  current,
}: {
  entries: BreadcrumbEntry[];
  current: string | null;
}): ReactNode {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol>
        {entries.length === 0 && current === null && (
          <li aria-current="page">
            <span>Your albums</span>
          </li>
        )}
        {entries.map((e) => (
          <li key={e.id}>
            <Link to={`/albums/${e.id}`}>{e.title || `#${e.id}`}</Link>
          </li>
        ))}
        {current !== null && (
          <li aria-current="page">
            <span>{current}</span>
          </li>
        )}
      </ol>
    </nav>
  );
}
