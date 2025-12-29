import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import ForgotPasswordForm from "@/components/ForgotPasswordForm";

/*
  Integration tests for ForgotPasswordForm
  - Renders the real component inside MantineProvider so Mantine UI works in tests.
  - Mocks global.fetch to avoid real network calls and to control responses.
  - Restores original fetch after each test to avoid leakage.
*/

describe("ForgotPasswordForm integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // preserve original fetch so we can restore it after the test
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("sends reset link and shows success view", async () => {
    // stub successful API response
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password reset email sent" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <ForgotPasswordForm />
      </MantineProvider>,
    );

    // user types email and submits the form
    await userEvent.type(screen.getByLabelText(/Email/i), "user@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: /Send Reset Link/i }),
    );

    // assert the API was called with POST and correct payload
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/forgot-password",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining("user@example.com"),
        }),
      );
    });

    // success UI shows confirmation and the provided email
    await waitFor(() => {
      expect(screen.getByText(/Check your email/i)).toBeInTheDocument();
      expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
    });
  });

  it("shows error message when API returns an error", async () => {
    // stub error response from API
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No such user" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <ForgotPasswordForm />
      </MantineProvider>,
    );

    // submit with an email that triggers server error
    await userEvent.type(screen.getByLabelText(/Email/i), "bad@example.com");
    await userEvent.click(
      screen.getByRole("button", { name: /Send Reset Link/i }),
    );

    // expect an alert with the server-provided error message
    await waitFor(() => {
      expect(screen.getByText(/No such user/i)).toBeInTheDocument();
    });
  });
});
