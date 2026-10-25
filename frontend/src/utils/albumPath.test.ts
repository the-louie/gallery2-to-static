/**
 * Unit tests for albumPath utilities (path-based album URL building).
 */

import * as fs from "fs";
import * as path from "path";
import { describe, it, expect } from "vitest";
import {
  titleToSegment,
  getAlbumPath,
  getImagePath,
  getAlbumPathFromAlbum,
  getChildAlbumPath,
} from "./albumPath";
import type { BreadcrumbPath } from "@/types";

describe("albumPath", () => {
  describe("titleToSegment", () => {
    it("returns empty string for null or undefined", () => {
      expect(titleToSegment(null)).toBe("");
      expect(titleToSegment(undefined)).toBe("");
    });

    it("returns empty string for empty string", () => {
      expect(titleToSegment("")).toBe("");
    });

    it("lowercases and replaces spaces with underscore", () => {
      expect(titleToSegment("Test Album")).toBe("test_album");
      expect(titleToSegment("Photos")).toBe("photos");
      expect(titleToSegment("Backspace 2.0")).toBe("backspace_2.0");
    });

    it("replaces illegal URL chars with underscore", () => {
      expect(titleToSegment("A/B\\C?")).toMatch(/^[a-z0-9_\-.]+$/);
    });

    it("preserves hyphens in titles", () => {
      expect(titleToSegment("Photos - Summer")).toBe("photos-summer");
      expect(titleToSegment("2024-01-15")).toBe("2024-01-15");
      expect(titleToSegment("A-B")).toBe("a-b");
    });

    it("does not treat quotes or angle brackets as range endpoints", () => {
      expect(titleToSegment("it's")).toBe("it_s");
      expect(titleToSegment("a>b")).toBe("a_b");
      expect(titleToSegment("a<b")).toBe("a_b");
      expect(titleToSegment('a"b')).toBe("a_b");
    });

    it("normalizes Nordic entities to ASCII", () => {
      expect(titleToSegment("åäö")).toBe("aao");
      expect(titleToSegment("ÅÄÖ")).toBe("aao");
    });
  });

  describe("getAlbumPath", () => {
    it('returns "/" for empty or missing breadcrumb', () => {
      expect(getAlbumPath([])).toBe("/");
      expect(getAlbumPath(null as unknown as BreadcrumbPath)).toBe("/");
      expect(getAlbumPath(undefined as unknown as BreadcrumbPath)).toBe("/");
    });

    it("returns last item path when present", () => {
      const bp: BreadcrumbPath = [
        { id: 7, title: "Root", path: "/" },
        { id: 8, title: "Albums", path: "/albums" },
      ];
      expect(getAlbumPath(bp)).toBe("/albums");
    });

    it('returns "/" when last item has no path', () => {
      const bp: BreadcrumbPath = [
        { id: 7, title: "Root", path: "/" },
        { id: 8, title: "Albums", path: null as unknown as string }, // a missing path, as old data can have
      ];
      expect(getAlbumPath(bp)).toBe("/");
    });
  });

  describe("getImagePath", () => {
    it("builds path with album path prefix", () => {
      const bp: BreadcrumbPath = [
        { id: 7, title: "Root", path: "/" },
        { id: 8, title: "Albums", path: "/albums" },
      ];
      expect(getImagePath(bp, 123)).toBe("/albums/image/123");
    });

    it("builds /image/{id} when album path is root", () => {
      expect(getImagePath([], 99)).toBe("/image/99");
      const rootOnly: BreadcrumbPath = [{ id: 7, title: "Root", path: "/" }];
      expect(getImagePath(rootOnly, 99)).toBe("/image/99");
    });
  });

  describe("getAlbumPathFromAlbum", () => {
    it("returns album.path when set", () => {
      expect(
        getAlbumPathFromAlbum({ path: "/custom/path", title: "Ignore" })
      ).toBe("/custom/path");
      expect(getAlbumPathFromAlbum({ path: "/one", title: null })).toBe("/one");
    });

    it("builds path from title when path missing", () => {
      expect(getAlbumPathFromAlbum({ title: "Test Album" })).toBe(
        "/test_album"
      );
      expect(getAlbumPathFromAlbum({ title: "Root", path: null })).toBe(
        "/root"
      );
      expect(getAlbumPathFromAlbum({ title: "Root", path: "" })).toBe("/root");
    });
  });

  describe("getChildAlbumPath", () => {
    it("returns childPath when set", () => {
      const parent: BreadcrumbPath = [{ id: 7, title: "Root", path: "/" }];
      expect(getChildAlbumPath(parent, "Child", 10, "/emitted/child")).toBe(
        "/emitted/child"
      );
    });

    it("builds path from parent breadcrumb and child title when childPath missing", () => {
      const parent: BreadcrumbPath = [
        { id: 7, title: "Root", path: "/" },
        { id: 8, title: "Parent", path: "/parent" },
      ];
      expect(getChildAlbumPath(parent, "Child", 10)).toBe("/parent/child");
    });

    it("handles root parent", () => {
      const parent: BreadcrumbPath = [{ id: 7, title: "Root", path: "/" }];
      expect(getChildAlbumPath(parent, "First", 1)).toBe("/first");
    });
  });
});

describe("shared cross-validation vectors (ARCH-02)", () => {
  const vectorsPath = path.resolve(
    __dirname,
    "../../../test-vectors/nordic-path-normalization.json"
  );
  const vectors = JSON.parse(fs.readFileSync(vectorsPath, "utf8"))
    .common as [string, string][];

  it.each(vectors)("titleToSegment(%j) === %j", (input, expected) => {
    expect(titleToSegment(input)).toBe(expected);
  });
});
