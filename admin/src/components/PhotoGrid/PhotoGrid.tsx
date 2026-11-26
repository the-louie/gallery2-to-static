import { useState, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import type { AdminItem } from "../../types";
import { PhotoCard } from "./PhotoCard";
import "./PhotoGrid.css";

export interface PhotoGridProps {
  /** All direct children of the album (albums and photos) in current order. */
  items: AdminItem[];
  albumId: number;
  highlightPhotoId: number | null;
  /** the photo currently shown as the highlight (chosen or default) */
  currentHighlightPhotoId?: number | null;
  canWrite: boolean;
  isAdmin: boolean;
  /** A photo or the album came back changed from the server. */
  onItemChanged: (item: AdminItem) => void;
  /** A photo was soft-deleted (204, no body). */
  onPhotoDeleted: (id: number) => void;
  /** `PUT …/order` succeeded with this full child order. */
  onReordered: (ids: number[]) => void;
}

/**
 * Photos of the album as a grid of {@link PhotoCard}s with inline editing,
 * up/down reordering (sends the full child id list), highlight selection and
 * delete/restore. Read-only when `!canWrite`.
 */
export function PhotoGrid(props: PhotoGridProps): ReactNode {
  const { items, albumId, highlightPhotoId, canWrite, isAdmin } = props;
  const effectiveHighlight = props.currentHighlightPhotoId ?? highlightPhotoId;
  const photos = items.filter((c) => c.type === "photo");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkPhotographer, setBulkPhotographer] = useState("");
  const [bulkOwner, setBulkOwner] = useState("");

  if (photos.length === 0) return null;

  // Only photos the user may write can be selected for the bulk edit.
  const writablePhotoIds = new Set(
    photos.filter((p) => canWrite && p.canWrite).map((p) => p.id)
  );
  const selectedCount = [...selected].filter((id) =>
    writablePhotoIds.has(id)
  ).length;

  function toggleSelect(id: number): void {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function applyBulk(
    field: "photographer" | "ownerOverride"
  ): Promise<void> {
    const ids = [...selected].filter((id) => writablePhotoIds.has(id));
    if (ids.length === 0) return;
    const raw = field === "photographer" ? bulkPhotographer : bulkOwner;
    const value = raw.trim() === "" ? null : raw.trim();
    setBusy(true);
    setError(null);
    try {
      const updated = await api.patchPhotos(ids, { [field]: value });
      for (const item of updated) props.onItemChanged(item);
      setSelected(new Set());
      setBulkPhotographer("");
      setBulkOwner("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function move(photoId: number, dir: -1 | 1): Promise<void> {
    const ids = items.map((c) => c.id);
    const from = ids.indexOf(photoId);
    // Swap with the neighbouring photo (skipping albums) in the full list.
    let to = from + dir;
    while (to >= 0 && to < ids.length && items[to]?.type !== "photo") to += dir;
    if (from === -1 || to < 0 || to >= ids.length) return;
    const a = ids[from];
    const b = ids[to];
    if (a === undefined || b === undefined) return;
    ids[from] = b;
    ids[to] = a;
    setBusy(true);
    setError(null);
    try {
      await api.setOrder(albumId, ids);
      props.onReordered(ids);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function highlight(photoId: number): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      props.onItemChanged(await api.setHighlight(albumId, photoId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="photo-grid-wrap">
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {selectedCount > 0 && (
        <div className="photo-bulk-bar" role="group" aria-label="Bulk edit">
          <span className="photo-bulk-count">{selectedCount} selected</span>
          <label htmlFor="bulk-photographer">Fotograf</label>
          <input
            id="bulk-photographer"
            type="text"
            value={bulkPhotographer}
            onChange={(ev) => setBulkPhotographer(ev.target.value)}
            maxLength={255}
            placeholder="(empty clears)"
            disabled={busy}
          />
          <button
            type="button"
            className="primary"
            onClick={() => void applyBulk("photographer")}
            disabled={busy}
          >
            Set photographer on {selectedCount}
          </button>
          <label htmlFor="bulk-owner">Owner</label>
          <input
            id="bulk-owner"
            type="text"
            value={bulkOwner}
            onChange={(ev) => setBulkOwner(ev.target.value)}
            maxLength={255}
            placeholder="(empty clears)"
            disabled={busy}
          />
          <button
            type="button"
            className="primary"
            onClick={() => void applyBulk("ownerOverride")}
            disabled={busy}
          >
            Set owner on {selectedCount}
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            disabled={busy}
          >
            Clear selection
          </button>
        </div>
      )}
      <ul className="photo-grid" aria-label="Photos">
        {photos.map((p, i) => (
          <PhotoCard
            key={p.id}
            photo={p}
            isHighlight={p.id === effectiveHighlight}
            highlightIsDefault={
              p.id === effectiveHighlight && highlightPhotoId === null
            }
            canWrite={canWrite && p.canWrite}
            isAdmin={isAdmin}
            busy={busy}
            canMoveUp={i > 0}
            canMoveDown={i < photos.length - 1}
            onMove={(dir) => void move(p.id, dir)}
            onHighlight={() => void highlight(p.id)}
            onChanged={props.onItemChanged}
            onDeleted={() => props.onPhotoDeleted(p.id)}
            selected={selected.has(p.id)}
            onToggleSelect={
              canWrite && p.canWrite ? () => toggleSelect(p.id) : undefined
            }
          />
        ))}
      </ul>
    </div>
  );
}
