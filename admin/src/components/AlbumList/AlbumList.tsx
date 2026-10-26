import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import type { AdminItem } from "../../types";
import { ItemBadges } from "../ItemBadges";
import { Thumb } from "../Thumb";
import "./AlbumList.css";

/** Child albums of the current album, one row each, linking into the tree. */
export function AlbumList({ albums }: { albums: AdminItem[] }): ReactNode {
  if (albums.length === 0) return null;
  return (
    <ul className="album-list" aria-label="Sub-albums">
      {albums.map((a) => (
        <li
          key={a.id}
          className={`album-list-item${a.deletedAt ? " is-deleted" : ""}`}
        >
          <Link to={`/albums/${a.id}`} className="album-list-link">
            <Thumb item={a} size={64} />
            <span className="album-list-text">
              <span className="album-list-title">
                {a.title || <em>untitled</em>}
              </span>
              <span className="album-list-meta muted">
                {a.path}
                {a.childCount !== undefined && ` · ${a.childCount} items`}
              </span>
            </span>
          </Link>
          <ItemBadges item={a} />
        </li>
      ))}
    </ul>
  );
}
