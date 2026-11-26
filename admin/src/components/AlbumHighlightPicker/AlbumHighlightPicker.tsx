import { useState, type ReactNode } from "react";
import { api, ApiError } from "../../api";
import type { AdminItem } from "../../types";
import { Thumb } from "../Thumb";
import "./AlbumHighlightPicker.css";

export interface AlbumHighlightPickerProps {
  /** The album whose highlight is being chosen (has no direct photos). */
  album: AdminItem;
  /** Its direct sub-albums (each may offer its own highlight image). */
  subAlbums: AdminItem[];
  /** The album came back with a new chosen highlight. */
  onChanged: (album: AdminItem) => void;
}

/**
 * Pick an album's highlight image from among its sub-albums' highlights (HILITE-01). An album with only
 * sub-albums (e.g. the root) otherwise falls back to the first descendant photo; this lets the operator
 * choose which sub-album represents it. Backed by the existing `PUT /api/albums/:id/highlight`, which
 * accepts any descendant photo (a sub-album's highlight is one); `{photoId: null}` restores the default.
 */
export function AlbumHighlightPicker(
  props: AlbumHighlightPickerProps
): ReactNode {
  const { album, subAlbums } = props;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub-albums that actually have a highlight image to offer.
  const candidates = subAlbums.filter(
    (s) => s.currentHighlightPhotoId != null && s.thumbnailUrl != null
  );
  if (candidates.length === 0) return null;

  const isDefault = album.highlightPhotoId === null;

  async function choose(photoId: number | null): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      props.onChanged(await api.setHighlight(album.id, photoId));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="album-highlight-picker">
      <h3>Album highlight</h3>
      <p className="muted">
        This album has no photos of its own. Choose which sub-album's image
        represents it, or use the first photo found.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <ul
        className="album-highlight-options"
        aria-label="Album highlight options"
      >
        <li>
          <button
            type="button"
            className={`album-highlight-default${isDefault ? " is-chosen" : ""}`}
            aria-pressed={isDefault}
            disabled={busy}
            onClick={() => void choose(null)}
          >
            Default (first photo)
          </button>
        </li>
        {candidates.map((s) => {
          const chosen = album.highlightPhotoId === s.currentHighlightPhotoId;
          return (
            <li key={s.id}>
              <button
                type="button"
                className={`album-highlight-option${chosen ? " is-chosen" : ""}`}
                aria-pressed={chosen}
                aria-label={`Use ${s.title ?? "sub-album"} as the highlight`}
                disabled={busy}
                onClick={() => void choose(s.currentHighlightPhotoId ?? null)}
              >
                <Thumb item={s} size={110} />
                <span className="album-highlight-option-title">
                  {s.title || <em>untitled</em>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
