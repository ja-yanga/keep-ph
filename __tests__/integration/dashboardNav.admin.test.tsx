import React from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import PrivateNavigationHeader from "@/components/Layout/PrivateNavigationHeader";

// mock next/navigation and session BEFORE importing PrivateNavigationHeader so client hooks don't run
const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/admin/dashboard",
}));

jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "admin-1", email: "admin@example.com" },
      role: "admin",
    },
    refresh: jest.fn(),
  }),
}));

// mock supabase client to avoid requiring real env vars during import
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: jest.fn(), user: null },
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

// Minimal polyfills for Mantine in JSDOM
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});
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

describe("PrivateNavigationHeader (admin) — admin role", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders admin navigation items", async () => {
    render(
      <MantineProvider>
        <PrivateNavigationHeader />
      </MantineProvider>,
    );

    // admin-specific items expected in the nav
    expect(await screen.findByText(/Dashboard/i)).toBeTruthy();
    expect(screen.getByText(/KYC/i)).toBeTruthy();
    expect(screen.getByText(/Locations/i)).toBeTruthy();
    expect(screen.getByText(/Lockers/i)).toBeTruthy();
    expect(screen.getByText(/Mailrooms/i)).toBeTruthy();
    expect(screen.getByText(/Packages/i)).toBeTruthy();
    expect(screen.getByText(/Plans/i)).toBeTruthy();
    expect(screen.getByText(/Rewards/i)).toBeTruthy();
    expect(screen.getByText(/Stats/i)).toBeTruthy();
    expect(screen.getByText(/Users/i)).toBeTruthy();
  });

  it("admin nav links have expected hrefs (no router push from anchors)", async () => {
    render(
      <MantineProvider>
        <PrivateNavigationHeader />
      </MantineProvider>,
    );

    const dashboardLink = screen.getByText(/Dashboard/i).closest("a");
    expect(dashboardLink).toBeTruthy();
    expect(String(dashboardLink?.getAttribute("href"))).toContain(
      "/admin/dashboard",
    );

    const kycLink = screen.getByText(/KYC/i).closest("a");
    expect(kycLink).toBeTruthy();
    expect(String(kycLink?.getAttribute("href"))).toContain("/admin/kyc");

    const locationsLink = screen.getByText(/Locations/i).closest("a");
    expect(locationsLink).toBeTruthy();
    expect(String(locationsLink?.getAttribute("href"))).toContain(
      "/admin/locations",
    );

    const lockersLink = screen.getByText(/Lockers/i).closest("a");
    expect(lockersLink).toBeTruthy();
    expect(String(lockersLink?.getAttribute("href"))).toContain(
      "/admin/lockers",
    );

    const packagesLink = screen.getByText(/Packages/i).closest("a");
    expect(packagesLink).toBeTruthy();
    expect(String(packagesLink?.getAttribute("href"))).toContain(
      "/admin/packages",
    );

    const mailroomsLink = screen.getByText(/Mailrooms/i).closest("a");
    expect(mailroomsLink).toBeTruthy();
    expect(String(mailroomsLink?.getAttribute("href"))).toContain(
      "/admin/mailrooms",
    );

    const plansLink = screen.getByText(/Plans/i).closest("a");
    expect(plansLink).toBeTruthy();
    expect(String(plansLink?.getAttribute("href"))).toContain("/admin/plans");

    const rewardsLink = screen.getByText(/Rewards/i).closest("a");
    expect(rewardsLink).toBeTruthy();
    expect(String(rewardsLink?.getAttribute("href"))).toContain(
      "/admin/rewards",
    );

    const statsLink = screen.getByText(/Stats/i).closest("a");
    expect(statsLink).toBeTruthy();
    expect(String(statsLink?.getAttribute("href"))).toContain("/admin/stats");

    const usersLink = screen.getByText(/Users/i).closest("a");
    expect(usersLink).toBeTruthy();
    expect(String(usersLink?.getAttribute("href"))).toContain("/admin/users");
  });

  it("does not render user-only notifications control for admin role", async () => {
    render(
      <MantineProvider>
        <PrivateNavigationHeader />
      </MantineProvider>,
    );

    // Notifications button (aria-label="notifications") should not be present for admins
    expect(screen.queryByLabelText("notifications")).toBeNull();
  });
});
