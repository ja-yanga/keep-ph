import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Integration tests for AccountContent -> change password flow.

  What is tested:
  - Successful password change: validates fields, opens confirm modal, calls change-password API,
    shows success message and clears inputs.
  - Failed password change: server returns non-ok, show error alert.

  Strategy:
  - Render AccountContent inside MantineProvider so Mantine UI works.
  - Mock global.fetch to return controlled responses for /api/auth/change-password.
  - Restore original fetch after each test.
*/

jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "user-123", email: "user@example.com" },
      profile: { avatar_url: null },
    },
    refresh: jest.fn(),
  }),
}));

import AccountContent from "@/components/AccountContent";

describe("AccountContent — change password", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("validates, confirms and successfully updates password", async () => {
    // mock successful change-password response
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated successfully" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <AccountContent />
      </MantineProvider>,
    );

    // switch to Security tab
    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    // scope queries to the Security tab panel to avoid matching duplicate inputs elsewhere
    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    // fill current, new, confirm (new must meet strength checks)
    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "old-pass-1A",
    );
    // multiple inputs match "New Password" in this panel — use getAllByLabelText and pick indexes
    const newPwFields = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields[0], "NewPass1A"); // New Password
    await userEvent.type(newPwFields[1], "NewPass1A"); // Confirm New Password

    // click Update Password -> opens confirmation modal
    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );

    // click confirm in modal
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Update/i,
    });
    await userEvent.click(confirmBtn);

    // assert API was called with POST and payload contains both passwords
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/change-password",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining('"currentPassword":"old-pass-1A"'),
        }),
      );
    });

    // expect success alert shown and inputs cleared
    const successAlert = await screen.findByText(
      /Password updated successfully/i,
    );
    expect(successAlert).toBeInTheDocument();

    // inputs should be cleared after success — query all password inputs in this panel
    // and check them by order: Current, New, Confirm
    const pwInputs = scoped.getAllByLabelText(
      /Password/i,
    ) as HTMLInputElement[];
    expect(pwInputs[0].value).toBe("");
    expect(pwInputs[1].value).toBe("");
    expect(pwInputs[2].value).toBe("");
  });

  it("shows error alert when server returns error", async () => {
    // mock failing change-password response
    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Current password incorrect" }),
    });

    render(
      <MantineProvider>
        <AccountContent />
      </MantineProvider>,
    );

    // switch to Security tab
    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    // scope queries to the Security tab panel
    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    // fill inputs (valid)
    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "bad-old-pass1A",
    );
    const newPwFields2 = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields2[0], "NewPass1A");
    await userEvent.type(newPwFields2[1], "NewPass1A");

    // trigger modal and confirm
    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Update/i,
    });
    await userEvent.click(confirmBtn);

    // expect an alert with server error message
    const errAlert = await screen.findByRole("alert");
    expect(errAlert).toHaveTextContent(/Current password incorrect/i);
  });

  it("shows validation error when new password doesn't meet requirements", async () => {
    render(
      <MantineProvider>
        <AccountContent />
      </MantineProvider>,
    );

    // switch to Security tab
    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    // scope queries to the Security tab panel
    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    // fill current and weak new password (does not meet strength checks)
    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "old-pass-1A",
    );
    const newPwFields = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields[0], "weak");
    await userEvent.type(newPwFields[1], "weak");

    // attempt to submit
    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );

    // expect inline validation error about password strength
    const err = await screen.findByText(/Password is too weak/i);
    expect(err).toBeInTheDocument();
  });
});
