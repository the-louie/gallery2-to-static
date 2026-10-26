import type { ReactNode } from "react";
import type { AdminItem } from "../../types";
import "./ItemBadges.css";

/** Hidden / deleted / highlight / read-only markers for an item. */
export function ItemBadges({
  item,
  isHighlight = false,
  highlightIsDefault = false,
}: {
  item: AdminItem;
  isHighlight?: boolean;
  /** the highlight by default (the first photo), not chosen */
  highlightIsDefault?: boolean;
}): ReactNode {
  const badges: Array<{ key: string; label: string; cls: string }> = [];
  if (item.deletedAt)
    badges.push({ key: "del", label: "deleted", cls: "deleted" });
  if (item.hidden) badges.push({ key: "hid", label: "hidden", cls: "hidden" });
  if (isHighlight)
    badges.push({
      key: "hl",
      label: highlightIsDefault ? "highlight (default)" : "highlight",
      cls: "highlight",
    });
  if (!item.canWrite)
    badges.push({ key: "ro", label: "read-only", cls: "readonly" });
  if (badges.length === 0) return null;
  return (
    <span className="item-badges">
      {badges.map((b) => (
        <span key={b.key} className={`item-badge item-badge-${b.cls}`}>
          {b.label}
        </span>
      ))}
    </span>
  );
}
