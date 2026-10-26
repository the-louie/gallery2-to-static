import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlbumPicker } from "./AlbumPicker";
import { albumView, installFetchMock, item } from "../../test/mockFetch";

function tree() {
  const f = installFetchMock();
  f.on("GET /api/albums/root", {
    status: 200,
    body: albumView({
      children: [
        item({ id: 2, type: "album", title: "Dreamhack" }),
        item({ id: 3, type: "album", title: "Birthdays" }),
        item({
          id: 4,
          type: "album",
          title: "Trashed",
          deletedAt: "2026-01-01T00:00:00Z",
        }),
        item({ id: 5, type: "photo", title: "Loose photo" }),
      ],
    }),
  });
  f.on("GET /api/albums/2", {
    status: 200,
    body: albumView({
      album: item({ id: 2, type: "album", title: "Dreamhack" }),
      breadcrumb: [{ id: 1, title: "Root" }],
      children: [item({ id: 20, type: "album", title: "DHW05" })],
    }),
  });
  f.on("GET /api/albums/3", {
    status: 200,
    body: albumView({
      album: item({ id: 3, type: "album", title: "Birthdays" }),
      children: [],
    }),
  });
  f.on("GET /api/albums/20", {
    status: 200,
    body: albumView({
      album: item({ id: 20, type: "album", title: "DHW05" }),
      children: [],
    }),
  });
  return f;
}

describe("AlbumPicker", () => {
  it("browses the tree and selects an album; excluded albums are disabled", async () => {
    tree();
    const onPick = vi.fn();
    render(<AlbumPicker onPick={onPick} onCancel={vi.fn()} excludeIds={[3]} />);
    const dialog = await screen.findByRole("dialog", { name: "Pick an album" });
    expect(await within(dialog).findByText("Dreamhack")).toBeInTheDocument();
    expect(within(dialog).queryByText("Trashed")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Loose photo")).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Select Birthdays" })
    ).toBeDisabled();

    await userEvent.click(
      within(dialog).getByRole("button", { name: "Open Dreamhack" })
    );
    expect(await within(dialog).findByText("DHW05")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: 'Select "Dreamhack"' })
    ).toBeInTheDocument();
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Select DHW05" })
    );
    expect(onPick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 20, title: "DHW05" })
    );
  });

  it("searches titles across the tree through the album routes", async () => {
    const f = tree();
    render(<AlbumPicker onPick={vi.fn()} onCancel={vi.fn()} />);
    await screen.findByText("Dreamhack");
    await userEvent.type(
      screen.getByLabelText("Search albums by title"),
      "dhw"
    );
    expect(await screen.findByText("1 match")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Select DHW05" })
    ).toBeInTheDocument();
    expect(screen.getByText(/Dreamhack ·/)).toBeInTheDocument();
    await waitFor(() => expect(f.calls()).toContain("GET /api/albums/3"));
    expect(screen.queryByText("Birthdays")).not.toBeInTheDocument();
  });
});
