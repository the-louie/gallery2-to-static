import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsersPage } from "./UsersPage";
import { albumView, installFetchMock, item, me } from "../../test/mockFetch";
import { renderWithSession, session } from "../../test/renderWithSession";
import { clearAlbumTitleCache } from "../../hooks/useAlbumTitles";
import type { AdminUser } from "../../types";

const admin: AdminUser = { ...me().user, albums: [] };
const dee: AdminUser = {
  id: 2,
  email: "dee@example.com",
  role: "user",
  enabled: true,
  nickname: "Dee",
  fullName: null,
  showFullName: false,
  totpEnrolled: false,
  createdAt: "2026-01-02T00:00:00Z",
  lastLoginAt: null,
  albums: [3],
};

function setup() {
  const f = installFetchMock();
  f.on("GET /api/admin/users", { status: 200, body: { users: [admin, dee] } });
  f.on("GET /api/albums/3", {
    status: 200,
    body: albumView({
      album: item({ id: 3, type: "album", title: "Birthdays" }),
    }),
  });
  f.on("GET /api/albums/root", {
    status: 200,
    body: albumView({
      children: [
        item({ id: 3, type: "album", title: "Birthdays" }),
        item({ id: 4, type: "album", title: "Travel" }),
      ],
    }),
  });
  return f;
}

describe("UsersPage", () => {
  beforeEach(() => clearAlbumTitleCache());

  it("refuses non-admins", () => {
    installFetchMock();
    renderWithSession(<UsersPage />, { session: session({ role: "user" }) });
    expect(screen.getByText("Admins only.")).toBeInTheDocument();
  });

  it("lists users with resolved delegated album titles", async () => {
    setup();
    renderWithSession(<UsersPage />);
    const row = (await screen.findByText("dee@example.com")).closest("tr")!;
    expect(await within(row).findByText("Birthdays")).toBeInTheDocument();
    expect(within(row).getByText("TOTP not set up")).toBeInTheDocument();
    const adminRow = screen.getByText("admin@example.com").closest("tr")!;
    expect(within(adminRow).getByText("everything")).toBeInTheDocument();
    expect(
      within(adminRow).getByRole("button", { name: "Disable" })
    ).toBeDisabled();
  });

  it("invites with e-mail and role", async () => {
    const f = setup();
    const invited: AdminUser = {
      ...dee,
      id: 9,
      email: "new@example.com",
      role: "admin",
      albums: [],
    };
    f.on("POST /api/admin/users", { status: 201, body: invited });
    renderWithSession(<UsersPage />);
    await screen.findByText("dee@example.com");
    await userEvent.type(screen.getByLabelText("E-mail"), "new@example.com");
    await userEvent.selectOptions(screen.getByLabelText("Role"), "admin");
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    expect(f.bodyOf("POST /api/admin/users")).toEqual({
      email: "new@example.com",
      role: "admin",
    });
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    expect(screen.getByLabelText("E-mail")).toHaveValue("");
  });

  it("shows a 409 on a duplicate invite", async () => {
    const f = setup();
    f.on("POST /api/admin/users", {
      status: 409,
      body: { error: "user exists" },
    });
    renderWithSession(<UsersPage />);
    await screen.findByText("dee@example.com");
    await userEvent.type(screen.getByLabelText("E-mail"), "dee@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "user exists (409)"
    );
  });

  it("disables, resets TOTP, undelegates and delegates through the picker", async () => {
    const f = setup();
    f.on("PUT /api/admin/users/2/enabled", {
      status: 200,
      body: { ...dee, enabled: false },
    });
    f.on("POST /api/admin/users/2/totp/reset", {
      status: 200,
      body: { ...dee, enabled: false },
    });
    f.on("DELETE /api/admin/users/2/albums/3", {
      status: 200,
      body: { ...dee, enabled: false, albums: [] },
    });
    f.on("PUT /api/admin/users/2/albums/4", {
      status: 200,
      body: { ...dee, enabled: false, albums: [4] },
    });
    f.on("GET /api/albums/4", {
      status: 200,
      body: albumView({
        album: item({ id: 4, type: "album", title: "Travel" }),
      }),
    });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithSession(<UsersPage />);
    const row = (await screen.findByText("dee@example.com")).closest("tr")!;

    await userEvent.click(within(row).getByRole("button", { name: "Disable" }));
    expect(f.bodyOf("PUT /api/admin/users/2/enabled")).toEqual({
      enabled: false,
    });
    expect(await within(row).findByText("disabled")).toBeInTheDocument();
    expect(
      within(row).getByRole("button", { name: "Enable" })
    ).toBeInTheDocument();

    await userEvent.click(
      within(row).getByRole("button", { name: "Reset TOTP" })
    );
    await waitFor(() =>
      expect(f.calls()).toContain("POST /api/admin/users/2/totp/reset")
    );

    await userEvent.click(
      await within(row).findByRole("button", {
        name: "Undelegate Birthdays from dee@example.com",
      })
    );
    await waitFor(() =>
      expect(f.calls()).toContain("DELETE /api/admin/users/2/albums/3")
    );
    await waitFor(() =>
      expect(within(row).queryByText("Birthdays")).not.toBeInTheDocument()
    );

    await userEvent.click(
      within(row).getByRole("button", {
        name: "Delegate an album to dee@example.com",
      })
    );
    const dialog = await screen.findByRole("dialog", { name: "Pick an album" });
    await userEvent.click(
      await within(dialog).findByRole("button", { name: "Select Travel" })
    );
    await waitFor(() =>
      expect(f.calls()).toContain("PUT /api/admin/users/2/albums/4")
    );
    expect(await within(row).findByText("Travel")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
