import { useState, type FormEvent, type ReactNode } from "react";
import {
  api,
  ApiError,
  dateInputToEventAt,
  eventAtToDateInput,
} from "../../api";
import type { AdminItem } from "../../types";
import "./AlbumForm.css";

interface NewProps {
  mode: "new";
  parentId: number;
  onSaved: (item: AdminItem) => void;
  onCancel: () => void;
}

interface EditProps {
  mode: "edit";
  album: AdminItem;
  /** Admins may force a new URL segment on a locked album (old path kept as legacy). */
  isAdmin: boolean;
  onSaved: (item: AdminItem) => void;
  onCancel: () => void;
}

export type AlbumFormProps = NewProps | EditProps;

/**
 * Create (`POST /api/albums`) or edit (`PATCH /api/albums/:id`) an album's
 * title, description, summary and event date. In edit mode the URL segment is
 * editable while `!urlLocked`; locked segments need the admin override.
 */
export function AlbumForm(props: AlbumFormProps): ReactNode {
  const album = props.mode === "edit" ? props.album : null;
  const [title, setTitle] = useState(album?.title ?? "");
  const [description, setDescription] = useState(album?.description ?? "");
  const [summary, setSummary] = useState(album?.summary ?? "");
  const [eventDate, setEventDate] = useState(
    eventAtToDateInput(album?.eventAt ?? null)
  );
  const [urlSegment, setUrlSegment] = useState(album?.urlSegment ?? "");
  const [ownerOverride, setOwnerOverride] = useState(
    album?.ownerOverride ?? ""
  );
  const [force, setForce] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = album?.urlLocked ?? false;
  const canEditSegment =
    album !== null &&
    (!locked || (props.mode === "edit" && props.isAdmin && force));

  async function submit(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    const t = title.trim();
    if (!t) {
      setError("A title is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (props.mode === "new") {
        const created = await api.createAlbum({
          parentId: props.parentId,
          title: t,
          description: description.trim() || undefined,
          summary: summary.trim() || undefined,
          eventAt: dateInputToEventAt(eventDate),
        });
        props.onSaved(created);
      } else {
        const a = props.album;
        const patch: Parameters<typeof api.patchAlbum>[1] = {};
        if (t !== (a.title ?? "")) patch.title = t;
        if (description !== (a.description ?? ""))
          patch.description = description;
        if (summary !== (a.summary ?? "")) patch.summary = summary;
        if (ownerOverride !== (a.ownerOverride ?? ""))
          patch.ownerOverride = ownerOverride;
        if (eventDate !== eventAtToDateInput(a.eventAt))
          patch.eventAt = dateInputToEventAt(eventDate);
        if (canEditSegment && urlSegment.trim() !== a.urlSegment) {
          patch.urlSegment = urlSegment.trim();
          if (locked) patch.force = true;
        }
        if (Object.keys(patch).length === 0) {
          props.onCancel();
          return;
        }
        props.onSaved(await api.patchAlbum(a.id, patch));
      }
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 409
          ? "That URL segment is locked or already in use."
          : e instanceof Error
            ? e.message
            : String(e)
      );
    } finally {
      setBusy(false);
    }
  }

  const idp = props.mode === "new" ? "new-album" : `album-${album?.id}`;

  return (
    <form
      className="album-form card"
      onSubmit={(ev) => void submit(ev)}
      aria-label={props.mode === "new" ? "New album" : "Edit album"}
    >
      <h2>{props.mode === "new" ? "New album" : "Edit album"}</h2>
      {props.mode === "new" && (
        <p className="muted">
          New albums start hidden until you untick "hidden".
        </p>
      )}
      <div className="field">
        <label htmlFor={`${idp}-title`}>Title</label>
        <input
          id={`${idp}-title`}
          type="text"
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idp}-summary`}>Summary</label>
        <input
          id={`${idp}-summary`}
          type="text"
          value={summary}
          onChange={(ev) => setSummary(ev.target.value)}
          maxLength={500}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idp}-description`}>Description</label>
        <textarea
          id={`${idp}-description`}
          value={description}
          onChange={(ev) => setDescription(ev.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor={`${idp}-date`}>Event date</label>
        <input
          id={`${idp}-date`}
          type="date"
          value={eventDate}
          onChange={(ev) => setEventDate(ev.target.value)}
        />
      </div>
      {album && (
        <div className="field">
          <label htmlFor={`${idp}-owner-override`}>Owner (override)</label>
          <input
            id={`${idp}-owner-override`}
            type="text"
            value={ownerOverride}
            onChange={(ev) => setOwnerOverride(ev.target.value)}
            maxLength={255}
            placeholder={album.owner ?? "(account owner)"}
          />
          <p className="muted">
            Shown as the owner for this album and every photo below it. Leave
            empty to use the account owner.
          </p>
        </div>
      )}
      {album && (
        <div className="field">
          <label htmlFor={`${idp}-segment`}>URL segment</label>
          <input
            id={`${idp}-segment`}
            type="text"
            value={urlSegment}
            onChange={(ev) => setUrlSegment(ev.target.value)}
            disabled={!canEditSegment}
            pattern="[a-z0-9][a-z0-9\-_.]*"
            aria-describedby={`${idp}-segment-help`}
          />
          <p id={`${idp}-segment-help`} className="muted album-form-help">
            {locked
              ? "Locked: the album has been published under this path."
              : "Editable until the album is first published."}
          </p>
          {locked && props.mode === "edit" && props.isAdmin && (
            <div className="field-inline">
              <input
                id={`${idp}-force`}
                type="checkbox"
                checked={force}
                onChange={(ev) => setForce(ev.target.checked)}
              />
              <label htmlFor={`${idp}-force`}>
                Admin override: change it anyway (old path kept as a redirect)
              </label>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="actions">
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Saving…" : props.mode === "new" ? "Create" : "Save"}
        </button>
        <button type="button" onClick={props.onCancel} disabled={busy}>
          Cancel
        </button>
      </div>
    </form>
  );
}
