import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// Increase the default Jest timeout to avoid flaky tests that may sometimes take longer
jest.setTimeout(10000);

// JSDOM doesn't implement ResizeObserver which Mantine's Popover/ScrollArea use.
// Provide a minimal mock so components can mount and tests don't throw errors due to missing API.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// We need this in tests because JSDOM lacks ResizeObserver used by Mantine components.
(
  globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }
).ResizeObserver = ResizeObserverMock;

// Mock next/navigation useRouter to prevent Next.js router methods from failing or affecting test navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock session context to be a logged in user; prevents session loading logic in tests
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "user@example.com",
      },
      role: "user",
    },
    refresh: jest.fn(),
  }),
}));

// Local SessionProvider import alias for some environments/tests
jest.mock("../SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: {
        id: "123e4567-e89b-12d3-a456-426614174000",
        email: "user@example.com",
      },
      role: "user",
    },
    refresh: jest.fn(),
  }),
}));

// Mock UUID validation utils, always treating any string as a valid UUID for convenience in test cases
jest.mock("@/utils/validate-uuid", () => ({
  isValidUUID: () => true,
}));

// Mock supabase channel creation (realtime notification setup); allows for channel lifecycle tracking if needed
const mockChannel = jest.fn(() => ({
  on: jest.fn(() => ({
    subscribe: jest.fn(() => "mock-channel"),
  })),
}));
const mockRemoveChannel = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

// Transform notification mock to just passthrough the object in tests so mapping logic is bypassed
jest.mock("@/utils/transform/notification", () => ({
  transformNotification: (n: unknown) => n,
}));

// Always return the same color for notification items for test predictability
jest.mock("@/utils/get-color", () => ({
  getNotificationColor: () => "blue",
}));

import Notifications from "./index";

describe("Notifications component", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Save the original fetch to restore after each test to avoid cross-test pollution
    originalFetch = globalThis.fetch;
    // Reset all jest mocks to clear call history and mock state before each test runs
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore the original fetch function if it was replaced in the test
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders empty state when there are no notifications", async () => {
    // Mock the fetch call to return empty notifications array
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    // Render Notifications inside MantineProvider as it uses Mantine hooks/components
    render(
      <MantineProvider>
        <Notifications />
      </MantineProvider>,
    );

    // Get the notifications bell button by accessible role and name
    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    // Wait for the initial fetch request to complete (should only be called once for this test)
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    // Simulate user clicking the bell to open the notifications popover
    await userEvent.click(bellButton);

    // Wait until the popover is visible in the DOM (checking by Notifications header/title text)
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // There should be a message indicating no notifications when the list is empty
    expect(
      await screen.findByText(/No notifications yet/i),
    ).toBeInTheDocument();
  });

  it("shows notifications list and unread count", async () => {
    // Mock fetch to return two notifications: one unread and one read
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "1",
          title: "Unread notification",
          message: "First message",
          created_at: "2024-01-01T00:00:00.000Z",
          is_read: false,
          type: "info",
          link: "/somewhere",
        },
        {
          id: "2",
          title: "Read notification",
          message: "Second message",
          created_at: "2024-01-02T00:00:00.000Z",
          is_read: true,
          type: "info",
          link: null,
        },
      ],
    } as unknown as Response);

    render(
      <MantineProvider>
        <Notifications />
      </MantineProvider>,
    );

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    // Wait for notifications fetch to be called once
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    // Should show the unread badge with correct count ("1") before opening the popover
    expect(await screen.findByText("1")).toBeInTheDocument();

    // Simulate user opening the popover
    await userEvent.click(bellButton);

    // Wait for the popover to be visible by checking for the header
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Should show the unread notification title (text match is case-insensitive)
    expect(await screen.findByText(/Unread notification/i)).toBeInTheDocument();

    // There should be a read notification as well (getAllByText since there could be multiple)
    // We expect at least one occurrence of "Read notification"
    const readNotifications = screen.getAllByText(/Read notification/i);
    expect(readNotifications.length).toBeGreaterThanOrEqual(1);

    // The message of the read notification should be present as well, confirming correct rendering
    expect(screen.getByText(/Second message/i)).toBeInTheDocument();
  });

  it("calls markAsRead (PUT) when popover closes", async () => {
    // Setup fetch mock to return one unread notification on fetch
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "1",
          title: "Unread notification",
          message: "First message",
          created_at: "2024-01-01T00:00:00.000Z",
          is_read: false,
          type: "info",
          link: null,
        },
      ],
    } as unknown as Response);

    render(
      <MantineProvider>
        <Notifications />
      </MantineProvider>,
    );

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    // Initial fetch; ensure only fetched once for list load
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    // Open the popover to see available notifications (triggers UI to show)
    await userEvent.click(bellButton);

    // Confirm that the popover is now in the DOM
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Close popover by clicking outside (typically document body); triggers markAsRead API call if there are unread
    await userEvent.click(document.body);

    // Wait until PUT request is fired to mark notifications as read
    await waitFor(
      () => {
        // There should now be more than one fetch call: initial GET and markAsRead PUT
        expect(
          (globalThis.fetch as jest.Mock).mock.calls.length,
        ).toBeGreaterThan(1);
      },
      { timeout: 3000 },
    );

    // Assert that the second fetch call (after opening and closing) was a PUT (which marks as read)
    const secondCall = (globalThis.fetch as jest.Mock).mock.calls[1];
    expect(secondCall[1]).toMatchObject({ method: "PUT" });
  });
});
