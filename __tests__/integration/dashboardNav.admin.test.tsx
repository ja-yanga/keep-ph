import React from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

// mock next/navigation and session BEFORE importing DashboardNav so client hooks don't run
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

import DashboardNav from "@/components/DashboardNav";

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

describe("DashboardNav (admin) — admin role", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders admin navigation items", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
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
  });

  it("admin nav links have expected hrefs (no router push from anchors)", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
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

    const statsLink = screen.getByText(/Stats/i).closest("a");
    expect(statsLink).toBeTruthy();
    expect(String(statsLink?.getAttribute("href"))).toContain("/admin/stats");
  });

  it("does not render user-only notifications control for admin role", async () => {
    render(
      <MantineProvider>
        <DashboardNav />
      </MantineProvider>,
    );

    // Notifications button (aria-label="notifications") should not be present for admins
    expect(screen.queryByLabelText("notifications")).toBeNull();
  });
});
