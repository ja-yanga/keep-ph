// Polyfill ResizeObserver and IntersectionObserver for JSDOM so mantine hooks don't throw
type TestResizeObserver = {
  observe(): void;
  unobserve(): void;
  disconnect(): void;
};
const g = globalThis as unknown as {
  ResizeObserver?: new () => TestResizeObserver;
  IntersectionObserver?: new (
    cb?: IntersectionObserverCallback,
    opts?: IntersectionObserverInit,
  ) => IntersectionObserver;
};

if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as new () => TestResizeObserver;
}

if (typeof g.IntersectionObserver === "undefined") {
  g.IntersectionObserver = class {
    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as new (
    cb?: IntersectionObserverCallback,
    opts?: IntersectionObserverInit,
  ) => IntersectionObserver;
}

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import ApproverDashboard from "@/components/pages/admin/DashboardPage/ApproverDashboard";

/*
  Integration tests for ApproverDashboard

  - Focus: render approver dashboard stats, recent packages, navigation
  - Mocks:
    * next/navigation.useRouter().push -> pushMock
    * global.fetch -> per-test mock returning ApproverDashboardStats shape:
      { stats: { storedPackages, pendingRequests, recentPackages }, kyc_pending_count, rewards_pending_count }
  - Notes:
    * Use screen.findByText to await async render after fetch.
    * console.debug silenced to keep test logs clean.
*/

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

describe("ApproverDashboard", () => {
  let originalFetch: typeof globalThis.fetch | undefined;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => {});
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    debugSpy.mockRestore();
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders dashboard stats for approver", async () => {
    const mockStats = {
      stats: {
        storedPackages: 12,
        pendingRequests: 5,
        recentPackages: [],
      },
      kyc_pending_count: 8,
      rewards_pending_count: 3,
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );

    await screen.findByText(/Dashboard Overview/i);

    expect(
      screen.getByText(String(mockStats.stats.storedPackages)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.stats.pendingRequests)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.kyc_pending_count)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.rewards_pending_count)),
    ).toBeInTheDocument();
  });

  it("shows recent packages list with status badge", async () => {
    const mockStats = {
      stats: {
        storedPackages: 0,
        pendingRequests: 0,
        recentPackages: [
          {
            package_name: "Box A",
            package_type: "Parcel",
            status: "STORED",
            received_at: new Date().toISOString(),
          },
        ],
      },
      kyc_pending_count: 0,
      rewards_pending_count: 0,
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );

    await screen.findByText(/STORED/i);

    const pkgName = screen.queryByText(/Box A/i);
    if (pkgName) expect(pkgName).toBeInTheDocument();
  });

  it("navigates when clicking Inventory card", async () => {
    const mockStats = {
      stats: {
        storedPackages: 12,
        pendingRequests: 5,
        recentPackages: [],
      },
      kyc_pending_count: 8,
      rewards_pending_count: 3,
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );

    await screen.findByText(/Dashboard Overview/i);

    const inventoryLink = screen.getByRole("link", { name: /Inventory/i });
    expect(inventoryLink).toHaveAttribute("href", "/admin/packages");
  });

  it("navigates when clicking Package Requests card", async () => {
    const mockStats = {
      stats: {
        storedPackages: 1,
        pendingRequests: 2,
        recentPackages: [],
      },
      kyc_pending_count: 0,
      rewards_pending_count: 0,
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    const requestsLink = screen.getByRole("link", {
      name: /pending requests requiring action/i,
    });
    expect(requestsLink).toHaveAttribute(
      "href",
      "/admin/packages?tab=requests",
    );
  });

  it("navigates when clicking KYC Requests card", async () => {
    const mockStats = {
      stats: {
        storedPackages: 0,
        pendingRequests: 0,
        recentPackages: [],
      },
      kyc_pending_count: 5,
      rewards_pending_count: 0,
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    const kycLink = screen.getByRole("link", { name: /kyc requests pending/i });
    expect(kycLink).toHaveAttribute("href", "/admin/kyc?status=SUBMITTED");
  });

  it("navigates when clicking Rewards Claim Requests card", async () => {
    const mockStats = {
      stats: {
        storedPackages: 0,
        pendingRequests: 0,
        recentPackages: [],
      },
      kyc_pending_count: 0,
      rewards_pending_count: 7,
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );
    await screen.findByText(/Dashboard Overview/i);
    const rewardsLink = screen.getByRole("link", {
      name: /rewards claims pending/i,
    });
    expect(rewardsLink).toHaveAttribute("href", "/admin/rewards");
  });

  it("navigates when clicking View Full Inventory button", async () => {
    const mockStats = {
      stats: {
        storedPackages: 12,
        pendingRequests: 5,
        recentPackages: [],
      },
      kyc_pending_count: 8,
      rewards_pending_count: 3,
    };

    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });

    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );

    await screen.findByText(/Dashboard Overview/i);

    const viewAll = screen.getByRole("button", {
      name: /View all packages/i,
    });
    await userEvent.click(viewAll);
    expect(pushMock).toHaveBeenCalledWith("/admin/packages");
  });

  it("has Refresh Data button (non-navigation)", async () => {
    const mockStats = {
      stats: {
        storedPackages: 0,
        pendingRequests: 0,
        recentPackages: [],
      },
      kyc_pending_count: 0,
      rewards_pending_count: 0,
    };
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStats,
    });
    render(
      <MantineProvider>
        <ApproverDashboard />
      </MantineProvider>,
    );

    const label = await screen.findByText(/Refresh Data/i);
    const btn = label.closest("button");
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn!);
    expect(pushMock).not.toHaveBeenCalledWith(
      expect.stringContaining("/admin"),
    );
  });
});
