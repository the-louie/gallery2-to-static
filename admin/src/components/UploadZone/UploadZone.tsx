import { useRef, useState, type DragEvent, type ReactNode } from "react";
import { ApiError, uploadPhotos } from "../../api";
import type { AdminItem, UploadResult } from "../../types";
import "./UploadZone.css";

const MAX_FILE = 50 * 1024 * 1024;
const MAX_BATCH = 500 * 1024 * 1024;

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; loaded: number; total: number; count: number }
  /** the bytes are up; the server checks, stores and thumbnails the files */
  | { kind: "processing"; count: number }
  | { kind: "done"; result: UploadResult }
  | { kind: "failed"; message: string };

/**
 * Multi-file upload to `POST /api/albums/:id/photos` (multipart `files[]`):
 * file picker plus drop zone, a progress bar from XMLHttpRequest, then the
 * per-file outcome (created / rejected). Files over the contract's limits are
 * refused before sending.
 */
export function UploadZone({
  albumId,
  onUploaded,
}: {
  albumId: number;
  /** Called once with the created photos (may be empty). */
  onUploaded: (created: AdminItem[]) => void;
}): ReactNode {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<(() => void) | null>(null);

  function start(list: FileList | File[]): void {
    const files = Array.from(list);
    if (files.length === 0) return;
    const tooBig = files.filter((f) => f.size > MAX_FILE);
    const total = files.reduce((n, f) => n + f.size, 0);
    if (tooBig.length > 0) {
      setPhase({
        kind: "failed",
        message: `Over 50 MB: ${tooBig.map((f) => f.name).join(", ")}`,
      });
      return;
    }
    if (total > MAX_BATCH) {
      setPhase({ kind: "failed", message: "The batch is over 500 MB." });
      return;
    }
    setPhase({ kind: "uploading", loaded: 0, total, count: files.length });
    const { promise, abort } = uploadPhotos(albumId, files, (loaded, t) =>
      setPhase(
        loaded >= t
          ? { kind: "processing", count: files.length }
          : { kind: "uploading", loaded, total: t, count: files.length }
      )
    );
    abortRef.current = abort;
    promise
      .then((result) => {
        setPhase({ kind: "done", result });
        onUploaded(result.created);
      })
      .catch((e: unknown) => {
        setPhase({
          kind: "failed",
          message:
            e instanceof ApiError
              ? e.status === 0
                ? e.message
                : `${e.message} (${e.status})`
              : String(e),
        });
      })
      .finally(() => {
        abortRef.current = null;
        if (inputRef.current) inputRef.current.value = "";
      });
  }

  function onDrop(ev: DragEvent<HTMLDivElement>): void {
    ev.preventDefault();
    setDragOver(false);
    if (phase.kind === "uploading" || phase.kind === "processing") return;
    start(ev.dataTransfer.files);
  }

  const uploading = phase.kind === "uploading" || phase.kind === "processing";
  const percent =
    phase.kind === "uploading" && phase.total > 0
      ? Math.round((phase.loaded / phase.total) * 100)
      : 0;

  return (
    <section className="upload-zone-wrap" aria-label="Upload photos">
      <div
        className={`upload-zone${dragOver ? " is-over" : ""}${uploading ? " is-busy" : ""}`}
        onDragOver={(ev) => {
          ev.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
      >
        <label htmlFor={`upload-${albumId}`} className="upload-zone-label">
          Drop images here or choose files
        </label>
        <input
          ref={inputRef}
          id={`upload-${albumId}`}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/gif,image/webp,image/heic,.heic"
          disabled={uploading}
          onChange={(ev) => {
            if (ev.target.files) start(ev.target.files);
          }}
        />
        <p className="muted upload-zone-hint">
          JPEG, PNG, GIF, WebP or HEIC (converted to JPEG). 50 MB per file, 500
          MB per batch. GPS tags are removed.
        </p>
      </div>

      {phase.kind === "uploading" && (
        <div className="upload-progress" role="status">
          <progress value={phase.loaded} max={phase.total || 1} />
          <span>
            Uploading {phase.count} file{phase.count === 1 ? "" : "s"}…{" "}
            {percent}%
          </span>
          <button
            type="button"
            onClick={() => abortRef.current?.()}
            className="danger"
          >
            Cancel
          </button>
        </div>
      )}

      {phase.kind === "processing" && (
        <div className="upload-progress" role="status">
          <progress />
          <span>
            Uploaded. Checking and storing {phase.count} file
            {phase.count === 1 ? "" : "s"} on the server (format check, GPS
            removed, HEIC converted, thumbnails)… large files take a while.
          </span>
        </div>
      )}
      {phase.kind === "failed" && (
        <p className="error" role="alert">
          Upload failed: {phase.message}
        </p>
      )}

      {phase.kind === "done" && (
        <div className="upload-result" role="status">
          <p>
            {`${phase.result.created.length} added${
              phase.result.rejected.length > 0
                ? `, ${phase.result.rejected.length} rejected`
                : ""
            }.`}
          </p>
          <p className="muted">
            The public site shows them after the next publish run (about a
            minute; the badge in the header says when).
          </p>
          <ul className="upload-result-list">
            {phase.result.created.map((c) => (
              <li key={`c-${c.id}`} className="upload-result-ok">
                {c.title ?? `#${c.id}`}
              </li>
            ))}
            {phase.result.rejected.map((r, i) => (
              <li key={`r-${i}`} className="upload-result-rejected">
                {r.name}: {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
