import React from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";

/**
 * Integration tests for the public landing (Home) page.
 * Covers:
 * - Header and hero UI (branding, primary CTAs)
 * - Services section content
 * - Pricing section: fetches plans from /api/plans and renders plan titles + CTAs
 */

/* Polyfills used by Mantine in JSDOM */
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

/* Mock next/navigation before importing the page so useRouter/usePathname won't throw */
const pushMock = jest.fn();
const usePathnameMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => usePathnameMock(),
}));

/* Mock next/link so Link components render as anchors in JSDOM */
jest.mock("next/link", () => {
  const MockLink = ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href?: string;
  }) => React.createElement("a", { href }, children);
  MockLink.displayName = "NextLink";
  return { __esModule: true, default: MockLink };
});

import Home from "@/app/page"; // imported after navigation/link mocks

describe("Landing page — UI and pricing", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/");
  });

  afterEach(() => {
    // restore mocks and reset fetch between tests to avoid leakage
    jest.restoreAllMocks();
    if ((global.fetch as unknown) && (global.fetch as jest.Mock).mockReset) {
      (global.fetch as jest.Mock).mockReset();
    }
  });

  it("renders header and hero with action buttons", () => {
    // Render the public home page inside MantineProvider to ensure components render correctly
    render(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    // Brand/navigation checks
    const brandLink = screen.getByRole("link", { name: /Keep PH/i });
    expect(brandLink).toBeTruthy();

    // Hero title and CTAs
    expect(screen.getByText(/Your Business Address/i)).toBeTruthy();
    const getStarted = screen.getByRole("link", { name: /Get Started/i });
    expect(getStarted).toHaveAttribute("href", "/signup");
    const viewPricing = screen.getByRole("link", { name: /View Pricing/i });
    expect(viewPricing).toHaveAttribute("href", "#pricing");
  });

  it("renders services section", () => {
    // Ensure the services/features section mounts
    render(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    expect(screen.getByText(/Everything You Need to Go Virtual/i)).toBeTruthy();
    const matches = screen.getAllByText(/Digital Mail Scanning/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("fetches and displays pricing plans", async () => {
    // Mock API response for plans
    const plans = [
      {
        id: "plan-basic",
        name: "Basic",
        price: 500,
        description: "Basic plan",
        storageLimit: 10,
        canReceiveMail: true,
        canReceiveParcels: false,
        canDigitize: false,
      },
      {
        id: "plan-pro",
        name: "Pro",
        price: 1200,
        description: "Pro plan",
        storageLimit: 50,
        canReceiveMail: true,
        canReceiveParcels: true,
        canDigitize: true,
      },
    ];

    (global.fetch as unknown) = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => plans,
    } as unknown as Response);

    render(
      <MantineProvider>
        <Home />
      </MantineProvider>,
    );

    // Wait for plan titles to render
    expect(await screen.findByText("Basic")).toBeTruthy();
    expect(await screen.findByText("Pro")).toBeTruthy();

    // Verify fetch was called and targeted the plans endpoint
    expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(0);
    expect(String((global.fetch as jest.Mock).mock.calls[0][0])).toContain(
      "/api/plans",
    );

    // Verify each plan has a nearby actionable element (anchor or button)
    const basicTitle = screen.getByText("Basic") as HTMLElement;
    const findCTAFrom = (start: HTMLElement): HTMLElement | null => {
      let node: HTMLElement | null = start;
      for (let i = 0; i < 6 && node; i += 1) {
        const found = node.querySelector("a,button") as HTMLElement | null;
        if (found) return found;
        node = node.parentElement;
      }
      return null;
    };
    const basicCTA = findCTAFrom(basicTitle);
    expect(basicCTA).toBeTruthy();

    const proTitle = screen.getByText("Pro") as HTMLElement;
    const proCTA = findCTAFrom(proTitle);
    expect(proCTA).toBeTruthy();
  });
});
