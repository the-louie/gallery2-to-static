import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { BreadcrumbEntry } from "../../types";
import "./Breadcrumb.css";

/** Root → … → current album, each ancestor a link to `/albums/:id`. */
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
        <li>
          <Link to="/albums/root">Albums</Link>
        </li>
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
