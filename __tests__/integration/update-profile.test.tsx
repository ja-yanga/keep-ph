import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Integration tests for AccountContent -> update profile flow.

  What is tested:
  - Successful profile update (no avatar) -> calls update-profile API and triggers session refresh.
  - Failed profile update -> shows error alert with server message.

  Strategy:
  - Mock SessionProvider to provide an authenticated session and a refresh() spy.
  - Mock global.fetch to return controlled responses for /api/user/kyc and /api/auth/update-profile.
  - Render AccountContent inside MantineProvider so UI components behave like in the app.
*/

const refreshMock = jest.fn();

/* Mock SessionProvider so AccountContent reads a known session and can call refresh() */
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "user-123", email: "user@example.com" },
      profile: { avatar_url: null },
    },
    refresh: refreshMock,
  }),
}));

import AccountSettings from "@/components/pages/customer/Account";

describe("AccountContent — update profile", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;

    // Default fetch mock used by tests: respond to KYC and update-profile endpoints.
    const fetchMock = jest.fn(async (input: RequestInfo) => {
      const url = String(input);
      if (url.includes("/api/user/kyc")) {
        // KYC lookup returns empty array (no KYC records)
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as unknown as Response;
      }
      if (url.includes("/api/auth/update-profile")) {
        // Default case: successful profile update
        return {
          ok: true,
          json: async () => ({ message: "Profile updated successfully" }),
        } as unknown as Response;
      }
      return { ok: false, json: async () => ({}) } as unknown as Response;
    }) as unknown as typeof globalThis.fetch;

    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    // restore original fetch to avoid leaking mocks between tests
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("opens confirm modal and updates profile (no avatar) then refreshes", async () => {
    // Render component inside MantineProvider to ensure Mantine UI works
    render(
      <MantineProvider>
        <AccountSettings />
      </MantineProvider>,
    );

    // Find and click Save Profile which opens a confirmation modal
    const saveBtn = await screen.findByRole("button", {
      name: /Save Profile/i,
    });
    await userEvent.click(saveBtn);

    // Confirm the save in the modal
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Save/i,
    });
    await userEvent.click(confirmBtn);

    // Expect a POST to update-profile with JSON content-type
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/update-profile",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // After successful update expect session refresh called and success message visible
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalled();
      expect(
        screen.getByText(/Profile updated successfully/i),
      ).toBeInTheDocument();
    });
  });

  it("shows error when update-profile returns non-ok", async () => {
    // Replace fetch for this test so update-profile returns an error response
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/api/user/kyc")) {
          return {
            ok: true,
            json: async () => ({ data: [] }),
          } as unknown as Response;
        }
        if (url.includes("/api/auth/update-profile")) {
          // Simulate server error payload
          return {
            ok: false,
            json: async () => ({ error: "Failed to upload avatar" }),
          } as unknown as Response;
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    );

    render(
      <MantineProvider>
        <AccountSettings />
      </MantineProvider>,
    );

    // Open modal and confirm save as in the success test
    const saveBtn = await screen.findByRole("button", {
      name: /Save Profile/i,
    });
    await userEvent.click(saveBtn);

    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Save/i,
    });
    await userEvent.click(confirmBtn);

    // Expect an alert role to appear and contain the server-provided error message
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Failed to upload avatar/i);
  });
});
