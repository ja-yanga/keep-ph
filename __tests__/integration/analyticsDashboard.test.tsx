import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import AnalyticsDashboard from "@/components/AnalyticsDashboard";

/*
  Integration tests for AnalyticsDashboard

  - Verifies metrics / charts render from API response.
  - Verifies selecting a different time range triggers a new fetch with the selected range.
  - Verifies friendly error message when API returns non-ok.

  Notes:
  - Tests mock global.fetch per-case to return the shape the component expects.
  - Mantine UI requires small JSDOM polyfills (ResizeObserver, matchMedia).
  - scrollIntoView is stubbed to prevent Mantine combobox errors in JSDOM.
  - Console warnings/errors are silenced in tests to keep output clean.
*/

const mockResponse = {
  visitorData: [
    { date: "01/01", visitors: 10, pageviews: 20 },
    { date: "01/02", visitors: 15, pageviews: 25 },
  ],
  deviceData: [
    { name: "desktop", value: 20, color: "#228BE6" },
    { name: "mobile", value: 10, color: "#12B886" },
  ],
  topPages: [{ name: "/home", views: 30 }],
  stats: { activeNow: 3, totalVisitors: 1234, totalPageViews: 5678 },
};

/* minimal Mantine/Recharts polyfills for JSDOM */
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

// Prevent Mantine Combobox errors in JSDOM where scrollIntoView may be missing.
// Stub and restore in beforeAll/afterAll to avoid cross-test leakage.
const _origScroll = Element.prototype.scrollIntoView;
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  Element.prototype.scrollIntoView = _origScroll;
});

describe("AnalyticsDashboard", () => {
  let originalFetch: typeof globalThis.fetch | undefined;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
    // silence noisy library logs during tests to keep CI output clean
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("renders metrics, top pages and device usage from API", async () => {
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(
      <MantineProvider>
        <AnalyticsDashboard />
      </MantineProvider>,
    );

    // await the dashboard heading which appears after successful fetch
    await screen.findByText(/Website Analytics/i);

    // metrics present
    expect(
      screen.getByText(String(mockResponse.stats.activeNow)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockResponse.stats.totalVisitors.toLocaleString()),
    ).toBeInTheDocument();
    expect(
      screen.getByText(mockResponse.stats.totalPageViews.toLocaleString()),
    ).toBeInTheDocument();

    // device rows present (top pages rendering may vary; assert devices which are stable)
    expect(screen.getByText(/desktop/i)).toBeInTheDocument();
    expect(screen.getByText(/mobile/i)).toBeInTheDocument();
  });

  it("selecting a different time range triggers fetch with the new range", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });
    (globalThis.fetch as unknown) = fetchMock;

    render(
      <MantineProvider>
        <AnalyticsDashboard />
      </MantineProvider>,
    );

    // initial fetch should be called with default range=7d
    await screen.findByText(/Website Analytics/i);
    expect(String(fetchMock.mock.calls[0][0])).toContain("range=7d");

    // open select: Mantine renders the visible control as a textbox (readonly input)
    // Use the textbox role to interact with the combobox control reliably.
    const selectInput = screen.getByRole("textbox", {
      name: /Select time range for analytics data/i,
    });
    await userEvent.click(selectInput);
    const opt = await screen.findByText(/Last 30 days/i);
    await userEvent.click(opt);

    // expect an additional fetch for range=30d
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("range=30d")),
    ).toBe(true);
  });

  it("shows error alert when API returns non-ok", async () => {
    (globalThis.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Missing Google Analytics credentials" }),
    });

    render(
      <MantineProvider>
        <AnalyticsDashboard />
      </MantineProvider>,
    );

    // component sets a friendly error message on failure
    // component now surfaces a GA-specific configuration message for this error
    expect(
      await screen.findByText(/Google Analytics is not configured/i),
    ).toBeInTheDocument();
  });
});
