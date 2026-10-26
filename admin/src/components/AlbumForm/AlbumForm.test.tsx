import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AlbumForm } from "./AlbumForm";
import { installFetchMock, item } from "../../test/mockFetch";

describe("AlbumForm", () => {
  it("creates an album with all fields and a unix event date", async () => {
    const f = installFetchMock();
    const created = item({ id: 9, type: "album", title: "T" });
    f.on("POST /api/albums", { status: 201, body: created });
    const onSaved = vi.fn();
    render(
      <AlbumForm mode="new" parentId={3} onSaved={onSaved} onCancel={vi.fn()} />
    );
    await userEvent.type(screen.getByLabelText("Title"), " T ");
    await userEvent.type(screen.getByLabelText("Summary"), "S");
    await userEvent.type(screen.getByLabelText("Description"), "D");
    fireEvent.change(screen.getByLabelText("Event date"), {
      target: { value: "2005-11-24" },
    });
    expect(screen.queryByLabelText("URL segment")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(f.bodyOf("POST /api/albums")).toEqual({
      parentId: 3,
      title: "T",
      summary: "S",
      description: "D",
      eventAt: Date.UTC(2005, 10, 24) / 1000,
    });
    expect(onSaved).toHaveBeenCalledWith(created);
  });

  it("refuses an empty title without calling the API", async () => {
    const f = installFetchMock();
    render(
      <AlbumForm mode="new" parentId={3} onSaved={vi.fn()} onCancel={vi.fn()} />
    );
    fireEvent.submit(screen.getByRole("form", { name: "New album" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "title is required"
    );
    expect(f.calls()).toEqual([]);
  });

  it("patches only the changed fields and lets an unlocked segment be edited", async () => {
    const f = installFetchMock();
    const album = item({
      id: 4,
      type: "album",
      title: "Old",
      summary: "Sum",
      urlSegment: "old",
      urlLocked: false,
      eventAt: 1000000,
    });
    f.on("PATCH /api/albums/4", {
      status: 200,
      body: { ...album, title: "New" },
    });
    const onSaved = vi.fn();
    render(
      <AlbumForm
        mode="edit"
        album={album}
        isAdmin={false}
        onSaved={onSaved}
        onCancel={vi.fn()}
      />
    );
    const segment = screen.getByLabelText("URL segment");
    expect(segment).toBeEnabled();
    await userEvent.clear(screen.getByLabelText("Title"));
    await userEvent.type(screen.getByLabelText("Title"), "New");
    await userEvent.clear(segment);
    await userEvent.type(segment, "new-seg");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(f.bodyOf("PATCH /api/albums/4")).toEqual({
      title: "New",
      urlSegment: "new-seg",
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("disables a locked segment for users; admins can force it", async () => {
    const f = installFetchMock();
    const album = item({
      id: 5,
      type: "album",
      urlSegment: "locked",
      urlLocked: true,
    });
    f.on("PATCH /api/albums/5", { status: 200, body: album });
    const { unmount } = render(
      <AlbumForm
        mode="edit"
        album={album}
        isAdmin={false}
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText("URL segment")).toBeDisabled();
    expect(screen.queryByLabelText(/Admin override/)).not.toBeInTheDocument();
    unmount();

    render(
      <AlbumForm
        mode="edit"
        album={album}
        isAdmin
        onSaved={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByLabelText("URL segment")).toBeDisabled();
    await userEvent.click(screen.getByLabelText(/Admin override/));
    const segment = screen.getByLabelText("URL segment");
    expect(segment).toBeEnabled();
    await userEvent.clear(segment);
    await userEvent.type(segment, "moved");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(f.bodyOf("PATCH /api/albums/5")).toEqual({
      urlSegment: "moved",
      force: true,
    });
  });

  it("cancels without a request when nothing changed", async () => {
    const f = installFetchMock();
    const onCancel = vi.fn();
    render(
      <AlbumForm
        mode="edit"
        album={item({ id: 6, type: "album" })}
        isAdmin={false}
        onSaved={vi.fn()}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onCancel).toHaveBeenCalled();
    expect(f.calls()).toEqual([]);
  });
});
