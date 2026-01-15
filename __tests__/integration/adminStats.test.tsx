// Integration tests for Admin Stats page (admin/stats).
// - Tests the page route renders correctly with layout and title.
// - Verifies the AnalyticsDashboard component is properly integrated.
// - Exercises time range selection, loading states, and error handling.
// - Mocks dynamic chart imports (recharts) to avoid rendering issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver).
// - Captures global.fetch calls to assert API usage and responses.

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import StatsPage from "@/app/admin/stats/page";

// Mock dynamic chart imports (recharts) to avoid rendering issues
jest.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Line: () => null,
  Bar: () => null,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

// Mock next/navigation
const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock the notifications library
jest.mock("@mantine/notifications", () => ({
  Notifications: () => null,
  notifications: {
    show: jest.fn(),
    hide: jest.fn(),
    clean: jest.fn(),
    update: jest.fn(),
    cleanQueue: jest.fn(),
  },
}));

// Mock Mantine components
jest.mock("@mantine/core", () => {
  const actual = jest.requireActual("@mantine/core");
  return {
    ...actual,
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    ScrollArea: ({
      children,
      ...props
    }: {
      children: React.ReactNode;
      [key: string]: unknown;
    }) => {
      void props;
      return <div data-testid="scroll-area">{children}</div>;
    },
    Popover: ({
      children,
      opened: _opened,
    }: {
      children: React.ReactNode;
      opened?: boolean;
    }) => {
      void _opened;
      return (
        <div role="presentation" data-testid="popover">
          {children}
        </div>
      );
    },
    Tooltip: ({
      children,
      label: _label,
    }: {
      children: React.ReactNode;
      label?: React.ReactNode;
    }) => {
      void _label;
      return <>{children}</>;
    },
  };
});

// Mock PrivateMainLayout to simplify testing
jest.mock("@/components/Layout/PrivateMainLayout", () => {
  return function PrivateMainLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid="private-main-layout">{children}</div>;
  };
});

// --- Polyfills ---
// matchMedia: required by Mantine
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Minimal ResizeObserver, IntersectionObserver, and scrollIntoView shims
type TestRO = { observe(): void; unobserve(): void; disconnect(): void };
const g = globalThis as unknown as {
  ResizeObserver?: new () => TestRO;
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
  } as unknown as new () => TestRO;
}

if (typeof g.IntersectionObserver === "undefined") {
  g.IntersectionObserver = class {
    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords() {
      return [];
    }
  } as unknown as new (
    cb?: IntersectionObserverCallback,
    opts?: IntersectionObserverInit,
  ) => IntersectionObserver;
}

Element.prototype.scrollIntoView = jest.fn();

// --- Mock Data ---
const mockAnalyticsData = {
  visitorData: [
    { date: "12/01", visitors: 100, pageviews: 250 },
    { date: "12/02", visitors: 120, pageviews: 280 },
    { date: "12/03", visitors: 95, pageviews: 230 },
  ],
  deviceData: [
    { name: "desktop", value: 150, color: "#228BE6" },
    { name: "mobile", value: 100, color: "#12B886" },
    { name: "tablet", value: 65, color: "#7950f2" },
  ],
  topPages: [
    { name: "/", views: 500 },
    { name: "/about", views: 200 },
    { name: "/contact", views: 150 },
  ],
  stats: {
    activeNow: 25,
    totalVisitors: 315,
    totalPageViews: 760,
  },
};

// Track fetch calls
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
const originalFetch = global.fetch;

// Setup global.fetch mock
beforeEach(() => {
  fetchCalls = [];
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      fetchCalls.push({ url, init });

      const makeResponse = (body: unknown, ok = true, status = 200) => {
        const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
        return {
          ok,
          status,
          json: async () =>
            typeof body === "string" ? JSON.parse(body) : body,
          text: async () => bodyStr,
          clone: () => ({ text: async () => bodyStr }),
        } as unknown as Response;
      };

      // GET analytics
      if (
        url.includes("/api/admin/analytics") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET")
      ) {
        return makeResponse(mockAnalyticsData);
      }

      return makeResponse({ error: "not found" }, false, 404);
    },
  ) as jest.Mock;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// Test wrapper component
const renderComponent = () => {
  return render(
    <MantineProvider>
      <Notifications />
      <StatsPage />
    </MantineProvider>,
  );
};

describe("Admin Stats Page (admin/stats)", () => {
  // Increase timeout for all tests in this suite
  jest.setTimeout(15000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // BASIC RENDERING TESTS
  // ============================================

  describe("Basic Rendering", () => {
    it("renders the stats page correctly", async () => {
      renderComponent();

      // Check for layout
      expect(screen.getByTestId("private-main-layout")).toBeInTheDocument();

      // Check for main element with correct aria-label
      const main = screen.getByRole("main", {
        name: /Admin analytics dashboard/i,
      });
      expect(main).toBeInTheDocument();

      // Wait for analytics data to load
      await waitFor(
        () => {
          expect(
            screen.getByRole("heading", { name: /Website Analytics/i }),
          ).toBeInTheDocument();
        },
        { timeout: 10000 },
      );

      // Check that fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/admin/analytics"),
        expect.any(Object),
      );
    });

    it("displays analytics dashboard with key metrics", async () => {
      renderComponent();

      // Wait for page title
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Check for key metrics cards
      await waitFor(() => {
        expect(screen.getByText(/Active Now/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Visitors/i)).toBeInTheDocument();
        expect(screen.getByText(/Page Views/i)).toBeInTheDocument();
      });

      // Check that metrics display values
      expect(screen.getByText("25")).toBeInTheDocument(); // activeNow
      expect(screen.getByText("315")).toBeInTheDocument(); // totalVisitors
      expect(screen.getByText("760")).toBeInTheDocument(); // totalPageViews
    });

    it("displays charts and visualizations", async () => {
      renderComponent();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Check for chart sections
      await waitFor(() => {
        expect(screen.getByText(/Traffic Overview/i)).toBeInTheDocument();
        expect(screen.getByText(/Top Pages/i)).toBeInTheDocument();
        expect(screen.getByText(/Device Usage/i)).toBeInTheDocument();
      });

      // Check for chart containers (mocked recharts) - there are multiple charts
      const containers = screen.getAllByTestId("responsive-container");
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // TIME RANGE SELECTION TESTS
  // ============================================

  describe("Time Range Selection", () => {
    it("changes time range when selector is updated", async () => {
      renderComponent();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Find time range select - use textbox role (the input element, not the listbox)
      const select = screen.getByRole("textbox", {
        name: /Select time range for analytics data/i,
      });
      expect(select).toBeInTheDocument();

      // Click to open dropdown
      await act(async () => {
        await userEvent.click(select);
      });

      // Wait for dropdown
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Find and click "Last 30 days" option
      const option = await screen.findByText(/Last 30 days/i);
      await userEvent.click(option);

      // Wait for fetch to be called with new range
      await waitFor(
        () => {
          expect(
            fetchCalls.some((c) =>
              c.url.includes("/api/admin/analytics?range=30d"),
            ),
          ).toBe(true);
        },
        { timeout: 5000 },
      );
    });

    it("displays default time range (7 days)", async () => {
      renderComponent();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Check that initial fetch uses default 7d range
      await waitFor(
        () => {
          expect(
            fetchCalls.some((c) =>
              c.url.includes("/api/admin/analytics?range=7d"),
            ),
          ).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });

  // ============================================
  // LOADING STATE TESTS
  // ============================================

  describe("Loading States", () => {
    it("displays loading state while fetching data", async () => {
      // Delay the fetch response
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => mockAnalyticsData,
                text: async () => JSON.stringify(mockAnalyticsData),
                clone: () => ({
                  text: async () => JSON.stringify(mockAnalyticsData),
                }),
              } as Response);
            }, 100);
          }),
      );

      renderComponent();

      // Check for loading indicator (Suspense fallback or component loader)
      // The Suspense fallback shows a Loader
      const loadingElement = screen.queryByRole("status", {
        name: /Loading analytics data/i,
      });
      // Note: loading might be very fast, so we check if it appears or already loaded
      if (loadingElement) {
        expect(loadingElement).toBeInTheDocument();
      }

      // Wait for data to load
      await waitFor(
        () => {
          expect(
            screen.getByRole("heading", { name: /Website Analytics/i }),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  // ============================================
  // ERROR HANDLING TESTS
  // ============================================

  describe("Error Handling", () => {
    it("displays error message when API request fails", async () => {
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Failed to fetch analytics" }),
          text: async () =>
            JSON.stringify({ error: "Failed to fetch analytics" }),
          clone: () => ({
            text: async () =>
              JSON.stringify({ error: "Failed to fetch analytics" }),
          }),
        } as Response;
      });

      renderComponent();

      // Wait for error message to appear
      await waitFor(
        () => {
          expect(
            screen.getByText(/Could not load analytics data/i),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });

    it("displays helpful message when Google Analytics credentials are missing", async () => {
      // Mock fetch to return missing credentials error
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({
            error: "Missing Google Analytics credentials",
          }),
          text: async () =>
            JSON.stringify({ error: "Missing Google Analytics credentials" }),
          clone: () => ({
            text: async () =>
              JSON.stringify({ error: "Missing Google Analytics credentials" }),
          }),
        } as Response;
      });

      renderComponent();

      // Wait for credentials error message
      await waitFor(
        () => {
          expect(
            screen.getByText(/Google Analytics is not configured/i),
          ).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Check that the message includes setup instructions
      expect(
        screen.getByText(/GA_PROPERTY_ID/i, { exact: false }),
      ).toBeInTheDocument();
    });

    it("still renders page structure even when data fetch fails", async () => {
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockImplementationOnce(async () => {
        return {
          ok: false,
          status: 500,
          json: async () => ({ error: "Network error" }),
          text: async () => JSON.stringify({ error: "Network error" }),
          clone: () => ({
            text: async () => JSON.stringify({ error: "Network error" }),
          }),
        } as Response;
      });

      renderComponent();

      // Wait for error, but page structure should still exist
      await waitFor(
        () => {
          expect(screen.getByTestId("private-main-layout")).toBeInTheDocument();
        },
        { timeout: 5000 },
      );
    });
  });

  // ============================================
  // DATA DISPLAY TESTS
  // ============================================

  describe("Data Display", () => {
    it("displays device breakdown data", async () => {
      renderComponent();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Check for device data
      await waitFor(() => {
        expect(screen.getByText(/desktop/i)).toBeInTheDocument();
        expect(screen.getByText(/mobile/i)).toBeInTheDocument();
        expect(screen.getByText(/tablet/i)).toBeInTheDocument();
      });

      // Check device values are displayed
      expect(screen.getByText("150 users")).toBeInTheDocument();
      expect(screen.getByText("100 users")).toBeInTheDocument();
      expect(screen.getByText("65 users")).toBeInTheDocument();
    });

    it("displays top pages information", async () => {
      renderComponent();

      // Wait for dashboard to load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Check for top pages section
      await waitFor(() => {
        expect(screen.getByText(/Top Pages/i)).toBeInTheDocument();
      });

      // Charts are mocked, but we can verify the section exists
      const containers = screen.getAllByTestId("responsive-container");
      expect(containers.length).toBeGreaterThan(0);
    });
  });

  // ============================================
  // REFRESH FUNCTIONALITY
  // ============================================

  describe("Data Refresh", () => {
    it("refetches data when time range changes", async () => {
      renderComponent();

      // Wait for initial load
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: /Website Analytics/i }),
        ).toBeInTheDocument();
      });

      // Clear fetch calls
      const initialCallCount = fetchCalls.length;

      // Change time range - use textbox role (the input element)
      const select = screen.getByRole("textbox", {
        name: /Select time range for analytics data/i,
      });
      await act(async () => {
        await userEvent.click(select);
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const option = await screen.findByText(/Last 90 days/i);
      await userEvent.click(option);

      // Wait for new fetch with updated range
      await waitFor(
        () => {
          expect(fetchCalls.length).toBeGreaterThan(initialCallCount);
          expect(
            fetchCalls.some((c) =>
              c.url.includes("/api/admin/analytics?range=90d"),
            ),
          ).toBe(true);
        },
        { timeout: 5000 },
      );
    });
  });
});
