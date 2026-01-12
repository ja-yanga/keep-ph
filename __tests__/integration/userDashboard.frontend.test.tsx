import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { notifications } from "@mantine/notifications";
import DashboardContentWithMailRoom from "@/components/pages/customer/Dashboard/components/DashboardContentWithMailRoom";

/**
 * Integration tests for UserDashboard (frontend-focused).
 *
 * Covers:
 * - Rendering of summary counts and registration card content
 * - Copy-to-clipboard action and notification
 * - Pagination controls (Next/Previous) and Manage Mailbox link navigation
 *
 * Notes:
 * - Tests run in JSDOM; network requests are mocked via global.fetch.
 * - MantineProvider + SWRConfig are included so components mount as in the app.
 */

jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ session: { user: { id: "user-1" } } }),
}));
jest.mock("@mantine/notifications", () => ({
  notifications: { show: jest.fn() },
}));

describe("UserDashboard — UI: rendering, copy action, and pagination", () => {
  beforeEach(() => {
    // reset mocks and provide a clipboard stub used by the copy action
    jest.clearAllMocks();
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    // restore any mocked globals
    jest.restoreAllMocks();
  });

  it("renders summary counts, displays registration card, copies address and shows notification", async () => {
    // Arrange: single registration payload shaped like API response
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
        mailroom_location_table: {
          mailroom_location_name: "Main",
          formatted_address: "123 Main St",
        },
        users_table: { users_email: "user@example.com", user_kyc_table: {} },
        mailbox_item_table: [
          { mailbox_item_id: "i1", mailbox_item_status: "STORED" },
        ],
        _stats: { stored: 1, pending: 0, released: 0 },
        mailroom_location_id: "l1",
      },
    ] as const;

    // Mock fetch to return registrations used by component
    (global.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: initialData }),
    } as unknown as Response);

    // Act: render dashboard with providers
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <DashboardContentWithMailRoom
            {...({ initialData } as unknown as Record<string, unknown>)}
          />
        </MantineProvider>
      </SWRConfig>,
    );

    // Assert: greeting renders
    expect(await screen.findByText(/Hello, User/i)).toBeTruthy();

    // Assert: stored count shown in summary (scoped to avoid duplicate "1" matches)
    const itemsCard = await screen.findByText(/Items in Storage/i);
    // ensure we pass an HTMLElement to within()
    const itemsCardContainer = (itemsCard.closest("div") ??
      itemsCard.parentElement) as HTMLElement;
    expect(within(itemsCardContainer).getByText("1")).toBeTruthy();

    // Assert: registration card shows plan and location, and Manage Mailbox links to reg-1
    const manageLink = await screen.findByRole("link", {
      name: /Manage Mailbox/i,
    });
    // cast closest result to HTMLElement for within()
    const cardElem = (manageLink.closest('[class*="mantine-Card-root"]') ??
      manageLink.closest("div")) as HTMLElement;
    expect(within(cardElem).getByText("Basic")).toBeTruthy();
    expect(within(cardElem).getAllByText(/Main/i).length).toBeGreaterThan(0);
    expect(manageLink).toHaveAttribute(
      "href",
      expect.stringContaining("/mailroom/reg-1"),
    );

    // Act: click copy address action
    const copyBtn = screen.getByTitle("Copy full shipping address");
    await userEvent.click(copyBtn);

    // Assert: clipboard written and notification shown
    expect(navigator.clipboard.writeText).toHaveBeenCalled();
    await waitFor(() =>
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Copied" }),
      ),
    );
  });

  it("pagination: Add New Mailroom link exists and Next/Previous navigate registrations", async () => {
    // Arrange: three registrations to exercise pagination (perPage = 2)
    const now = Date.now();
    const initialData = [
      {
        mailroom_registration_id: "reg-1",
        mailroom_registration_code: "CODE1",
        mailroom_registration_created_at: new Date(now).toISOString(),
        mailroom_registration_status: true,
        subscription_table: null,
        mailroom_plan_table: {
          mailroom_plan_name: "Basic",
          mailroom_plan_price: 1,
        },
        mailroom_location_table: {
          mailroom_location_name: "Main",
          formatted_address: "123 Main St",
        },
        users_table: { users_email: "user1@example.com", user_kyc_table: {} },
        mailbox_item_table: [],
        _stats: { stored: 0, pending: 0, released: 0 },
        mailroom_location_id: "l1",
      },
      {
        mailroom_registration_id: "reg-2",
        mailroom_registration_code: "CODE2",
        mailroom_registration_created_at: new Date(now - 1000).toISOString(),
        mailroom_registration_status: true,
        subscription_table: null,
        mailroom_plan_table: {
          mailroom_plan_name: "Pro",
          mailroom_plan_price: 1,
        },
        mailroom_location_table: {
          mailroom_location_name: "Branch",
          formatted_address: "456 Branch Ave",
        },
        users_table: { users_email: "user2@example.com", user_kyc_table: {} },
        mailbox_item_table: [],
        _stats: { stored: 0, pending: 0, released: 0 },
        mailroom_location_id: "l2",
      },
      {
        mailroom_registration_id: "reg-3",
        mailroom_registration_code: "CODE3",
        mailroom_registration_created_at: new Date(now - 2000).toISOString(),
        mailroom_registration_status: true,
        subscription_table: null,
        mailroom_plan_table: {
          mailroom_plan_name: "Plus",
          mailroom_plan_price: 1,
        },
        mailroom_location_table: {
          mailroom_location_name: "Remote",
          formatted_address: "789 Remote Rd",
        },
        users_table: { users_email: "user3@example.com", user_kyc_table: {} },
        mailbox_item_table: [],
        _stats: { stored: 0, pending: 0, released: 0 },
        mailroom_location_id: "l3",
      },
    ] as const;

    // Mock fetch to return data with pagination metadata
    // The hook expects pagination in meta.pagination or directly in the response
    (global.fetch as unknown) = jest
      .fn()
      .mockImplementation((input: RequestInfo) => {
        const url = String(input);
        const searchParams = new URLSearchParams(
          url.includes("?") ? url.split("?")[1] : "",
        );
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "2", 10);
        const offset = (page - 1) * limit;
        const paginatedData = initialData.slice(offset, offset + limit);

        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: paginatedData,
            meta: {
              pagination: {
                total: initialData.length,
                limit,
                offset,
                has_more: offset + limit < initialData.length,
              },
            },
          }),
        } as unknown as Response);
      });

    // Act: render dashboard
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <DashboardContentWithMailRoom
            {...({ initialData } as unknown as Record<string, unknown>)}
          />
        </MantineProvider>
      </SWRConfig>,
    );

    // Assert: Add New link exists
    const addLink = await screen.findByRole("link", {
      name: /Add New/i,
    });
    expect(addLink).toHaveAttribute("href", "/mailroom/register");

    // Assert: pagination controls initial state (Previous disabled, Next enabled)
    const nextBtn = await screen.findByRole("button", { name: /Next/i });
    const prevBtn = await screen.findByRole("button", { name: /Previous/i });
    expect(prevBtn).toBeDisabled();
    expect(nextBtn).toBeEnabled();

    // Page 1: find a Manage Mailbox link for reg-1 among all matches
    const manageLinksPage1 = await screen.findAllByRole("link", {
      name: /Manage Mailbox/i,
    });
    const linkReg1 = manageLinksPage1.find((l) =>
      String(l.getAttribute("href")).includes("/mailroom/reg-1"),
    );
    expect(linkReg1).toBeTruthy();

    // Act: go to next page and assert reg-3 appears
    await userEvent.click(nextBtn);

    // Wait for the page to change and data to update
    await waitFor(
      () => {
        const all = screen.getAllByRole("link", { name: /Manage Mailbox/i });
        const linkReg3 = all.find((l) =>
          String(l.getAttribute("href")).includes("/mailroom/reg-3"),
        );
        expect(linkReg3).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // After data updates, previous button should be enabled
    const prevBtnAfterNext = screen.getByRole("button", { name: /Previous/i });
    await waitFor(() => expect(prevBtnAfterNext).toBeEnabled());

    // Act: return to previous page and assert reg-1 is back
    const prevBtnBeforeClick = screen.getByRole("button", {
      name: /Previous/i,
    });
    await userEvent.click(prevBtnBeforeClick);

    // Wait for the page to change and data to update
    await waitFor(
      () => {
        const all = screen.getAllByRole("link", { name: /Manage Mailbox/i });
        const linkBack = all.find((l) =>
          String(l.getAttribute("href")).includes("/mailroom/reg-1"),
        );
        expect(linkBack).toBeTruthy();
      },
      { timeout: 3000 },
    );

    // After data updates, previous button should be disabled again
    const prevBtnAfterBack = screen.getByRole("button", { name: /Previous/i });
    await waitFor(() => expect(prevBtnAfterBack).toBeDisabled());
  });
});
