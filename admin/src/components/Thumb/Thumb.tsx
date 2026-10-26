import type { ReactNode } from "react";
import { publicImageUrl } from "../../config";
import type { AdminItem } from "../../types";
import "./Thumb.css";

/** Thumbnail of an item, or a placeholder while none is generated yet. */
export function Thumb({
  item,
  size = 96,
}: {
  item: AdminItem;
  size?: number;
}): ReactNode {
  const src = publicImageUrl(item.thumbnailUrl);
  const style = { width: size, height: size };
  if (!src) {
    return (
      <span
        className={`thumb thumb-placeholder thumb-${item.type}`}
        style={style}
        role="img"
        aria-label={
          item.type === "album" ? "Album without thumbnail" : "No thumbnail yet"
        }
      >
        {item.type === "album" ? "▣" : "◻"}
      </span>
    );
  }
  return (
    <img
      className="thumb"
      style={style}
      src={src}
      alt={item.title ?? ""}
      loading="lazy"
      width={size}
      height={size}
    />
  );
}
