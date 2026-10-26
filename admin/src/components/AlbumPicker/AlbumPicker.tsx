import { useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../../api";
import type { AdminItem, AlbumView, BreadcrumbEntry } from "../../types";
import "./AlbumPicker.css";

export interface AlbumPickerProps {
  /** Called with the chosen album. */
  onPick: (album: AdminItem) => void;
  onCancel: () => void;
  /** Albums to show as already chosen (disabled). */
  excludeIds?: number[];
  /** Upper bound of album fetches while searching the tree by title. */
  searchBudget?: number;
}

interface Match {
  album: AdminItem;
  trail: string;
}

/** Albums only, visible ones first; deleted albums are left out. */
function albumChildren(view: AlbumView): AdminItem[] {
  return view.children.filter((c) => c.type === "album" && !c.deletedAt);
}

/**
 * Pick an album from the tree: browse level by level (`GET /api/albums/:id`)
 * or type two or more characters to search titles across the tree. The search
 * walks the tree breadth-first through the same routes, caching every album
 * it has seen, and stops after `searchBudget` fetches.
 */
export function AlbumPicker({
  onPick,
  onCancel,
  excludeIds = [],
  searchBudget = 150,
}: AlbumPickerProps): ReactNode {
  const [current, setCurrent] = useState<number | "root">("root");
  const [view, setView] = useState<AlbumView | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<number | "root", AlbumView>());

  async function load(id: number | "root"): Promise<AlbumView> {
    const hit = cache.current.get(id);
    if (hit) return hit;
    const v = await api.album(id);
    cache.current.set(id, v);
    return v;
  }

  useEffect(() => {
    let cancelled = false;
    setError(null);
    load(current)
      .then((v) => {
        if (!cancelled) setView(v);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [current]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setMatches(null);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const found: Match[] = [];
    const queue: Array<{ id: number | "root"; trail: string }> = [
      { id: "root", trail: "" },
    ];
    const seen = new Set<number | "root">();
    let fetches = 0;
    (async () => {
      while (queue.length > 0 && fetches < searchBudget && !cancelled) {
        const next = queue.shift();
        if (!next || seen.has(next.id)) continue;
        seen.add(next.id);
        let v: AlbumView;
        try {
          if (!cache.current.has(next.id)) fetches++;
          v = await load(next.id);
        } catch {
          continue;
        }
        for (const child of albumChildren(v)) {
          const title = child.title ?? "";
          if (title.toLowerCase().includes(q)) {
            found.push({ album: child, trail: next.trail });
          }
          queue.push({
            id: child.id,
            trail: next.trail ? `${next.trail} › ${title}` : title,
          });
        }
      }
      if (!cancelled) {
        setMatches([...found]);
        setSearching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query, searchBudget]);

  const breadcrumb: BreadcrumbEntry[] = view?.breadcrumb ?? [];
  const excluded = new Set(excludeIds);

  function row(a: AdminItem, trail?: string): ReactNode {
    const disabled = excluded.has(a.id);
    return (
      <li key={a.id} className="album-picker-row">
        <button
          type="button"
          className="album-picker-browse"
          onClick={() => {
            setQuery("");
            setCurrent(a.id);
          }}
          aria-label={`Open ${a.title ?? `#${a.id}`}`}
        >
          <span className="album-picker-title">
            {a.title || <em>untitled</em>}
          </span>
          <span className="muted album-picker-trail">
            {trail ? `${trail} · ` : ""}
            {a.path}
          </span>
        </button>
        <button
          type="button"
          className="primary"
          disabled={disabled}
          onClick={() => onPick(a)}
          aria-label={`Select ${a.title ?? `#${a.id}`}`}
        >
          {disabled ? "Delegated" : "Select"}
        </button>
      </li>
    );
  }

  return (
    <div className="album-picker card" role="dialog" aria-label="Pick an album">
      <div className="field">
        <label htmlFor="album-picker-search">Search albums by title</label>
        <input
          id="album-picker-search"
          type="search"
          value={query}
          onChange={(ev) => setQuery(ev.target.value)}
          placeholder="Type two or more characters"
        />
      </div>
      {error && <p className="error">{error}</p>}
      {matches !== null ? (
        <>
          <p className="muted" role="status">
            {searching
              ? "Searching…"
              : `${matches.length} match${matches.length === 1 ? "" : "es"}`}
          </p>
          <ul className="album-picker-list">
            {matches.map((m) => row(m.album, m.trail))}
          </ul>
        </>
      ) : (
        <>
          <nav className="album-picker-crumbs" aria-label="Picker location">
            <button type="button" onClick={() => setCurrent("root")}>
              Albums
            </button>
            {breadcrumb.map((b) => (
              <button key={b.id} type="button" onClick={() => setCurrent(b.id)}>
                › {b.title || `#${b.id}`}
              </button>
            ))}
            {view?.album && <span>› {view.album.title || "untitled"}</span>}
          </nav>
          {view?.album && (
            <p className="album-picker-current">
              <button
                type="button"
                className="primary"
                disabled={excluded.has(view.album.id)}
                onClick={() => view.album && onPick(view.album)}
              >
                Select "{view.album.title || "untitled"}"
              </button>
            </p>
          )}
          <ul className="album-picker-list">
            {view ? albumChildren(view).map((a) => row(a)) : <li>Loading…</li>}
          </ul>
        </>
      )}
      <div className="actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
