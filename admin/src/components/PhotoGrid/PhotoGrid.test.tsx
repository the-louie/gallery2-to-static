import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PhotoGrid } from "./PhotoGrid";
import { installFetchMock, item } from "../../test/mockFetch";

const items = [
  item({ id: 2, type: "album", title: "Sub", position: 0 }),
  item({ id: 10, type: "photo", title: "One", position: 1 }),
  item({ id: 11, type: "photo", title: "Two", position: 2 }),
  item({
    id: 12,
    type: "photo",
    title: "Gone",
    position: 3,
    deletedAt: "2026-01-01T00:00:00Z",
  }),
];

function setup(over: Partial<Parameters<typeof PhotoGrid>[0]> = {}) {
  const props = {
    items,
    albumId: 1,
    highlightPhotoId: 11,
    canWrite: true,
    isAdmin: true,
    onItemChanged: vi.fn(),
    onPhotoDeleted: vi.fn(),
    onReordered: vi.fn(),
    ...over,
  };
  render(<PhotoGrid {...props} />);
  return props;
}

describe("PhotoGrid", () => {
  it("lists only photos, marks the highlight and greys deleted items", () => {
    setup();
    const cards = screen.getAllByRole("listitem");
    expect(cards.map((c) => c.getAttribute("aria-label"))).toEqual([
      "One",
      "Two",
      "Gone",
    ]);
    expect(within(cards[1]!).getByText("highlight")).toBeInTheDocument();
    expect(cards[2]).toHaveClass("is-deleted");
    expect(
      within(cards[2]!).getByRole("button", { name: "Restore Gone" })
    ).toBeInTheDocument();
    expect(
      within(cards[2]!).queryByRole("button", { name: "Delete Gone" })
    ).not.toBeInTheDocument();
  });

  it("hides actions without write access and restore for non-admins", () => {
    setup({ canWrite: false });
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("edits title and description inline with PATCH", async () => {
    const f = installFetchMock();
    const updated = { ...items[1]!, title: "Uno", description: "first" };
    f.on("PATCH /api/photos/10", { status: 200, body: updated });
    const props = setup();
    const card = screen.getByRole("listitem", { name: "One" });
    await userEvent.click(within(card).getByRole("button", { name: "Edit" }));
    await userEvent.clear(within(card).getByLabelText("Title"));
    await userEvent.type(within(card).getByLabelText("Title"), "Uno");
    await userEvent.type(within(card).getByLabelText("Description"), "first");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(f.bodyOf("PATCH /api/photos/10")).toEqual({
      title: "Uno",
      description: "first",
    });
    expect(props.onItemChanged).toHaveBeenCalledWith(updated);
  });

  it("reorders with the full child list, skipping albums", async () => {
    const f = installFetchMock();
    f.on("PUT /api/albums/1/order", { status: 200, body: { ok: true } });
    const props = setup();
    expect(screen.getByRole("button", { name: "Move One up" })).toBeDisabled();
    await userEvent.click(
      screen.getByRole("button", { name: "Move One down" })
    );
    expect(f.bodyOf("PUT /api/albums/1/order")).toEqual({
      ids: [2, 11, 10, 12],
    });
    expect(props.onReordered).toHaveBeenCalledWith([2, 11, 10, 12]);
  });

  it("sets a highlight and deletes after confirmation", async () => {
    const f = installFetchMock();
    const album = item({ id: 1, type: "album", highlightPhotoId: 10 });
    f.on("PUT /api/albums/1/highlight", { status: 200, body: album });
    f.on("DELETE /api/photos/10", { status: 204 });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const props = setup();
    await userEvent.click(
      screen.getByRole("button", { name: "Set One as highlight" })
    );
    expect(f.bodyOf("PUT /api/albums/1/highlight")).toEqual({ photoId: 10 });
    expect(props.onItemChanged).toHaveBeenCalledWith(album);

    await userEvent.click(screen.getByRole("button", { name: "Delete One" }));
    expect(f.calls()).toContain("DELETE /api/photos/10");
    expect(props.onPhotoDeleted).toHaveBeenCalledWith(10);
  });

  it("restores a deleted photo (admin)", async () => {
    const f = installFetchMock();
    const restored = { ...items[3]!, deletedAt: null };
    f.on("POST /api/photos/12/restore", { status: 200, body: restored });
    const props = setup();
    await userEvent.click(screen.getByRole("button", { name: "Restore Gone" }));
    expect(props.onItemChanged).toHaveBeenCalledWith(restored);
  });
});
