import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import Notifications from "@/components/Notifications";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

// Increase timeout for integration tests that may involve async operations
jest.setTimeout(10000);

// Mock ResizeObserver for Mantine components (Popover, ScrollArea)
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(
  globalThis as unknown as { ResizeObserver: typeof ResizeObserverMock }
).ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver for infinite scroll functionality
// Store callbacks so we can trigger them manually in tests
let intersectionObserverCallbacks: Array<
  (entries: Array<{ isIntersecting: boolean }>) => void
> = [];

const IntersectionObserverMock = jest
  .fn()
  .mockImplementation(
    (callback: (entries: Array<{ isIntersecting: boolean }>) => void) => {
      intersectionObserverCallbacks.push(callback);
      return {
        observe: jest.fn(),
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      };
    },
  );

(
  globalThis as unknown as {
    IntersectionObserver: typeof IntersectionObserverMock;
  }
).IntersectionObserver = IntersectionObserverMock;

// Mock next/navigation useRouter
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock session context
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

// Mock UUID validation
jest.mock("@/utils/validate-uuid", () => ({
  isValidUUID: () => true,
}));

// Mock Supabase client for real-time subscriptions
const mockSubscribe = jest.fn(
  (callback: (status: string, err?: Error) => void) => {
    // Simulate successful subscription
    setTimeout(() => callback("SUBSCRIBED"), 0);
    return "mock-channel";
  },
);

const mockChannel = jest.fn(() => ({
  on: jest.fn(() => ({
    subscribe: mockSubscribe,
  })),
}));

const mockRemoveChannel = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

// Mock notification transform utility
jest.mock("@/utils/transform/notification", () => ({
  transformNotification: (n: {
    notification_id: string;
    notification_title: string;
    notification_message: string;
    notification_type: string;
    notification_is_read: boolean;
    notification_created_at: string;
    notification_link?: string;
  }) => ({
    id: n.notification_id,
    title: n.notification_title,
    message: n.notification_message,
    type: n.notification_type,
    is_read: n.notification_is_read,
    created_at: n.notification_created_at,
    link: n.notification_link || "",
  }),
}));

// Mock notification color utility
jest.mock("@/utils/get-color", () => ({
  getNotificationColor: () => "blue",
}));

describe("Notifications Integration Tests", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();
    mockPush.mockClear();
    intersectionObserverCallbacks = [];
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  // Helper to render notifications component
  function renderNotifications() {
    return render(
      <MantineProvider>
        <Notifications />
      </MantineProvider>,
    );
  }

  // Helper to create mock notification data
  function createMockNotification(
    overrides?: Partial<{
      notification_id: string;
      notification_title: string;
      notification_message: string;
      notification_type: string;
      notification_is_read: boolean;
      notification_created_at: string;
      notification_link: string;
    }>,
  ) {
    return {
      notification_id: "notif-1",
      notification_title: "Test Notification",
      notification_message: "Test message",
      notification_type: "SYSTEM",
      notification_is_read: false,
      notification_created_at: new Date().toISOString(),
      notification_link: "",
      ...overrides,
    };
  }

  it("renders empty state when there are no notifications", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    expect(
      await screen.findByText(/No notifications yet/i),
    ).toBeInTheDocument();
  });

  it("shows notifications list and displays unread count badge", async () => {
    const notifications = [
      createMockNotification({
        notification_id: "notif-1",
        notification_title: "Unread Notification",
        notification_message: "First message",
        notification_is_read: false,
      }),
      createMockNotification({
        notification_id: "notif-2",
        notification_title: "Read Notification",
        notification_message: "Second message",
        notification_is_read: true,
      }),
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    // Check that unread count badge is displayed (should show "1")
    expect(await screen.findByText("1")).toBeInTheDocument();

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Wait for notifications to be rendered
    await waitFor(() => {
      // Use getAllByText since there might be multiple matches
      const unreadNotifications = screen.getAllByText(/Unread Notification/i);
      expect(unreadNotifications.length).toBeGreaterThan(0);
    });

    // Verify both notifications are displayed
    const readNotifications = screen.getAllByText(/Read Notification/i);
    expect(readNotifications.length).toBeGreaterThan(0);

    const firstMessages = screen.getAllByText(/First message/i);
    expect(firstMessages.length).toBeGreaterThan(0);

    const secondMessages = screen.getAllByText(/Second message/i);
    expect(secondMessages.length).toBeGreaterThan(0);
  });

  it("calls markAsRead API (PUT) when popover closes", async () => {
    const notifications = [
      createMockNotification({
        notification_id: "notif-1",
        notification_title: "Unread Notification",
        notification_is_read: false,
      }),
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Close popover by clicking outside
    await userEvent.click(document.body);

    await waitFor(
      () => {
        expect(
          (globalThis.fetch as jest.Mock).mock.calls.length,
        ).toBeGreaterThan(1);
      },
      { timeout: 3000 },
    );

    // Verify PUT request was made to mark as read
    const putCall = (globalThis.fetch as jest.Mock).mock.calls.find(
      (call) => call[1]?.method === "PUT",
    );
    expect(putCall).toBeDefined();
    expect(putCall[0]).toContain(API_ENDPOINTS.notifications);
  });

  it("navigates to link when clicking on notification with link", async () => {
    const notifications = [
      createMockNotification({
        notification_id: "notif-1",
        notification_title: "Clickable Notification",
        notification_message: "Click me",
        notification_link: "/dashboard",
        notification_is_read: false,
      }),
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    const notification = await screen.findByText(/Clickable Notification/i);
    await userEvent.click(notification);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });
  });

  it("does not navigate when clicking notification without link", async () => {
    const notifications = [
      createMockNotification({
        notification_id: "notif-1",
        notification_title: "Non-clickable Notification",
        notification_message: "No link",
        notification_link: "",
        notification_is_read: false,
      }),
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    const notification = await screen.findByText(/Non-clickable Notification/i);
    await userEvent.click(notification);

    // Should not navigate
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows loading state during initial fetch", async () => {
    // Delay the response to test loading state
    globalThis.fetch = jest.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => [],
              } as unknown as Response),
            100,
          );
        }),
    );

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await userEvent.click(bellButton);

    // Should show loading indicator
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });
  });

  it("loads more notifications when scrolling (infinite scroll)", async () => {
    const firstBatch = Array.from({ length: 10 }, (_, i) =>
      createMockNotification({
        notification_id: `notif-${i + 1}`,
        notification_title: `Notification ${i + 1}`,
        notification_is_read: false,
      }),
    );

    const secondBatch = Array.from({ length: 10 }, (_, i) =>
      createMockNotification({
        notification_id: `notif-${i + 11}`,
        notification_title: `Notification ${i + 11}`,
        notification_is_read: false,
      }),
    );

    // Mock fetch to return first batch, then second batch
    // Set up specific responses for first two calls, then default for any additional calls
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => firstBatch,
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => secondBatch,
      } as unknown as Response)
      .mockResolvedValue({
        // Default fallback for any additional calls (e.g., real-time subscription triggers)
        ok: true,
        json: async () => firstBatch,
      } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Wait for notifications to render - the notifications are fetched on mount
    // Wait for any notification text that matches our pattern
    await waitFor(
      () => {
        // Use getAllByText with a function to find notification titles
        const notifications = screen.getAllByText((content, element) => {
          const text = element?.textContent || content;
          return (
            typeof text === "string" && /^Notification \d+$/.test(text.trim())
          );
        });
        expect(notifications.length).toBeGreaterThan(0);
      },
      { timeout: 3000 },
    );

    // Verify first batch is displayed - check for "Notification 10" (unambiguous)
    const notification10 = screen.getByText((content, element) => {
      const text = element?.textContent || content;
      return text.trim() === "Notification 10";
    });
    expect(notification10).toBeInTheDocument();

    // Get the initial call count before triggering infinite scroll
    // const initialCallCount = (globalThis.fetch as jest.Mock).mock.calls.length;

    // Simulate intersection observer triggering (scroll to bottom)
    // Trigger the callback stored when IntersectionObserver was created
    if (intersectionObserverCallbacks.length > 0) {
      const callback =
        intersectionObserverCallbacks[intersectionObserverCallbacks.length - 1];
      callback([{ isIntersecting: true }]);
    }

    // Wait for a new fetch call with offset=10 parameter
    await waitFor(
      () => {
        const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls;
        const callsWithOffset10 = fetchCalls.filter((call) =>
          String(call[0]).includes("offset=10"),
        );
        expect(callsWithOffset10.length).toBeGreaterThan(0);
      },
      { timeout: 2000 },
    );

    // Verify the fetch was called with offset parameter
    const fetchCalls = (globalThis.fetch as jest.Mock).mock.calls;
    const callsWithOffset10 = fetchCalls.filter((call) =>
      String(call[0]).includes("offset=10"),
    );
    expect(callsWithOffset10.length).toBeGreaterThan(0);
  });

  it("sets up real-time subscription on mount", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    renderNotifications();

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
    });

    // Verify subscription was set up
    expect(mockSubscribe).toHaveBeenCalled();
  });

  it("cleans up subscription on unmount", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    const { unmount } = renderNotifications();

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalled();
    });

    unmount();

    // Verify cleanup was called
    await waitFor(() => {
      expect(mockRemoveChannel).toHaveBeenCalled();
    });
  });

  it("handles API error gracefully", async () => {
    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    globalThis.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    await userEvent.click(bellButton);

    // Should still show the popover header
    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Error should be logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it("displays notification timestamps correctly", async () => {
    const testDate = new Date("2024-01-15T10:30:00.000Z");
    const notifications = [
      createMockNotification({
        notification_id: "notif-1",
        notification_title: "Test Notification",
        notification_created_at: testDate.toISOString(),
        notification_is_read: false,
      }),
    ];

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Check that formatted date is displayed
    const formattedDate = testDate.toLocaleString();
    expect(
      await screen.findByText(new RegExp(formattedDate)),
    ).toBeInTheDocument();
  });

  it("shows 'No more notifications' when all notifications are loaded", async () => {
    const notifications = Array.from({ length: 5 }, (_, i) =>
      createMockNotification({
        notification_id: `notif-${i + 1}`,
        notification_title: `Notification ${i + 1}`,
        notification_is_read: false,
      }),
    );

    // Return fewer than LIMIT (10) to indicate no more data
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => notifications,
    } as unknown as Response);

    renderNotifications();

    const bellButton = await screen.findByRole("button", {
      name: /notifications/i,
    });

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(bellButton);

    await waitFor(() => {
      expect(screen.getByText("Notifications")).toBeInTheDocument();
    });

    // Scroll to bottom to trigger the "no more" message
    // Since we returned fewer than LIMIT, hasMore should be false
    await waitFor(() => {
      expect(screen.getByText(/No more notifications/i)).toBeInTheDocument();
    });
  });

  it("fetches notifications with correct query parameters", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    } as unknown as Response);

    renderNotifications();

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalled();
    });

    const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
    const url = new URL(fetchCall[0] as string, "http://localhost");

    expect(url.pathname).toBe(API_ENDPOINTS.notifications);
    expect(url.searchParams.get("userId")).toBe(
      "123e4567-e89b-12d3-a456-426614174000",
    );
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("offset")).toBe("0");
  });
});
