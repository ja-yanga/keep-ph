import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Integration tests for AccountAddresses component.

  Purpose:
  - Verify UI flows for listing, creating, editing, and deleting user addresses.
  - Ensure correct requests are made to the API and user feedback (notifications, modal behavior) occurs.

  Test strategy:
  - Mock SessionProvider to provide a stable authenticated session.
  - Mock @mantine/notifications so tests can assert notifications were shown.
  - Mock global.fetch per-test to return deterministic responses; some mocks are stateful to simulate server state changes.
  - Render the component inside MantineProvider to match runtime styling and behavior.
*/

jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: { user: { id: "user-123", email: "user@example.com" } },
    refresh: jest.fn(),
  }),
}));

// Mock notifications.show to capture calls without relying on external UI
jest.mock("@mantine/notifications", () => ({
  notifications: { show: jest.fn() },
}));

import { notifications } from "@mantine/notifications";
import AccountAddresses from "@/components/pages/customer/Account/AddressesTab";

describe("AccountAddresses integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Reset mocks and preserve original fetch to restore later
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore global.fetch to avopsid leaking mocks between tests
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("shows empty state and validation when saving without required fields", async () => {
    // Mock GET /api/user/addresses -> empty list
    const fetchMock = jest.fn(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/user/addresses")) {
          if (!init || !init.method || init.method === "GET") {
            return {
              ok: true,
              json: async () => ({ data: [] }),
            } as unknown as Response;
          }
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <AccountAddresses userId="user-123" />
      </MantineProvider>,
    );

    // Confirm empty state is shown
    expect(
      await screen.findByText(/You haven't saved any addresses yet/i),
    ).toBeInTheDocument();

    // Open the Add modal and assert Save is disabled when required inputs are empty
    await userEvent.click(
      screen.getByRole("button", { name: /Add New Address/i }),
    );
    const saveBtn = await screen.findByRole("button", {
      name: /Save Address/i,
    });
    expect(saveBtn).toBeDisabled();

    // No notification should be shown when Save is disabled
    await waitFor(() => {
      expect(notifications.show).not.toHaveBeenCalled();
    });
  });

  it("creates a new address (POST) and reloads list", async () => {
    // Simulated created address payload (shape matches API)
    const created = {
      user_address_id: "addr-1",
      user_address_label: "Home",
      user_address_line1: "123 Street",
      user_address_line2: "Unit 4",
      user_address_city: "Quezon City",
      user_address_region: "Metro Manila",
      user_address_postal: "1100",
      user_address_is_default: true,
    };

    // Stateful fetch mock: POST populates `current`, subsequent GET returns it
    let current: Record<string, unknown>[] = [];
    const fetchMock = jest.fn(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/api/user/addresses") && init?.method === "POST") {
          current = [created];
          return {
            ok: true,
            json: async () => ({ data: created }),
          } as unknown as Response;
        }
        if (url.includes("/api/user/addresses")) {
          return {
            ok: true,
            json: async () => ({ data: current }),
          } as unknown as Response;
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <AccountAddresses userId="user-123" />
      </MantineProvider>,
    );

    // Open modal, fill inputs, and save
    await userEvent.click(
      await screen.findByRole("button", { name: /Add New Address/i }),
    );
    await userEvent.type(
      await screen.findByLabelText(/Address Label/i),
      "Home",
    );
    await userEvent.type(
      await screen.findByLabelText(/Address Line 1/i),
      "123 Street",
    );
    await userEvent.type(await screen.findByLabelText(/City/i), "Quezon City");
    await userEvent.type(
      await screen.findByLabelText(/Region/i),
      "Metro Manila",
    );
    await userEvent.type(await screen.findByLabelText(/Postal Code/i), "1100");
    await userEvent.click(
      await screen.findByRole("button", { name: /Save Address/i }),
    );

    // Assert POST request was made with JSON header
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/addresses",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // Notification should be shown and modal should close
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Success" }),
      );
      expect(
        screen.queryByRole("button", { name: /Save Address/i }),
      ).not.toBeInTheDocument();
    });

    // New address appears in the list
    expect(await screen.findByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/123 Street/i)).toBeInTheDocument();
  });

  it("edits an existing address (PUT) and reloads list", async () => {
    const existing = {
      id: "addr-2",
      label: "Office",
      line1: "5 Office Rd",
      line2: "",
      city: "Makati",
      region: "Metro Manila",
      postal: "1200",
      is_default: false,
    };

    const updated = { ...existing, label: "Office HQ" };

    // Stateful fetch: initial GET returns existing; PUT updates `current` to updated
    let current: Record<string, unknown>[] = [existing];
    const fetchMock = jest.fn(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (
          url.includes("/api/user/addresses") &&
          (!init || init.method === "GET")
        ) {
          return {
            ok: true,
            json: async () => ({ data: current }),
          } as unknown as Response;
        }
        if (
          url.includes(
            `/api/user/addresses/${encodeURIComponent(existing.id)}`,
          ) &&
          init?.method === "PUT"
        ) {
          current = [updated];
          return {
            ok: true,
            json: async () => ({ data: updated }),
          } as unknown as Response;
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <AccountAddresses userId="user-123" />
      </MantineProvider>,
    );

    // Click edit on the rendered address and update the label
    const editBtns = await screen.findAllByLabelText("Edit address");
    await userEvent.click(editBtns[0]);

    const labelInput = await screen.findByLabelText(/Address Label/i);
    expect((labelInput as HTMLInputElement).value).toBe("Office");

    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, "Office HQ");
    await userEvent.click(
      await screen.findByRole("button", { name: /Save Address/i }),
    );

    // Assert PUT to the specific id was called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/user/addresses/${encodeURIComponent(existing.id)}`,
        expect.objectContaining({
          method: "PUT",
          headers: { "Content-Type": "application/json" },
        }),
      );
    });

    // Notification and updated list entry should appear
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Success" }),
      );
    });
    expect(await screen.findByText(/Office HQ/i)).toBeInTheDocument();
  });

  it("deletes an address (DELETE) and reloads list", async () => {
    const addr = {
      id: "addr-3",
      label: "Old Place",
      line1: "77 Old St",
      line2: "",
      city: "Pasig",
      region: "Metro Manila",
      postal: "1600",
      is_default: false,
    };

    // Stateful fetch: initial GET returns addr; DELETE clears current
    let current: Record<string, unknown>[] = [addr];
    const fetchMock = jest.fn(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (
          url.includes("/api/user/addresses") &&
          (!init || init.method === "GET")
        ) {
          return {
            ok: true,
            json: async () => ({ data: current }),
          } as unknown as Response;
        }
        if (
          url.includes(`/api/user/addresses/${encodeURIComponent(addr.id)}`) &&
          init?.method === "DELETE"
        ) {
          current = [];
          return {
            ok: true,
            json: async () => ({ ok: true }),
          } as unknown as Response;
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <MantineProvider>
        <AccountAddresses userId="user-123" />
      </MantineProvider>,
    );

    // Ensure address shows, then trigger delete flow and confirm
    expect(await screen.findByText(/Old Place/i)).toBeInTheDocument();

    const deleteBtns = screen.getAllByLabelText("Delete address");
    await userEvent.click(deleteBtns[0]);

    const delBtn = await screen.findByRole("button", { name: /^Delete$/i });
    await userEvent.click(delBtn);

    // Assert DELETE request and Deleted notification
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/user/addresses/${encodeURIComponent(addr.id)}`,
        expect.objectContaining({ method: "DELETE" }),
      );
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Deleted" }),
      );
    });

    // Verify the list reloaded and empty state is shown
    expect(
      await screen.findByText(/You haven't saved any addresses yet/i),
    ).toBeInTheDocument();
  });
});
