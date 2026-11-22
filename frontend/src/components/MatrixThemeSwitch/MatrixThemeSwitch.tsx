import React from "react";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * Props for the MatrixThemeSwitch component
 */
export interface MatrixThemeSwitchProps {
  /** Extra class on the block wrapper (e.g. the phone top-of-page copy) */
  className?: string;
}

/**
 * The classic theme's "Theme:" selector (THEME-01 / T-10): a plain browser `<select>` with
 * "Classic" preselected; picking "Modern: Dark" or "Modern: Light" switches at once and stays on
 * the same page. Rendered in the sidebar (bottom block, matching 2006) and, on phones, a second copy
 * pinned above the content (operator, 2026-11-22); MatrixFrame.css shows one per breakpoint.
 *
 * @example
 * ```tsx
 * <MatrixThemeSwitch />
 * ```
 */
export function MatrixThemeSwitch({ className }: MatrixThemeSwitchProps) {
  const { setTheme } = useTheme();
  return (
    <div
      className={
        className
          ? `block-core-ThemeSwitch gbBlock ${className}`
          : "block-core-ThemeSwitch gbBlock"
      }
    >
      <label className="gbThemeSwitch">
        <span className="gbThemeSwitchLabel">Theme:</span>{" "}
        <select
          className="gbThemeSelect"
          aria-label="Theme"
          value="classic"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            const v = e.target.value;
            if (v === "dark" || v === "light") setTheme(v);
          }}
        >
          <option value="classic">Classic</option>
          <option value="dark">Modern: Dark</option>
          <option value="light">Modern: Light</option>
        </select>
      </label>
    </div>
  );
}
