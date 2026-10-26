import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditPage } from "./AuditPage";
import { installFetchMock } from "../../test/mockFetch";
import { renderWithSession, session } from "../../test/renderWithSession";
import type { AuditEntry } from "../../types";

function entry(id: number, over: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id,
    at: `2026-10-26T10:00:${String(id % 60).padStart(2, "0")}Z`,
    user_id: 1,
    email: "admin@example.com",
    ip: "10.0.0.1",
    action: "invite",
    target: `user:${id}`,
    result: "ok",
    detail: { email: `u${id}@example.com` },
    ...over,
  };
}

describe("AuditPage", () => {
  it("refuses non-admins", () => {
    installFetchMock();
    renderWithSession(<AuditPage />, { session: session({ role: "user" }) });
    expect(screen.getByText("Admins only.")).toBeInTheDocument();
  });

  it("lists entries newest first and pages with 'Older' using next", async () => {
    const f = installFetchMock();
    const first = Array.from({ length: 100 }, (_, i) => entry(300 - i));
    f.on("GET /api/admin/audit?limit=100", {
      status: 200,
      body: { entries: first, next: 201 },
    });
    f.on("GET /api/admin/audit?limit=100&before=201", {
      status: 200,
      body: {
        entries: [
          entry(200, {
            result: "denied",
            action: "login",
            detail: null,
            email: null,
          }),
        ],
        next: 200,
      },
    });
    renderWithSession(<AuditPage />);
    expect(await screen.findByText("user:300")).toBeInTheDocument();
    expect(
      screen.getByText('{"email":"u300@example.com"}')
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Older" }));
    expect(await screen.findByText("user:200")).toBeInTheDocument();
    expect(screen.getByText("denied")).toBeInTheDocument();
    expect(screen.getByText("End of log.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Older" })
    ).not.toBeInTheDocument();
    expect(f.calls()).toContain("GET /api/admin/audit?limit=100&before=201");
  });
});
