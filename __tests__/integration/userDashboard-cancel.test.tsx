import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import UserDashboard from "@/components/UserDashboard";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { notifications } from "@mantine/notifications"; // use ES import instead of require()

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

    // Default fetch handler: respond to cancel PATCH + other requests with a safe shape
    (global.fetch as unknown) = jest.fn(
      (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        if (url.includes("/cancel") && init?.method === "PATCH") {
          // simulate successful cancel response
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          } as unknown as Response);
        }
        // default: empty response — specific tests override this as needed
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        } as unknown as Response);
      },
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("opens cancel modal, calls cancel API and shows notification", async () => {
    // Minimal registration data shaped like the API response so the dashboard shows a card
    const initialData = [
      {
        mailroom_registration_id: "reg-1",
        mailroom_registration_code: "CODE123",
        mailroom_registration_created_at: new Date().toISOString(),
        mailroom_registration_status: true,
        subscription_table: null,
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

    // Ensure component fetch returns our registrations so the UI shows the cancel button
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ data: initialData }),
    } as unknown as Response);

    // Render dashboard with providers — this mirrors app usage
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          {/* pass props without using `any` by casting to a generic record */}
          <UserDashboard
            {...({ initialData } as unknown as Record<string, unknown>)}
          />
        </MantineProvider>
      </SWRConfig>,
    );

    // Find the card's "Cancel Renewal" button and open the confirmation modal
    const cardCancelBtn = await screen.findByRole("button", {
      name: /Cancel Renewal/i,
    });
    await userEvent.click(cardCancelBtn);

    // The modal contains a confirm button with same label — click the modal confirm
    const cancelButtons = await screen.findAllByRole("button", {
      name: /Cancel Renewal/i,
    });
    await userEvent.click(cancelButtons[cancelButtons.length - 1]);

    // Assert the cancel endpoint was called with PATCH
    await waitFor(() =>
      expect(
        (global.fetch as jest.Mock).mock.calls.some(
          (c) =>
            String(c[0]).includes("/cancel") &&
            (c[1] as RequestInit | undefined)?.method === "PATCH",
        ),
      ).toBe(true),
    );

    // Assert notification shown with expected title
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Subscription Canceled" }),
      ),
    );

    // After cancel completes the UI should no longer show the Cancel Renewal button for the card
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /Cancel Renewal/i }),
      ).toBeNull(),
    );
  });
});
