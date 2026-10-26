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
  const label = busy ? "Publishing…" : failed ? "Publish failed" : "Published";
  const cls = busy ? "busy" : failed ? "failed" : "ok";
  const title = status.lastRun?.finishedAt
    ? `Last run ${status.lastRun.mode} at ${status.lastRun.finishedAt}`
    : undefined;
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
