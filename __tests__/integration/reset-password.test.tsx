import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Mocks and spies:
  - pushMock: observe client navigation (next/navigation)
  - authMocks: supabase auth methods used by UpdatePasswordForm
  - notifShow: notifications.show spy to assert user-facing messages
*/
const pushMock = jest.fn();

const authMocks = {
  getSession: jest.fn(),
  setSession: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};

// next/navigation mock
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// supabase client mock
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: authMocks }),
}));

// (no notifications mock to avoid jest hoisting/TDZ issues)

import UpdatePasswordForm from "@/components/UpdatePasswordForm";

describe("UpdatePasswordForm integration", () => {
  const originalHash = window.location.hash;

  beforeEach(() => {
    jest.clearAllMocks();
    // default: no existing session
    authMocks.getSession.mockResolvedValue({ data: { session: null } });
  });

  afterEach(() => {
    // restore location hash to avoid leaking between tests
    window.location.hash = originalHash;
  });

  it("accepts token from URL hash, sets session, updates password, signs out and redirects", async () => {
    // simulate recovery tokens present in URL hash
    window.location.hash = "#access_token=ACCESS123&refresh_token=REF123";

    // setSession resolves => component proceeds to render the form
    authMocks.setSession.mockResolvedValue({ error: null });
    // updateUser resolves => update success
    authMocks.updateUser.mockResolvedValue({ error: null });
    authMocks.signOut.mockResolvedValue(null);

    render(
      <MantineProvider>
        <UpdatePasswordForm />
      </MantineProvider>,
    );

    // wait for the password input to appear after verification completes
    const pwInput = await screen.findByLabelText(/New Password/i);
    await userEvent.type(pwInput, "new-secure-pass");
    await userEvent.click(
      screen.getByRole("button", { name: /Update Password/i }),
    );

    // assert supabase updateUser was called with the provided password
    await waitFor(() => {
      expect(authMocks.updateUser).toHaveBeenCalledWith({
        password: "new-secure-pass",
      });
    });

    // signOut should be attempted and router should redirect to signin with pw_reset flag
    await waitFor(() => {
      expect(authMocks.signOut).toHaveBeenCalled();
      expect(pushMock).toHaveBeenCalledWith("/signin?pw_reset=1");
    });
  });

  it("shows notification and redirects when setSession fails (invalid/expired token)", async () => {
    window.location.hash = "#access_token=BAD&refresh_token=BAD";

    // simulate setSession returning an error
    authMocks.setSession.mockResolvedValueOnce({
      error: { message: "Invalid token" },
    });

    render(
      <MantineProvider>
        <UpdatePasswordForm />
      </MantineProvider>,
    );

    // expect redirect to signin when setSession fails (invalid/expired token)
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/signin");
    });
  });
});
