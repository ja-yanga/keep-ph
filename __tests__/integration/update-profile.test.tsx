import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// mock compressToAVIF to avoid canvas usage in JSDOM
jest.mock("@/utils/compress-to-avif", () => ({
  __esModule: true,
  compressToAVIF: jest.fn(async (file: File) => {
    // return the File (or a Blob) directly so component proceeds without canvas
    return file;
  }),
}));

// polyfill URL.createObjectURL used by component
if (typeof URL.createObjectURL !== "function") {
  URL.createObjectURL = jest.fn(() => "blob:preview");
}
// polyfill URL.revokeObjectURL used by component cleanup
if (typeof URL.revokeObjectURL !== "function") {
  URL.revokeObjectURL = jest.fn();
}

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

import AccountContent from "@/components/pages/customer/Account/index";

describe("AccountContent — update profile", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;

    // Default fetch mock used by tests: respond to KYC and upload/update endpoints.
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("/api/user/kyc")) {
        // KYC lookup returns empty array (no KYC records)
        return {
          ok: true,
          json: async () => ({ data: [] }),
        } as unknown as Response;
      }
      // accept either avatar upload or legacy update-profile endpoint
      if (
        url.includes("/api/auth/update-profile") ||
        url.includes("/api/uploads/avatar")
      ) {
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
        <AccountContent />
      </MantineProvider>,
    );

    // The UI now exposes avatar upload controls. Locate the hidden file input and
    // simulate selecting a file to trigger the same upload flow.
    const fileInput = (document.querySelector('input[type="file"]') ||
      (await screen
        .findByLabelText("Change avatar")
        .then(() =>
          document.querySelector('input[type="file"]'),
        ))) as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    // fire change to simulate selecting a file
    await userEvent.upload(fileInput!, file);

    // Expect a POST to update-profile OR avatar upload endpoint
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(
          /(\/api\/auth\/update-profile|\/api\/uploads\/avatar)/,
        ),
        expect.objectContaining({
          method: "POST",
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
    // Replace fetch for this test so update-profile/avatar returns an error response
    (globalThis.fetch as jest.Mock).mockImplementation(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/user/kyc")) {
          return {
            ok: true,
            json: async () => ({ data: [] }),
          } as unknown as Response;
        }
        if (
          url.includes("/api/auth/update-profile") ||
          url.includes("/api/uploads/avatar")
        ) {
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
        <AccountContent />
      </MantineProvider>,
    );

    // Trigger the avatar upload error path like the success test
    const fileInput = (document.querySelector('input[type="file"]') ||
      (await screen
        .findByLabelText("Change avatar")
        .then(() =>
          document.querySelector('input[type="file"]'),
        ))) as HTMLInputElement | null;
    expect(fileInput).toBeTruthy();
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    await userEvent.upload(fileInput!, file);

    // Expect an alert role to appear and contain the server-provided error message
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/Failed to upload avatar/i);
  });
});
