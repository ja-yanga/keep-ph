import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/**
 * Integration tests for SignInForm component.
 *
 * These tests exercise:
 * - form submission and server-auth flow
 * - session refresh behavior after successful signin
 * - OAuth initiation (Google)
 * - presence of navigation links (href checks)
 *
 * Tests mock:
 * - next/navigation router hooks to observe navigation calls
 * - supabase client factory for auth flows
 * - SessionProvider to observe refresh() being called
 *
 * MantineProvider wraps rendering to ensure Mantine components render correctly in JSDOM.
 */

/*
  Mocks and spies:
  - pushMock / replaceMock: observe next/router navigation
  - getSessionMock: spy for supabase.auth.getSession used after signin
  - mockSignInWithOAuth: spy for OAuth flows
  - refreshMock: spy for SessionProvider's refresh() called after signin
*/
const pushMock = jest.fn();
const replaceMock = jest.fn();
const getSessionMock = jest.fn();
const mockSignInWithOAuth = jest.fn();
const refreshMock = jest.fn();

/*
  Mock next/navigation hooks used inside SignInForm.
  Returning push/replace mocks allows assertions on navigation attempts.
*/
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}));

/*
  Mock the supabase client factory used by the component so tests don't call real supabase.
  We expose auth.getSession and auth.signInWithOAuth spies for assertions.
*/
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: getSessionMock, signInWithOAuth: mockSignInWithOAuth },
  }),
}));

/*
  Mock SessionProvider hook so we can assert refresh() was invoked after login.
  This prevents needing the real provider in tests.
*/
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ refresh: refreshMock }),
}));

import SignInForm from "@/components/SignInForm";

describe("SignInForm integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // reset spies and provide a default successful /api/auth/signin response
    jest.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ error: null });

    // preserve original fetch and stub network POST to /api/auth/signin -> success by default
    originalFetch = globalThis.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "ok" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;
  });

  afterEach(() => {
    // restore original fetch to avoid test leakage
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("submits credentials, calls session refresh and redirects to dashboard on success", async () => {
    // Render the form inside MantineProvider so UI elements render correctly.
    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    // Simulate user typing credentials into form controls.
    await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "password123");

    // There may be multiple "Sign In" buttons (OAuth etc.) — pick the form submit button.
    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    const submitButton =
      signInButtons.find((b) => b.getAttribute("type") === "submit") ??
      signInButtons[0];

    // Submit the form which should POST to our auth API.
    await userEvent.click(submitButton);

    // Wait for the network POST to be invoked with expected endpoint and method.
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signin",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    // After successful signin we expect the component to call getSession, refresh session,
    // and navigate the user to the dashboard.
    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows server error when signin fails and does not redirect", async () => {
    // Simulate server returning an error for signin attempt.
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    // Fill and submit with bad credentials.
    await userEvent.type(screen.getByLabelText(/Email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "wrongpass");

    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    const submitButton =
      signInButtons.find((b) => b.getAttribute("type") === "submit") ??
      signInButtons[0];

    await userEvent.click(submitButton);

    // Server error should be shown and no navigation or session refresh should occur.
    const errNode = await screen.findByText(/Invalid credentials/i);
    expect(errNode).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("initiates Google OAuth when clicking the Google button", async () => {
    // Render and click the OAuth button which should call signInWithOAuth.
    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    const googleBtn = screen.getByRole("button", {
      name: /Sign in with Google/i,
    });
    await userEvent.click(googleBtn);

    // signInWithOAuth should be invoked with provider 'google' and a redirect URL.
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "google",
          options: expect.objectContaining({
            redirectTo: expect.stringContaining("/api/auth/callback/google"),
          }),
        }),
      );
    });
  });

  it("links to Forgot Password and Sign Up have correct hrefs (no router push)", async () => {
    // Clicking anchors doesn't trigger next/router.push in JSDOM by default.
    // Assert anchor hrefs to verify navigation targets are correct.
    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    const forgot = screen.getByRole("link", { name: /Forgot Password\?/i });
    expect(forgot).toHaveAttribute("href", "/forgot-password");

    const signup = screen.getByRole("link", { name: /Sign Up/i });
    expect(signup).toHaveAttribute("href", "/signup");
  });
});
