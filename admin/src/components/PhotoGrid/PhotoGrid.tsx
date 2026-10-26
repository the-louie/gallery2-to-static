import type { ReactNode } from "react";
import type { AdminItem } from "../../types";
import { ItemBadges } from "../ItemBadges";
import { Thumb } from "../Thumb";
import "./PhotoGrid.css";

/** Photos of the current album as a thumbnail grid. */
export function PhotoGrid({
  photos,
  highlightPhotoId,
}: {
  photos: AdminItem[];
  highlightPhotoId: number | null;
}): ReactNode {
  if (photos.length === 0) return null;
  return (
    <ul className="photo-grid" aria-label="Photos">
      {photos.map((p) => (
        <li
          key={p.id}
          className={`photo-card${p.deletedAt ? " is-deleted" : ""}`}
        >
          <Thumb item={p} size={140} />
          <div className="photo-card-title">{p.title || <em>untitled</em>}</div>
          <ItemBadges item={p} isHighlight={p.id === highlightPhotoId} />
        </li>
      ))}
    </ul>
  );
}
