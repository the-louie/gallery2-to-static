import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "@/test-utils";
import { MatrixThemeSwitch } from "./MatrixThemeSwitch";

const mockSetTheme = vi.fn();
vi.mock("@/contexts/ThemeContext", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/contexts/ThemeContext")>()),
  useTheme: () => ({
    setTheme: mockSetTheme,
    theme: "classic",
    effectiveTheme: "classic",
    isClassic: true,
    isDark: false,
    isLight: false,
    availableThemes: [],
  }),
}));

describe("MatrixThemeSwitch", () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
  });

  it("Classic preselected; Modern: Dark / Modern: Light switch, Classic does not", async () => {
    render(<MatrixThemeSwitch />);
    const select = screen.getByRole("combobox", { name: "Theme" });
    expect(select).toHaveValue("classic");
    expect(
      Array.from(select.querySelectorAll("option")).map((o) => o.textContent)
    ).toEqual(["Classic", "Modern: Dark", "Modern: Light"]);

    await userEvent.selectOptions(select, "Modern: Dark");
    expect(mockSetTheme).toHaveBeenCalledWith("dark");
    await userEvent.selectOptions(select, "Modern: Light");
    expect(mockSetTheme).toHaveBeenCalledWith("light");
    await userEvent.selectOptions(select, "Classic");
    expect(mockSetTheme).toHaveBeenCalledTimes(2); // Classic is where we are: no switch
  });

  it("adds an extra class to the block for the phone top-of-page copy", () => {
    const { container } = render(
      <MatrixThemeSwitch className="gsThemeSwitchTop" />
    );
    const block = container.querySelector(".block-core-ThemeSwitch");
    expect(block).toHaveClass("gbBlock", "gsThemeSwitchTop");
  });
});
