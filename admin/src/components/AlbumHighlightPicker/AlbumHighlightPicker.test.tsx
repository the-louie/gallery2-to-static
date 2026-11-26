import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlbumHighlightPicker } from "./AlbumHighlightPicker";
import { installFetchMock, item } from "../../test/mockFetch";

const album = item({ id: 7, type: "album", title: "Glitched" });
const subAlbums = [
  item({
    id: 10,
    type: "album",
    title: "Glitched 2025",
    currentHighlightPhotoId: 101,
    thumbnailUrl: "/g2data/thumbnails/a.jpg",
  }),
  item({
    id: 11,
    type: "album",
    title: "Glitched 2024",
    currentHighlightPhotoId: 201,
    thumbnailUrl: "/g2data/thumbnails/b.jpg",
  }),
  // no highlight yet → not offered
  item({
    id: 12,
    type: "album",
    title: "Empty",
    currentHighlightPhotoId: null,
  }),
];

describe("AlbumHighlightPicker", () => {
  it("offers each sub-album that has a highlight, plus a default, and marks the chosen one", () => {
    render(
      <AlbumHighlightPicker
        album={{ ...album, highlightPhotoId: 201 }}
        subAlbums={subAlbums}
        onChanged={vi.fn()}
      />
    );
    expect(
      screen.getByRole("button", { name: "Use Glitched 2025 as the highlight" })
    ).toHaveAttribute("aria-pressed", "false");
    expect(
      screen.getByRole("button", { name: "Use Glitched 2024 as the highlight" })
    ).toHaveAttribute("aria-pressed", "true"); // highlightPhotoId 201 == its highlight
    expect(
      screen.queryByRole("button", { name: /Empty/ })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Default (first photo)")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("marks default as chosen when no highlight is set", () => {
    render(
      <AlbumHighlightPicker
        album={{ ...album, highlightPhotoId: null }}
        subAlbums={subAlbums}
        onChanged={vi.fn()}
      />
    );
    expect(screen.getByText("Default (first photo)")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("sets the album highlight to the chosen sub-album's highlight photo", async () => {
    const f = installFetchMock();
    const updated = { ...album, highlightPhotoId: 101 };
    f.on("PUT /api/albums/7/highlight", { status: 200, body: updated });
    const onChanged = vi.fn();
    render(
      <AlbumHighlightPicker
        album={{ ...album, highlightPhotoId: null }}
        subAlbums={subAlbums}
        onChanged={onChanged}
      />
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Use Glitched 2025 as the highlight" })
    );
    expect(f.bodyOf("PUT /api/albums/7/highlight")).toEqual({ photoId: 101 });
    expect(onChanged).toHaveBeenCalledWith(updated);
  });

  it("restores the default with photoId null", async () => {
    const f = installFetchMock();
    f.on("PUT /api/albums/7/highlight", {
      status: 200,
      body: { ...album, highlightPhotoId: null },
    });
    render(
      <AlbumHighlightPicker
        album={{ ...album, highlightPhotoId: 101 }}
        subAlbums={subAlbums}
        onChanged={vi.fn()}
      />
    );
    await userEvent.click(screen.getByText("Default (first photo)"));
    expect(f.bodyOf("PUT /api/albums/7/highlight")).toEqual({ photoId: null });
  });

  it("renders nothing when no sub-album has a highlight", () => {
    const { container } = render(
      <AlbumHighlightPicker
        album={album}
        subAlbums={[
          item({ id: 12, type: "album", currentHighlightPhotoId: null }),
        ]}
        onChanged={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
