import { useState, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import type { AdminItem } from "../../types";
import "./AlbumToolbar.css";

/**
 * Write actions on the current album: new sub-album, edit, hidden toggle,
 * soft delete, restore (admins), default highlight. Hidden when `!canWrite`.
 */
export function AlbumToolbar({
  album,
  isAdmin,
  onNewAlbum,
  onEdit,
  onAlbumChanged,
  onDeleted,
}: {
  album: AdminItem;
  isAdmin: boolean;
  onNewAlbum: () => void;
  onEdit: () => void;
  onAlbumChanged: (item: AdminItem) => void;
  onDeleted: () => void;
}): ReactNode {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!album.canWrite) return null;

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(
        e instanceof ApiError ? `${e.message} (${e.status})` : String(e)
      );
    } finally {
      setBusy(false);
    }
  }

  const deleted = album.deletedAt !== null;

  return (
    <div className="album-toolbar">
      <div className="actions">
        <button type="button" onClick={onNewAlbum} disabled={busy || deleted}>
          {album.parentId === null ? "New album" : "New sub-album"}
        </button>
        <button type="button" onClick={onEdit} disabled={busy || deleted}>
          Edit
        </button>
        <span className="field-inline album-toolbar-hidden">
          <input
            id={`hidden-${album.id}`}
            type="checkbox"
            checked={album.hidden}
            disabled={busy || deleted}
            onChange={(ev) =>
              void run(async () =>
                onAlbumChanged(
                  await api.setAlbumHidden(album.id, ev.target.checked)
                )
              )
            }
          />
          <label htmlFor={`hidden-${album.id}`}>Hidden</label>
        </span>
        {album.highlightPhotoId !== null && (
          <button
            type="button"
            disabled={busy || deleted}
            onClick={() =>
              void run(async () =>
                onAlbumChanged(await api.setHighlight(album.id, null))
              )
            }
          >
            Default highlight
          </button>
        )}
        {!deleted && (
          <button
            type="button"
            className="danger"
            disabled={busy}
            onClick={() => {
              if (
                !window.confirm(
                  `Delete "${album.title ?? "untitled"}"? It can be restored by an admin.`
                )
              )
                return;
              void run(async () => {
                await api.deleteAlbum(album.id);
                onDeleted();
              });
            }}
          >
            Delete
          </button>
        )}
        {deleted && isAdmin && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () =>
                onAlbumChanged(await api.restoreAlbum(album.id))
              )
            }
          >
            Restore
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
