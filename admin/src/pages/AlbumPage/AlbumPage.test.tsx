import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AlbumPage, parseAlbumParam } from "./AlbumPage";
import { albumView, installFetchMock, item } from "../../test/mockFetch";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/albums/:id" element={<AlbumPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("parseAlbumParam", () => {
  it("accepts root, integers; rejects garbage", () => {
    expect(parseAlbumParam(undefined)).toBe("root");
    expect(parseAlbumParam("root")).toBe("root");
    expect(parseAlbumParam("42")).toBe(42);
    expect(parseAlbumParam("abc")).toBeNull();
  });
});

describe("AlbumPage", () => {
  it("loads the root, lists albums before photos, shows badges and placeholders", async () => {
    const f = installFetchMock();
    f.on("GET /api/albums/root", {
      status: 200,
      body: albumView({
        children: [
          item({ id: 10, type: "photo", title: "A photo", position: 0 }),
          item({
            id: 20,
            type: "album",
            title: "Hidden album",
            hidden: true,
            childCount: 3,
            position: 1,
          }),
          item({
            id: 21,
            type: "album",
            title: "Gone album",
            deletedAt: "2026-01-01T00:00:00Z",
            position: 2,
          }),
        ],
      }),
    });
    renderAt("/albums/root");
    expect(
      await screen.findByRole("heading", { name: /Root/ })
    ).toBeInTheDocument();

    const albums = screen.getByRole("list", { name: "Sub-albums" });
    const rows = within(albums).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(within(rows[0]!).getByText("Hidden album")).toBeInTheDocument();
    expect(within(rows[0]!).getByText("hidden")).toBeInTheDocument();
    expect(within(rows[0]!).getByText(/3 items/)).toBeInTheDocument();
    expect(within(rows[1]!).getByText("deleted")).toBeInTheDocument();
    expect(within(rows[0]!).getByRole("link")).toHaveAttribute(
      "href",
      "/albums/20"
    );

    const photos = screen.getByRole("list", { name: "Photos" });
    expect(within(photos).getByText("A photo")).toBeInTheDocument();
    expect(
      within(photos).getByRole("img", { name: "No thumbnail yet" })
    ).toBeInTheDocument();
    // Albums section comes before photos in the DOM.
    expect(
      albums.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("shows breadcrumb links and thumbnails, navigates into a sub-album", async () => {
    const f = installFetchMock();
    f.on("GET /api/albums/5", {
      status: 200,
      body: albumView({
        album: item({
          id: 5,
          type: "album",
          title: "DHW05",
          path: "/dreamhack/dhw05/",
          thumbnailUrl: "/g2data/thumbnails/5.jpg",
        }),
        breadcrumb: [
          { id: 1, title: "Root" },
          { id: 2, title: "Dreamhack" },
        ],
        children: [
          item({ id: 6, type: "album", title: "Day 1" }),
          item({
            id: 7,
            type: "photo",
            title: "IMG_1",
            thumbnailUrl: "/g2data/thumbnails/7.jpg",
          }),
        ],
      }),
    });
    f.on("GET /api/albums/6", {
      status: 200,
      body: albumView({
        album: item({ id: 6, type: "album", title: "Day 1" }),
        breadcrumb: [{ id: 5, title: "DHW05" }],
        children: [],
      }),
    });
    renderAt("/albums/5");
    expect(
      await screen.findByRole("heading", { name: /DHW05/ })
    ).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(crumbs).getByRole("link", { name: "Dreamhack" })
    ).toHaveAttribute("href", "/albums/2");
    expect(screen.getByAltText("IMG_1")).toHaveAttribute(
      "src",
      "/g2data/thumbnails/7.jpg"
    );

    await userEvent.click(screen.getByRole("link", { name: /Day 1/ }));
    expect(
      await screen.findByRole("heading", { name: /Day 1/ })
    ).toBeInTheDocument();
    expect(f.calls()).toContain("GET /api/albums/6");
    expect(screen.getByText("No photos.")).toBeInTheDocument();
  });

  it("renders a delegated user's synthetic root (album null)", async () => {
    const f = installFetchMock();
    f.on("GET /api/albums/root", {
      status: 200,
      body: albumView({
        album: null,
        children: [item({ id: 30, type: "album", title: "Mine" })],
      }),
    });
    renderAt("/albums/root");
    expect(
      await screen.findByRole("heading", { name: "Your albums" })
    ).toBeInTheDocument();
    expect(screen.getByText("Mine")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: /Photos/ })
    ).not.toBeInTheDocument();
  });

  it("reports 403 and 404", async () => {
    const f = installFetchMock();
    f.on("GET /api/albums/9", { status: 403, body: { error: "forbidden" } });
    renderAt("/albums/9");
    expect(
      await screen.findByText("You have no access to this album.")
    ).toBeInTheDocument();
  });
});
