import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@/test-utils";
import { PathResolverPage } from "./PathResolverPage";
import { useParams } from "react-router-dom";
import { loadAlbum, resolvePathToAlbumId } from "@/utils/dataLoader";
import type { AlbumFile } from "@/types";

// Mock dataLoader (preserve other exports used by ThemeContext etc.)
vi.mock("@/utils/dataLoader", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/dataLoader")>();
  return {
    ...actual,
    resolvePathToAlbumId: vi.fn(),
    loadAlbum: vi.fn(),
    loadPathIndex: vi.fn().mockResolvedValue({}),
  };
});

// Mock react-router-dom (preserve MemoryRouter for test-utils wrapper)
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: () => mockNavigate,
  };
});

// Mock child page components to simplify assertions
vi.mock("./AlbumDetailPage", () => ({
  AlbumDetailPage: ({ resolvedAlbumId }: { resolvedAlbumId: number }) => (
    <div data-testid="album-detail-page">Album {resolvedAlbumId}</div>
  ),
}));

vi.mock("./ImageDetailPage", () => ({
  ImageDetailPage: ({
    resolvedAlbumId,
    resolvedImageId,
  }: {
    resolvedAlbumId: number;
    resolvedImageId: number;
  }) => (
    <div data-testid="image-detail-page">
      Album {resolvedAlbumId} Image {resolvedImageId}
    </div>
  ),
}));

describe("PathResolverPage", () => {
  // Only album paths are in the index: '/.../image/<n>' itself resolves to nothing.
  const albumsAt = (map: Record<string, number>) =>
    vi.mocked(resolvePathToAlbumId).mockImplementation(async (p: string) => map[p] ?? null);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(null);
  });

  it("resolves a plain album path", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "SomeAlbum" });
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(42);

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent(
        "Album 42",
      );
    });

    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/SomeAlbum");
  });

  it("decodes percent-encoded spaces in path", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "Summer%20Photos" });
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(10);

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent(
        "Album 10",
      );
    });

    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/Summer Photos");
  });

  it("decodes percent-encoded Nordic characters in path", async () => {
    // %C3%85 = U+00C5 = A with ring above (Swedish character)
    vi.mocked(useParams).mockReturnValue({ "*": "%C3%85ker" });
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(15);

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent(
        "Album 15",
      );
    });

    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/\u00c5ker");
  });

  it("navigates to /not-found for malformed URI encoding", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "Bad%ZZPath" });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found", {
        replace: true,
      });
    });

    expect(resolvePathToAlbumId).not.toHaveBeenCalled();
  });

  it("navigates to /not-found when imageId exceeds MAX_SAFE_INTEGER", async () => {
    vi.mocked(useParams).mockReturnValue({
      "*": "SomeAlbum/image/99999999999999999999",
    });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found", {
        replace: true,
      });
    });

    // only the full path is tried as an album (LOGIC-28); the image form is rejected without a lookup
    expect(resolvePathToAlbumId).toHaveBeenCalledTimes(1);
    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/SomeAlbum/image/99999999999999999999");
  });

  it("accepts imageId at MAX_SAFE_INTEGER", async () => {
    const maxSafe = String(Number.MAX_SAFE_INTEGER);
    vi.mocked(useParams).mockReturnValue({
      "*": `SomeAlbum/image/${maxSafe}`,
    });
    albumsAt({ "/SomeAlbum": 42 });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("image-detail-page")).toHaveTextContent(
        `Album 42 Image ${Number.MAX_SAFE_INTEGER}`,
      );
    });

    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/SomeAlbum");
  });

  it("navigates to /not-found for zero imageId", async () => {
    vi.mocked(useParams).mockReturnValue({
      "*": "SomeAlbum/image/0",
    });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found", {
        replace: true,
      });
    });
  });

  it("navigates to /not-found for negative imageId", async () => {
    // The regex only matches \d+, so a negative won't match IMAGE_PATH_RE.
    // Instead, the whole path is treated as an album path and resolved.
    vi.mocked(useParams).mockReturnValue({
      "*": "SomeAlbum/image/-5",
    });
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(null);

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found", {
        replace: true,
      });
    });
  });

  it("decodes encoded album path in image URL", async () => {
    vi.mocked(useParams).mockReturnValue({
      "*": "My%20Album/image/123",
    });
    albumsAt({ "/My Album": 20 });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("image-detail-page")).toHaveTextContent(
        "Album 20 Image 123",
      );
    });

    expect(resolvePathToAlbumId).toHaveBeenCalledWith("/My Album");
  });

  describe("photo slugs (URL-01)", () => {
    const album = {
      metadata: { albumId: 20 },
      children: [
        { id: 30, type: "GalleryAlbumItem", title: "cimg0053_", pathComponent: "a/sub" },
        { id: 31, type: "GalleryPhotoItem", title: "CIMG0053_.JPG", pathComponent: "a/CIMG0053_.JPG" },
        { id: 32, type: "GalleryPhotoItem", title: "x", pathComponent: "a/CIMG0054.JPG" },
      ],
    } as unknown as AlbumFile;

    it("resolves <album path>/<slug> to the photo", async () => {
      vi.mocked(useParams).mockReturnValue({ "*": "dreamhack/dhw05/cimg0054" });
      albumsAt({ "/dreamhack/dhw05": 20 });
      vi.mocked(loadAlbum).mockResolvedValue(album);
      render(<PathResolverPage />);
      await waitFor(() => {
        expect(screen.getByTestId("image-detail-page")).toHaveTextContent("Album 20 Image 32");
      });
      expect(loadAlbum).toHaveBeenCalledWith(20);
    });

    it("matches photos only, not a sub-album with the same name", async () => {
      vi.mocked(useParams).mockReturnValue({ "*": "dreamhack/dhw05/cimg0053_" });
      albumsAt({ "/dreamhack/dhw05": 20 });
      vi.mocked(loadAlbum).mockResolvedValue(album);
      render(<PathResolverPage />);
      await waitFor(() => {
        expect(screen.getByTestId("image-detail-page")).toHaveTextContent("Album 20 Image 31");
      });
    });

    it("goes to /not-found for an unknown slug or a failing album load", async () => {
      vi.mocked(useParams).mockReturnValue({ "*": "dreamhack/dhw05/nope" });
      albumsAt({ "/dreamhack/dhw05": 20 });
      vi.mocked(loadAlbum).mockRejectedValue(new Error("404"));
      render(<PathResolverPage />);
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/not-found", { replace: true });
      });
    });

    it("an album with a trailing slash is never taken as a photo", async () => {
      vi.mocked(useParams).mockReturnValue({ "*": "dreamhack/dhw05/" });
      albumsAt({ "/dreamhack/dhw05/": 20 });
      render(<PathResolverPage />);
      await waitFor(() => {
        expect(screen.getByTestId("album-detail-page")).toHaveTextContent("Album 20");
      });
      expect(loadAlbum).not.toHaveBeenCalled();
    });
  });

  it("navigates to /not-found when album path is not found", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "NonExistent" });
    vi.mocked(resolvePathToAlbumId).mockResolvedValue(null);

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/not-found", {
        replace: true,
      });
    });
  });

  it("shows loading spinner initially", () => {
    vi.mocked(useParams).mockReturnValue({ "*": "SomeAlbum" });
    vi.mocked(resolvePathToAlbumId).mockReturnValue(new Promise(() => {}));

    render(<PathResolverPage />);

    expect(
      document.querySelector(".path-resolver-page-loading"),
    ).toBeInTheDocument();
  });
  it("shows an error with Retry when the path index fails to load, and recovers on retry", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "SomeAlbum" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(resolvePathToAlbumId)
      .mockRejectedValueOnce(new Error("HTTP 500"))
      .mockResolvedValueOnce(42);

    render(<PathResolverPage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load the gallery");
    expect(document.querySelector(".path-resolver-page-loading")).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalledWith("/not-found", { replace: true });

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toBeInTheDocument();
    });
    expect(resolvePathToAlbumId).toHaveBeenCalledTimes(2);
    consoleError.mockRestore();
  });

  it("shows the error state when the index fails for an image path too", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "SomeAlbum/image/5" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(resolvePathToAlbumId).mockRejectedValue(new Error("offline"));

    render(<PathResolverPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the gallery");
    consoleError.mockRestore();
  });

  it("keeps the current page while a new path resolves (no spinner flash)", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "AlbumA" });
    vi.mocked(resolvePathToAlbumId).mockResolvedValueOnce(10);
    const { rerender } = render(<PathResolverPage />);
    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent("Album 10");
    });

    let finish: (id: number) => void = () => {};
    vi.mocked(resolvePathToAlbumId).mockReturnValueOnce(new Promise((r) => (finish = r)));
    vi.mocked(useParams).mockReturnValue({ "*": "AlbumB" });
    rerender(<PathResolverPage />);

    expect(document.querySelector(".path-resolver-page-loading")).not.toBeInTheDocument();
    expect(screen.getByTestId("album-detail-page")).toHaveTextContent("Album 10");
    finish(20);
    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent("Album 20");
    });
  });

  it("an album named 'image' with a numeric child resolves as that album, not as an image (LOGIC-28)", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "fester/image/2005" });
    albumsAt({ "/fester": 10, "/fester/image": 11, "/fester/image/2005": 12 });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("album-detail-page")).toHaveTextContent("Album 12");
    });
    expect(screen.queryByTestId("image-detail-page")).toBeNull();
  });

  it("still opens an image when no album has that path", async () => {
    vi.mocked(useParams).mockReturnValue({ "*": "fester/image/2005" });
    albumsAt({ "/fester": 10 });

    render(<PathResolverPage />);

    await waitFor(() => {
      expect(screen.getByTestId("image-detail-page")).toHaveTextContent("Album 10 Image 2005");
    });
  });
});
