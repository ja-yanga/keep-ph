import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DashboardNav from "@/components/DashboardNav";
import { MantineProvider } from "@mantine/core";

/**
 * Integration tests for DashboardNav (authenticated area).
 *
 * What it covers:
 * - Rendering of authenticated nav links (Dashboard, Register Mail Service, Referrals, Storage)
 * - Notification badge count sourced from a mocked Supabase client
 * - Realtime subscription setup via supabase.channel(...).on(...)
 * - Marking notifications as read triggers DB update (supabase.from(...).update(...))
 * - Logout flow: calls signout endpoint, supabase.auth.signOut, and redirects to /signin
 * - Nav links' hrefs are correct (register, referrals, dashboard)
 * - Includes JSDOM polyfills (ResizeObserver, matchMedia) to support Mantine components
 */

const pushMock = jest.fn();
const usePathnameMock = jest.fn();

// Mock next/navigation used by DashboardNav
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => usePathnameMock(),
}));

// Provide a stable "authenticated" session for tests
// This stub makes DashboardNav behave as if a logged-in user is present.
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "11111111-1111-4111-8111-111111111111" }, // valid UUID
      role: "user",
    },
  }),
}));

/**
 * Mock supabase client returned by createClient.
 *
 * Behavior:
 * - from('notifications').select(...).eq(...).order(...).limit(..) resolves to notificationsData
 * - from(...).update(...).eq(...).eq(...) resolves to an update result (used when marking read)
 * - channel(...).on(...).subscribe() is stubbed to simulate realtime setup
 * - auth.signOut is stubbed for logout flow
 */
const notificationsData = [
  {
    id: "n1",
    title: "One",
    message: "m1",
    type: "PACKAGE_ARRIVED",
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "n2",
    title: "Two",
    message: "m2",
    type: "PACKAGE_RELEASED",
    is_read: false,
    created_at: new Date().toISOString(),
  },
];

const limitMock = jest.fn().mockResolvedValue({ data: notificationsData });
const orderMock = jest.fn().mockReturnValue({ limit: limitMock });
const eqAfterSelectMock = jest.fn().mockReturnValue({ order: orderMock });
const selectMock = jest.fn().mockReturnValue({ eq: eqAfterSelectMock });

const updateEqSecondMock = jest.fn().mockResolvedValue({});
const updateEqFirstMock = jest.fn().mockReturnValue({ eq: updateEqSecondMock });
const updateMock = jest.fn().mockReturnValue({ eq: updateEqFirstMock });

const fromMock = jest.fn((tableName: string) => {
  if (tableName === "notifications") {
    return { select: selectMock, update: updateMock };
  }
  return { select: selectMock, update: updateMock };
});

const channelSubscribeMock = jest.fn().mockReturnValue({});
const channelOnMock = jest
  .fn()
  .mockReturnValue({ subscribe: channelSubscribeMock });
const channelMock = jest.fn().mockReturnValue({ on: channelOnMock });

const removeChannelMock = jest.fn();

const authMock = { signOut: jest.fn().mockResolvedValue({}) };

const supabaseMock = {
  from: fromMock,
  channel: channelMock,
  removeChannel: removeChannelMock,
  auth: authMock,
};

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => supabaseMock,
}));

// Polyfill ResizeObserver used by Mantine in JSDOM to avoid runtime errors.
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

// matchMedia used by some components - safe no-op implementation for tests.
if (typeof global.matchMedia === "undefined") {
  Object.defineProperty(global, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    configurable: true,
  });
}

/**
 * Test suite: DashboardNav (authenticated area)
 *
 * Covers:
 * - rendering expected user links
 * - showing unread notification counts from supabase mock
 * - realtime subscription setup
 * - marking notifications read (calls update)
 * - logout flow (calls signout endpoint, supabase.auth.signOut, and redirects)
 */
describe("DashboardNav (authenticated) — user role", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/dashboard");
    // Ensure fetch used in signout resolves
    (global.fetch as unknown) = jest.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders user nav links and shows unread notifications count", async () => {
    // Render inside MantineProvider so Mantine hooks/components work in JSDOM
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
    );

    // Assert primary nav links for authenticated user exist
    expect(await screen.findByText(/Dashboard/i)).toBeTruthy();
    expect(screen.getByText(/Register Mail Service/i)).toBeTruthy();
    expect(screen.getByText(/Referrals/i)).toBeTruthy();
    expect(screen.getByText(/Storage/i)).toBeTruthy();

    // Notifications: the mock returns 2 unread -> badge displays "2"
    expect(await screen.findByText("2")).toBeTruthy();

    // Realtime subscription should be wired (channel.on called)
    expect(channelMock).toHaveBeenCalled();
    expect(channelOnMock).toHaveBeenCalled();
  });

  it("marks notifications as read when popover is closed and calls DB update", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
    );

    // Open notifications popover (ActionIcon uses aria-label="notifications")
    const notifBtn = await screen.findByLabelText("notifications");
    await userEvent.click(notifBtn);

    // Close the popover (toggle)
    await userEvent.click(notifBtn);

    // Expect mark-as-read flow to call supabase.from(...).update(...) with is_read: true
    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ is_read: true });
      expect(updateEqFirstMock).toHaveBeenCalled(); // .eq("user_id", userId)
      expect(updateEqSecondMock).toHaveBeenCalled(); // .eq("is_read", false)
    });
  });

  it("logs out: calls signout endpoint, supabase.auth.signOut and redirects to signin", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
    );

    // Trigger logout control
    const logoutBtn = screen.getByRole("button", { name: /Logout/i });
    await userEvent.click(logoutBtn);

    // Confirm signout network call and supabase auth signOut were invoked and user redirected
    await waitFor(() =>
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0),
    );
    expect(authMock.signOut).toHaveBeenCalled();
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
  });

  it("nav links point to expected routes (hrefs) or trigger router.push", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
    );

    // Check anchors' href attributes when rendered as links
    const registerLink = screen
      .getByText(/Register Mail Service/i)
      .closest("a");
    expect(registerLink).toBeTruthy();
    expect(String(registerLink?.getAttribute("href"))).toContain(
      "/mailroom/register",
    );

    const referralsLink = screen.getByText(/Referrals/i).closest("a");
    expect(referralsLink).toBeTruthy();
    expect(String(referralsLink?.getAttribute("href"))).toContain("/referrals");

    // Dashboard is rendered as a Link/anchor; assert href instead of clicking (avoid JSDOM navigation)
    const dashboardLink = screen.getByText(/Dashboard/i).closest("a");
    expect(dashboardLink).toBeTruthy();
    expect(String(dashboardLink?.getAttribute("href"))).toContain("/dashboard");
  });
});
