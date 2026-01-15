import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Integration tests for SignUpForm component.

  Tests cover:
  - successful signup flow shows verification view
  - server-side signup errors are displayed and form remains visible
  - Google OAuth initiation for signup
  - presence of "Log In" link target (href)
*/

/* Mock for Supabase client used by SignUpForm (prevents network calls) */
const mockSignInWithOAuth = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: mockSignInWithOAuth } }),
}));

import SignUpForm from "@/components/SignUpForm";

describe("SignUpForm integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // reset mocks and stub network fetch for predictable behavior
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    // restore global fetch to avoid leaking test stubs
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("submits signup form and shows verification view on success", async () => {
    // Render form inside MantineProvider so UI components behave correctly
    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    // Fill out form fields
    await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
    const passwordFields = screen.getAllByLabelText(/Password/i);
    // use a strong password that satisfies the component checks (length, number, lowercase, uppercase)
    await userEvent.type(passwordFields[0], "Password123");
    await userEvent.type(passwordFields[1], "Password123");

    // Submit the form
    const submitBtn = screen.getByRole("button", {
      name: /(?:sign up|create account)/i,
    });
    await userEvent.click(submitBtn);

    // Expect a POST to the signup API
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signup",
        expect.objectContaining({ method: "POST" }),
      );
    });

    // Verification UI should appear and show the submitted email
    await waitFor(() => {
      expect(screen.getByText(/Check Your Email/i)).toBeInTheDocument();
      expect(screen.getByText(/test@example.com/i)).toBeInTheDocument();
    });
  });

  it("shows server error when signup fails and keeps form visible", async () => {
    // Simulate server returning an error response
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Email already registered" }),
    });

    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    // Fill and submit form with an already-registered email
    await userEvent.type(
      screen.getByLabelText(/Email/i),
      "existing@example.com",
    );
    const passwordFields = screen.getAllByLabelText(/Password/i);
    await userEvent.type(passwordFields[0], "Password123");
    await userEvent.type(passwordFields[1], "Password123");

    const submitBtn = screen.getByRole("button", {
      name: /(?:sign up|create account)/i,
    });
    await userEvent.click(submitBtn);

    // Server error should be shown and verification view should NOT be present
    const errNode = await screen.findByText(/Email already registered/i);
    expect(errNode).toBeInTheDocument();
    expect(screen.queryByText(/Check Your Email/i)).not.toBeInTheDocument();
  });

  it("initiates Google OAuth when clicking Continue with Google", async () => {
    // Ensure the OAuth mock resolves like Supabase would
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    // Click the Google OAuth button and assert the supabase method was called
    const googleBtn = screen.getByRole("button", {
      name: /Continue with Google/i,
    });
    await userEvent.click(googleBtn);

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

  it("contains Log In link that navigates to Sign In (href check)", async () => {
    // Render the signup form and assert the "Log In" anchor points to /signin
    render(
      <MantineProvider>
        <SignUpForm />
      </MantineProvider>,
    );

    const loginLink = screen.getByRole("link", { name: /Log In/i });
    expect(loginLink).toHaveAttribute("href", "/signin");
  });
});
