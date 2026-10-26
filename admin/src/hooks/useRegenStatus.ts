import { useEffect, useState } from "react";
import { api } from "../api";
import type { RegenStatus } from "../types";

const POLL_MS = 5000;
const EVENT = "lbadmin:wrote";

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

    const poll = async (): Promise<void> => {
      if (disposed) return;
      try {
        const s = await api.regenStatus();
        if (disposed) return;
        setStatus(s);
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
