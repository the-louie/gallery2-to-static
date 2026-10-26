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
  const label = busy
    ? "Publishing… (the site updates in about a minute)"
    : failed
      ? "Publish failed"
      : at
        ? `Published ${at}`
        : "Published";
  const cls = busy ? "busy" : failed ? "failed" : "ok";
  const title = status.lastRun?.finishedAt
    ? `Changes are published 5 s after the last edit; last run (${status.lastRun.mode}) finished ${status.lastRun.finishedAt}`
    : "Changes are published 5 s after the last edit";
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
