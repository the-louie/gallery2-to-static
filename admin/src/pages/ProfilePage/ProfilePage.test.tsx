import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProfilePage } from "./ProfilePage";
import { installFetchMock } from "../../test/mockFetch";
import { renderWithSession, session } from "../../test/renderWithSession";
import type { Profile } from "../../types";

const profile: Profile = {
  nickname: "Ada",
  fullName: null,
  showFullName: false,
  hasPicture: false,
  email: "admin@example.com",
  role: "admin",
};

describe("ProfilePage", () => {
  it("loads the profile and saves only the changed fields", async () => {
    const f = installFetchMock();
    f.on("GET /api/me/profile", { status: 200, body: profile });
    f.on("PUT /api/me/profile", {
      status: 200,
      body: { ...profile, fullName: "Ada Lovelace", showFullName: true },
    });
    const s = session();
    const refresh = vi.spyOn(s, "refresh");
    renderWithSession(<ProfilePage />, { session: s });
    expect(await screen.findByLabelText(/Nickname/)).toHaveValue("Ada");
    await userEvent.type(screen.getByLabelText(/Full name/), "Ada Lovelace");
    await userEvent.click(screen.getByLabelText(/Show my full name/));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(f.bodyOf("PUT /api/me/profile")).toEqual({
      fullName: "Ada Lovelace",
      showFullName: true,
    });
    expect(await screen.findByText("Saved.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it("explains a taken nickname (409)", async () => {
    const f = installFetchMock();
    f.on("GET /api/me/profile", { status: 200, body: profile });
    f.on("PUT /api/me/profile", {
      status: 409,
      body: { error: "nickname taken" },
    });
    renderWithSession(<ProfilePage />);
    const nick = await screen.findByLabelText(/Nickname/);
    await userEvent.clear(nick);
    await userEvent.type(nick, "louie");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "nickname is taken"
    );
    expect(f.bodyOf("PUT /api/me/profile")).toEqual({ nickname: "louie" });
  });

  it("uploads a picture as multipart 'file' and shows the preview", async () => {
    const f = installFetchMock();
    f.on("GET /api/me/profile", { status: 200, body: profile });
    f.on("PUT /api/me/picture", {
      status: 200,
      body: { ...profile, hasPicture: true },
    });
    renderWithSession(<ProfilePage />);
    expect(
      await screen.findByRole("img", { name: "No picture yet" })
    ).toBeInTheDocument();
    const file = new File(["img"], "me.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Upload a new picture"), file);
    await waitFor(() => expect(f.calls()).toContain("PUT /api/me/picture"));
    const body = f.bodyOf("PUT /api/me/picture") as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get("file") as File).name).toBe("me.jpg");
    expect(await screen.findByAltText("Your profile picture")).toHaveAttribute(
      "src",
      expect.stringMatching(/^\/api\/me\/picture\?v=/)
    );
  });

  it("refuses pictures over 2 MB locally", async () => {
    const f = installFetchMock();
    f.on("GET /api/me/profile", { status: 200, body: profile });
    renderWithSession(<ProfilePage />);
    await screen.findByLabelText(/Nickname/);
    const big = new File([""], "big.jpg", { type: "image/jpeg" });
    Object.defineProperty(big, "size", { value: 3 * 1024 * 1024 });
    await userEvent.upload(screen.getByLabelText("Upload a new picture"), big);
    expect(await screen.findByRole("alert")).toHaveTextContent("2 MB");
    expect(f.calls()).not.toContain("PUT /api/me/picture");
  });
});
