import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Mocks:
  - mockSignInWithOAuth: spy for OAuth signup flow (Continue with Google)
  - We mock createClient so tests don't call real Supabase.
*/
const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: mockSignInWithOAuth } }),
}));

import SignUpForm from "@/components/SignUpForm";

describe("SignUpForm integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    // preserve original fetch to restore after tests
    originalFetch = globalThis.fetch;
    // default: simulate successful signup API response
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    // restore original fetch to avoid cross-test interference
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("submits signup form and shows verification view on success", async () => {
    // Render inside MantineProvider so UI components function
    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    // fill form
    await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
    const passwordFields = screen.getAllByLabelText(/Password/i);
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");

    // submit
    const submitBtn = screen.getByRole("button", { name: /Sign Up/i });
    await userEvent.click(submitBtn);

    // assert API called with POST to signup endpoint
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // verification UI appears with email shown
    await waitFor(() => {
      expect(screen.getByText(/Check Your Email/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it("shows server error when signup fails and keeps form visible", async () => {
    // simulate server error response for this test
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already registered" }),
    });

    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    await userEvent.type(
      screen.getByLabelText(/Email/i),
      "existing@example.com",
    );
    const passwordFields = screen.getAllByLabelText(/Password/i);
    await userEvent.type(passwordFields[0], "password123");
    await userEvent.type(passwordFields[1], "password123");

    const submitBtn = screen.getByRole("button", { name: /Sign Up/i });
    await userEvent.click(submitBtn);

    // expect server error message shown and still on form view
    const errNode = await screen.findByText(/Email already registered/i);
    expect(errNode).toBeInTheDocument();
    expect(screen.queryByText(/Check Your Email/i)).not.toBeInTheDocument();
  });

  it("initiates Google OAuth when clicking Continue with Google", async () => {
    // ensure the mock resolves like supabase would
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    const googleBtn = screen.getByRole("button", {
      name: /Continue with Google/i,
    });
    await userEvent.click(googleBtn);

    // assert signInWithOAuth was called with provider 'google' and signup callback redirect
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining(
              "/api/auth/callback/google?type=signup",
            ),
          }),
        }),
      );
    });
  });
});
