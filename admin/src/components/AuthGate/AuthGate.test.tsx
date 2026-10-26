import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthGate } from "./AuthGate";
import { installFetchMock, me } from "../../test/mockFetch";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(async () => "data:image/png;base64,QR") },
}));

describe("AuthGate", () => {
  it("renders the app on 200", async () => {
    const f = installFetchMock();
    f.on("GET /api/me", { status: 200, body: me() });
    render(
      <AuthGate>
        <p>inside</p>
      </AuthGate>
    );
    expect(await screen.findByText("inside")).toBeInTheDocument();
    expect(f.fn).toHaveBeenCalledWith(
      "/api/me",
      expect.objectContaining({ credentials: "include" })
    );
  });

  it("shows TOTP setup with QR and secret on 401 totpSetup, then verifies", async () => {
    const f = installFetchMock();
    let passed = false;
    f.on("GET /api/me", () =>
      passed
        ? { status: 200, body: me() }
        : { status: 401, body: { error: "totp_required", totpSetup: true } }
    );
    f.on("POST /api/auth/totp/setup", {
      status: 200,
      body: {
        secret: "JBSWY3DPEHPK3PXP",
        otpauthUrl: "otpauth://totp/x?secret=JBSWY3DPEHPK3PXP",
      },
    });
    f.on("POST /api/auth/totp/verify", () => {
      passed = true;
      return { status: 200, body: { ok: true } };
    });
    render(
      <AuthGate>
        <p>inside</p>
      </AuthGate>
    );
    expect(await screen.findByTestId("totp-secret")).toHaveTextContent(
      "JBSWY3DPEHPK3PXP"
    );
    expect(
      await screen.findByAltText("QR code of the authenticator secret")
    ).toHaveAttribute("src", "data:image/png;base64,QR");

    await userEvent.type(screen.getByLabelText("6-digit code"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByText("inside")).toBeInTheDocument();
    expect(f.bodyOf("POST /api/auth/totp/verify")).toEqual({ code: "123456" });
  });

  it("shows the verify form on 401 without setup and reports a wrong code", async () => {
    const f = installFetchMock();
    f.on("GET /api/me", {
      status: 401,
      body: { error: "totp_required", totpSetup: false },
    });
    f.on("POST /api/auth/totp/verify", {
      status: 401,
      body: { error: "wrong code" },
    });
    render(
      <AuthGate>
        <p>inside</p>
      </AuthGate>
    );
    expect(
      await screen.findByRole("heading", {
        name: "Enter your authenticator code",
      })
    ).toBeInTheDocument();
    expect(f.calls()).not.toContain("POST /api/auth/totp/setup");
    await userEvent.type(screen.getByLabelText("6-digit code"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Wrong code");
    expect(screen.queryByText("inside")).not.toBeInTheDocument();
  });

  it("shows 'not invited' with the e-mail on 403", async () => {
    const f = installFetchMock();
    f.on("GET /api/me", {
      status: 403,
      body: { error: "not an enabled user", email: "x@example.com" },
    });
    render(
      <AuthGate>
        <p>inside</p>
      </AuthGate>
    );
    expect(
      await screen.findByRole("heading", { name: "Not invited" })
    ).toBeInTheDocument();
    expect(screen.getByText("x@example.com")).toBeInTheDocument();
  });

  it("logs out from the TOTP screen", async () => {
    const f = installFetchMock();
    f.on("GET /api/me", {
      status: 401,
      body: { error: "totp_required", totpSetup: false },
    });
    f.on("POST /api/auth/logout", { status: 204 });
    render(
      <AuthGate>
        <p>inside</p>
      </AuthGate>
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Log out" })
    );
    await waitFor(() => expect(f.calls()).toContain("POST /api/auth/logout"));
    expect(
      await screen.findByRole("heading", { name: "Logged out" })
    ).toBeInTheDocument();
  });
});
