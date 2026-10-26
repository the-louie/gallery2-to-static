import type { ReactNode } from "react";
import { useRegenStatus } from "../../hooks/useRegenStatus";
import "./RegenIndicator.css";

/**
 * "Publishing…" / "Published" badge fed by `GET /api/regen/status`. The hook
 * polls every 5 s while a run is pending or running (and after a write).
 */
export function RegenIndicator(): ReactNode {
  const status = useRegenStatus();
  if (!status) return null;
  const busy = status.pending || status.running;
  const failed = !busy && status.lastRun !== null && !status.lastRun.ok;
  const at = status.lastRun?.finishedAt
    ? new Date(status.lastRun.finishedAt).toLocaleTimeString("sv-SE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const settleMin = Math.round((status.settleMs ?? 60_000) / 60_000);
  const label = busy
    ? "Publishing…"
    : failed
      ? "Publish failed"
      : status.dirty > 0
        ? `Waiting ${status.dirty} album${status.dirty === 1 ? "" : "s"} (published ${settleMin} min after the last change)`
        : at
          ? `Published ${at}`
          : "Published";
  const cls = busy ? "busy" : failed ? "failed" : "ok";
  const title = status.lastRun?.finishedAt
    ? `Every minute, albums whose last change is older than ${settleMin} min are published; last run (${status.lastRun.mode}) finished ${status.lastRun.finishedAt}`
    : `Every minute, albums whose last change is older than ${settleMin} min are published`;
  return (
    <span
      className={`regen-indicator regen-indicator-${cls}`}
      role="status"
      title={title}
    >
      {label}
    </span>
  );
}
