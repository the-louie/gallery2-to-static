import { useState, type FormEvent, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import type { AdminItem } from "../../types";
import { ItemBadges } from "../ItemBadges";
import { Thumb } from "../Thumb";
import "./PhotoCard.css";

export interface PhotoCardProps {
  photo: AdminItem;
  isHighlight: boolean;
  /** the highlight by default (first photo), not chosen */
  highlightIsDefault?: boolean;
  canWrite: boolean;
  isAdmin: boolean;
  busy: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onHighlight: () => void;
  onChanged: (item: AdminItem) => void;
  onDeleted: () => void;
}

/** One photo: thumbnail, inline title/description editor and its actions. */
export function PhotoCard(props: PhotoCardProps): ReactNode {
  const { photo, canWrite, isAdmin, busy } = props;
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(photo.title ?? "");
  const [description, setDescription] = useState(photo.description ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deleted = photo.deletedAt !== null;

  function startEdit(): void {
    setTitle(photo.title ?? "");
    setDescription(photo.description ?? "");
    setError(null);
    setEditing(true);
  }

  async function save(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    const patch: { title?: string; description?: string } = {};
    if (title !== (photo.title ?? "")) patch.title = title;
    if (description !== (photo.description ?? ""))
      patch.description = description;
    if (Object.keys(patch).length === 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      props.onChanged(await api.patchPhoto(photo.id, patch));
      setEditing(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(): Promise<void> {
    if (!window.confirm(`Delete "${photo.title ?? "untitled"}"?`)) return;
    setSaving(true);
    setError(null);
    try {
      await api.deletePhoto(photo.id);
      props.onDeleted();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function toggleHidden(hidden: boolean): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      props.onChanged(await api.setPhotoHidden(photo.id, hidden));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function restore(): Promise<void> {
    setSaving(true);
    setError(null);
    try {
      props.onChanged(await api.restorePhoto(photo.id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const disabled = busy || saving;
  const name = photo.title || `#${photo.id}`;

  return (
    <li
      className={`photo-card${deleted ? " is-deleted" : ""}${props.isHighlight ? " is-highlight" : ""}${photo.pending ? " is-pending" : ""}`}
      aria-label={name}
    >
      <Thumb item={photo} size={140} />
      {editing ? (
        <form className="photo-card-edit" onSubmit={(ev) => void save(ev)}>
          <label htmlFor={`photo-${photo.id}-title`}>Title</label>
          <input
            id={`photo-${photo.id}-title`}
            type="text"
            value={title}
            onChange={(ev) => setTitle(ev.target.value)}
            maxLength={200}
          />
          <label htmlFor={`photo-${photo.id}-description`}>Description</label>
          <textarea
            id={`photo-${photo.id}-description`}
            value={description}
            onChange={(ev) => setDescription(ev.target.value)}
          />
          <div className="actions">
            <button type="submit" className="primary" disabled={disabled}>
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              disabled={disabled}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div className="photo-card-title" title={photo.title ?? ""}>
            {photo.title || <em>untitled</em>}
          </div>
          {photo.description && (
            <div className="photo-card-description muted">
              {photo.description}
            </div>
          )}
        </>
      )}
      <ItemBadges
        item={photo}
        isHighlight={props.isHighlight}
        highlightIsDefault={props.highlightIsDefault}
      />
      {error && (
        <p className="error photo-card-error" role="alert">
          {error}
        </p>
      )}
      {canWrite && !editing && (
        <div className="photo-card-actions">
          {!deleted && (
            <>
              <button type="button" onClick={startEdit} disabled={disabled}>
                Edit
              </button>
              <button
                type="button"
                onClick={() => props.onMove(-1)}
                disabled={disabled || !props.canMoveUp}
                aria-label={`Move ${name} up`}
                title="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => props.onMove(1)}
                disabled={disabled || !props.canMoveDown}
                aria-label={`Move ${name} down`}
                title="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                className={photo.hidden ? "publish" : "unpublish"}
                disabled={disabled}
                aria-label={
                  photo.hidden ? `Publish ${name}` : `Unpublish ${name}`
                }
                onClick={() => void toggleHidden(!photo.hidden)}
              >
                {photo.hidden ? "Publish" : "Unpublish"}
              </button>
              {!props.isHighlight && (
                <button
                  type="button"
                  onClick={props.onHighlight}
                  disabled={disabled}
                  aria-label={`Set ${name} as highlight`}
                >
                  Set as highlight
                </button>
              )}
              <button
                type="button"
                className="danger"
                onClick={() => void remove()}
                disabled={disabled}
                aria-label={`Delete ${name}`}
              >
                Delete
              </button>
            </>
          )}
          {deleted && isAdmin && (
            <button
              type="button"
              onClick={() => void restore()}
              disabled={disabled}
              aria-label={`Restore ${name}`}
            >
              Restore
            </button>
          )}
        </div>
      )}
    </li>
  );
}
