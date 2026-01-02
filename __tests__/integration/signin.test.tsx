import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

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
*/
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => ({ get: () => null }),
}));

/*
  Mock the supabase client factory used by the component so tests don't call real supabase.
*/
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: getSessionMock, signInWithOAuth: mockSignInWithOAuth },
  }),
}));

/*
  Mock SessionProvider hook so we can assert refresh() was invoked after login.
*/
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ refresh: refreshMock }),
}));

import SignInForm from "@/components/SignInForm";

describe("SignInForm integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
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
    // Render the real SignInForm inside MantineProvider so Mantine components work.
    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    // user fills email & password
    await userEvent.type(screen.getByLabelText(/Email/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "password123");

    // pick submit button deterministically (there is also an OAuth button with same label)
    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    const submitButton =
      signInButtons.find((b) => b.getAttribute("type") === "submit") ??
      signInButtons[0];

    // click submit -> component should POST to /api/auth/signin
    await userEvent.click(submitButton);

    // assert network call occurred
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/auth/signin",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    // after success the component should attempt to refresh session and navigate
    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalled();
      expect(refreshMock).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("shows server error when signin fails and does not redirect", async () => {
    // override fetch to simulate server-side auth failure
    (globalThis.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    await userEvent.type(screen.getByLabelText(/Email/i), "bad@example.com");
    await userEvent.type(screen.getByLabelText(/Password/i), "wrongpass");

    const signInButtons = screen.getAllByRole("button", { name: /Sign In/i });
    const submitButton =
      signInButtons.find((b) => b.getAttribute("type") === "submit") ??
      signInButtons[0];

    await userEvent.click(submitButton);

    // expect the server-provided error to appear and no redirect to occur
    const errNode = await screen.findByText(/Invalid credentials/i);
    expect(errNode).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("initiates Google OAuth when clicking the Google button", async () => {
    // Render and click the OAuth button
    render(
      <MantineProvider>
        <SignInForm />
      </MantineProvider>,
    );

    const googleBtn = screen.getByRole("button", {
      name: /Sign in with Google/i,
    });
    await userEvent.click(googleBtn);

    // assert signInWithOAuth was invoked with expected provider and redirect path
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
});
