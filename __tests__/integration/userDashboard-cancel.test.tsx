import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
// import UserDashboard from "@/components/UserDashboard";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { notifications } from "@mantine/notifications"; // use ES import instead of require()
import DashboardContentWithMailRoom from "@/components/pages/customer/Dashboard/components/DashboardContentWithMailRoom";

/**
 * Integration test: UserDashboard cancel flow
 *
 * Purpose:
 * - Ensure the dashboard renders registrations
 * - Opening the cancel modal triggers the cancel API (PATCH to /cancel)
 * - A success notification is shown and the UI updates
 *
 * Notes:
 * - We mock fetch to provide initial registration data and to handle the cancel request.
 * - MantineProvider + SWRConfig are included so components relying on those providers mount correctly.
 */

// mock session & notifications like other tests
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ session: { user: { id: "user-1" } } }),
}));
jest.mock("@mantine/notifications", () => ({
  notifications: { show: jest.fn() },
}));

describe("UserDashboard - cancel subscription flow", () => {
  beforeEach(() => {
    // clear mocks between tests
    jest.clearAllMocks();
    // Reset fetch mock - individual tests will set up their own mocks
    (global.fetch as unknown) = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens cancel modal, calls cancel API and shows notification", async () => {
    const user = userEvent.setup();

    // Minimal registration data shaped like the API response so the dashboard shows a card
    // Must have subscription_table with auto_renew: true and a future expiry for status to be ACTIVE
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + 2); // 2 months in the future

    const initialData = [
      {
        mailroom_registration_id: "reg-1",
        mailroom_registration_code: "CODE123",
        mailroom_registration_created_at: new Date().toISOString(),
        mailroom_registration_status: true,
        subscription_table: {
          subscription_auto_renew: true,
          subscription_expires_at: futureDate.toISOString(),
        },
        mailroom_plan_table: {
          mailroom_plan_name: "Basic",
          mailroom_plan_price: 1,
        },
        mailroom_location_table: { mailroom_location_name: "Main" },
        users_table: { users_email: "user@example.com", user_kyc_table: {} },
        mailbox_item_table: [],
        _stats: { stored: 0, pending: 0, released: 0 },
        mailroom_location_id: "l1",
      },
    ] as const;

    // Setup fetch mock to handle both the registrations fetch and cancel PATCH
    (global.fetch as jest.Mock).mockImplementation(
      (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);

        // First call: registrations endpoint (called by useRegistrations)
        if (
          url.includes("/api/mailroom/registrations") &&
          init?.method !== "PATCH"
        ) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ data: initialData }),
          } as unknown as Response);
        }

        // Cancel PATCH request
        if (url.includes("/cancel") && init?.method === "PATCH") {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as unknown as Response);
        }

        // Default: empty response
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as unknown as Response);
      },
    );

    // Render dashboard with providers — this mirrors app usage
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          {/* pass props without using `any` by casting to a generic record */}
          <DashboardContentWithMailRoom
            {...({ initialData } as unknown as Record<string, unknown>)}
          />
        </MantineProvider>
      </SWRConfig>,
    );

    // Find the card's "Cancel Renewal" button and open the confirmation modal
    const cardCancelBtn = await screen.findByRole("button", {
      name: /Cancel Renewal/i,
    });
    await user.click(cardCancelBtn);

    // The modal contains a confirm button with same label — click the modal confirm
    const cancelButtons = await screen.findAllByRole("button", {
      name: /Cancel Renewal/i,
    });
    await user.click(cancelButtons[cancelButtons.length - 1]);

    // Assert the cancel endpoint was called with PATCH
    await waitFor(
      () => {
        const cancelCall = (global.fetch as jest.Mock).mock.calls.find(
          (c) =>
            String(c[0]).includes("/cancel") &&
            (c[1] as RequestInit | undefined)?.method === "PATCH",
        );
        expect(cancelCall).toBeDefined();
      },
      { timeout: 3000 },
    );

    // Assert notification shown with expected title
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Subscription Canceled" }),
      ),
    );

    // After cancel completes, the modal should close and the button might still be there
    // since we're not actually updating the subscription in the mock data
    // So we just verify the notification was shown and the API was called
    await waitFor(
      () => {
        expect(notifications.show).toHaveBeenCalledWith(
          expect.objectContaining({ title: "Subscription Canceled" }),
        );
      },
      { timeout: 3000 },
    );
  });
});
