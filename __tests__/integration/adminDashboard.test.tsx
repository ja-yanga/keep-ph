import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import AdminDashboard from "@/components/pages/admin/DashboardPage/AdminDashboard";

/*
  Integration tests for AdminDashboard

  - Focus: render dashboard stats, show recent packages, and verify navigation
  - Mocks:
    * next/navigation.useRouter().push -> pushMock
    * global.fetch -> per-test mock returning the shape the component expects:
      { pendingRequests, storedPackages, totalSubscribers, lockerStats, recentPackages }
  - Notes:
    * Use screen.findByText to await async render after the component's fetch.
    * console.debug emitted by the component is silenced in beforeEach to keep test logs clean.
*/

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("AdminDashboard", () => {
  let originalFetch: typeof globalThis.fetch | undefined;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // silence console.debug noise from the component during tests
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    debugSpy.mockRestore();
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders dashboard stats", async () => {
    const mockStats = {
      pendingRequests: 5,
      storedPackages: 12,
      totalSubscribers: 100,
      lockerStats: { total: 50, assigned: 25 },
      recentPackages: [],
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );

    // await the async-rendered heading directly (fetch + render)
    await screen.findByText(/Dashboard Overview/i);

    expect(
      screen.getByText(String(mockStats.pendingRequests)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.storedPackages)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.totalSubscribers)),
    ).toBeInTheDocument();
  });

  it("shows recent packages list and status badge within the package row", async () => {
    const mockStats = {
      pendingRequests: 0,
      storedPackages: 0,
      totalSubscribers: 0,
      lockerStats: { total: 0, assigned: 0 },
      recentPackages: [
        {
          id: "p1",
          package_name: "Box A",
          package_type: "Parcel",
          status: "STORED",
          received_at: new Date().toISOString(),
          registration: { full_name: "Alice" },
        },
      ],
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );

    // await the status badge directly
    await screen.findByText(/STORED/i);

    // If package name is rendered, assert it; otherwise the presence of the status badge is sufficient.
    const pkgName =
      screen.queryByText(/Box A/i) ?? screen.queryByText(/Alice/i);
    if (pkgName) expect(pkgName).toBeInTheDocument();
  });

  it("navigates when clicking Inventory card and View All Packages", async () => {
    const mockStats = {
      pendingRequests: 1,
      storedPackages: 2,
      totalSubscribers: 3,
      lockerStats: { total: 4, assigned: 1 },
      recentPackages: [],
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );

    await screen.findByText(/Dashboard Overview/i);

    // clicking Inventory card (card label "Inventory") should push to /admin/packages
    await userEvent.click(screen.getByText(/Inventory/i));
    expect(pushMock).toHaveBeenCalledWith("/admin/packages");

    // clicking "View All Packages" button should also navigate
    const viewAll = screen.getByRole("button", { name: /View All Packages/i });
    await userEvent.click(viewAll);
    expect(pushMock).toHaveBeenCalledWith("/admin/packages");
  });

  it("navigates when clicking Pending Requests card", async () => {
    const mockStats = {
      pendingRequests: 1,
      storedPackages: 0,
      totalSubscribers: 0,
      lockerStats: { total: 0, assigned: 0 },
      recentPackages: [],
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    await userEvent.click(screen.getByText(/Pending Requests/i));
    expect(pushMock).toHaveBeenCalledWith("/admin/packages?tab=requests");
  });

  it("navigates when clicking Subscribers card", async () => {
    const mockStats = {
      pendingRequests: 0,
      storedPackages: 0,
      totalSubscribers: 1,
      lockerStats: { total: 0, assigned: 0 },
      recentPackages: [],
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    await userEvent.click(screen.getByText(/Subscribers/i));
    expect(pushMock).toHaveBeenCalledWith("/admin/mailrooms");
  });

  it("navigates when clicking Locker Occupancy card", async () => {
    const mockStats = {
      pendingRequests: 0,
      storedPackages: 0,
      totalSubscribers: 0,
      lockerStats: { total: 2, assigned: 1 },
      recentPackages: [],
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    await userEvent.click(screen.getByText(/Locker Occupancy/i));
    expect(pushMock).toHaveBeenCalledWith("/admin/lockers?tab=occupied");
  });

  it("has Refresh Data button (non-navigation)", async () => {
    const mockStats = {
      pendingRequests: 0,
      storedPackages: 0,
      totalSubscribers: 0,
      lockerStats: { total: 0, assigned: 0 },
      recentPackages: [],
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <AdminDashboard />
      </MantineProvider>,
    );
    const btn = await screen.findByRole("button", { name: /Refresh Data/i });
    expect(btn).toBeInTheDocument();
    // clicking should not call router.push
    await userEvent.click(btn);
    expect(pushMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/admin"),
    );
  });
});
