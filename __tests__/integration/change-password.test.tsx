import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { Provider } from "react-redux";
import { configureStore, EnhancedStore } from "@reduxjs/toolkit";

/*
  Integration tests for AccountContent -> change password flow.

  - Wrap AccountContent with a minimal Redux provider so components using
    useAppSelector / useAppDispatch do not throw in tests.
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

import AccountContent from "@/components/pages/customer/Account/index";

const initialUserState = {
  kycDetails: {
    kyc: null,
    error: null,
    success: null,
    loading: false,
  },
  addressDetails: {
    addresses: [],
    loading: false,
    error: null,
  },
};

function userReducer(state = initialUserState) {
  return state;
}

function createTestStore(): EnhancedStore {
  return configureStore({
    reducer: {
      user: userReducer,
    },
    preloadedState: {
      user: initialUserState,
    },
  });
}

describe("AccountContent — change password", () => {
  let originalFetch: typeof globalThis.fetch | undefined;
  let store: EnhancedStore;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
    store = createTestStore();
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("validates, confirms and successfully updates password", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ message: "Password updated successfully" }),
    }) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <Provider store={store}>
        <MantineProvider>
          <AccountContent />
        </MantineProvider>
      </Provider>,
    );

    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "old-pass-1A",
    );
    const newPwFields = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields[0], "NewPass1A");
    await userEvent.type(newPwFields[1], "NewPass1A");

    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );

    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Update/i,
    });
    await userEvent.click(confirmBtn);

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

    const successAlert = await screen.findByText(
      /Password updated successfully/i,
    );
    expect(successAlert).toBeInTheDocument();

    const pwInputs = scoped.getAllByLabelText(
      /Password/i,
    ) as HTMLInputElement[];
    expect(pwInputs[0].value).toBe("");
    expect(pwInputs[1].value).toBe("");
    expect(pwInputs[2].value).toBe("");
  });

  it("shows error alert when server returns error", async () => {
    (globalThis.fetch as jest.Mock) = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Current password incorrect" }),
    });

    render(
      <Provider store={store}>
        <MantineProvider>
          <AccountContent />
        </MantineProvider>
      </Provider>,
    );

    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "bad-old-pass1A",
    );
    const newPwFields2 = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields2[0], "NewPass1A");
    await userEvent.type(newPwFields2[1], "NewPass1A");

    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Update/i,
    });
    await userEvent.click(confirmBtn);

    const errAlert = await screen.findByRole("alert");
    expect(errAlert).toHaveTextContent(/Current password incorrect/i);
  });

  it("shows validation error when new password doesn't meet requirements", async () => {
    render(
      <Provider store={store}>
        <MantineProvider>
          <AccountContent />
        </MantineProvider>
      </Provider>,
    );

    const securityTab = screen.getByRole("tab", { name: /Security/i });
    await userEvent.click(securityTab);

    const panelId = securityTab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : document.body;
    const scoped = within(panel as HTMLElement);

    await userEvent.type(
      scoped.getByLabelText(/Current Password/i),
      "old-pass-1A",
    );
    const newPwFields = scoped.getAllByLabelText(/New Password/i);
    await userEvent.type(newPwFields[0], "weak");
    await userEvent.type(newPwFields[1], "weak");

    await userEvent.click(
      scoped.getByRole("button", { name: /Update Password/i }),
    );

    const err = await screen.findByText(/Password is too weak/i);
    expect(err).toBeInTheDocument();
  });
});
