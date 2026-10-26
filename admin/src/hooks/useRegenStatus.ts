import { useEffect, useState } from "react";
import { api } from "../api";
import type { RegenStatus } from "../types";

const POLL_MS = 5000;
const EVENT = "lbadmin:wrote";
const PUBLISHED = "lbadmin:published";

/** Run `fn` whenever a publish run has finished (pending items may have cleared). */
export function onPublished(fn: () => void): () => void {
  window.addEventListener(PUBLISHED, fn);
  return () => window.removeEventListener(PUBLISHED, fn);
}

/**
 * Tell the regeneration indicator that something was written, so it starts
 * polling at once instead of waiting for the next idle check.
 */
export function notifyWrite(): void {
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Polls `GET /api/regen/status` every 5 s while a run is pending or running,
 * otherwise only after a write ({@link notifyWrite}) or on mount.
 */
export function useRegenStatus(): RegenStatus | null {
  const [status, setStatus] = useState<RegenStatus | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let lastFinished: string | null | undefined;

    const poll = async (): Promise<void> => {
      if (disposed) return;
      try {
        const s = await api.regenStatus();
        if (disposed) return;
        setStatus(s);
        const finished = s.lastRun?.finishedAt ?? null;
        if (lastFinished !== undefined && finished !== lastFinished)
          window.dispatchEvent(new Event(PUBLISHED));
        lastFinished = finished;
        if (s.pending || s.running || s.dirty > 0) {
          clearTimeout(timer);
          timer = setTimeout(() => void poll(), POLL_MS);
        }
      } catch {
        if (!disposed) setStatus(null);
      }
    };

    const onWrite = (): void => {
      clearTimeout(timer);
      // The queue is debounced server-side: give it a moment to become pending.
      timer = setTimeout(() => void poll(), 500);
    };

    window.addEventListener(EVENT, onWrite);
    void poll();
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener(EVENT, onWrite);
    };
  }, []);

  return status;
}
