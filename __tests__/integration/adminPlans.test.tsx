// Integration tests for Admin Plans page (admin/plans).
// - Tests the page route renders correctly with layout and title.
// - Verifies the MailroomPlans component is properly integrated.
// - Exercises search, sorting, view modal, and edit plan flows.
// - Mocks mantine-datatable to avoid virtualization/layout issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver).
// - Captures global.fetch calls to assert API usage and responses.

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import PlansPage from "@/app/admin/plans/page";

type DataTableColumn = {
  accessor?: string;
  title?: React.ReactNode;
  render?: (r: Record<string, unknown>) => React.ReactNode;
};

const safeRender = (node: unknown): React.ReactNode => {
  if (node === null || node === undefined) return null;
  if (React.isValidElement(node as React.ReactElement))
    return node as React.ReactElement;
  if (
    typeof node === "string" ||
    typeof node === "number" ||
    typeof node === "boolean"
  )
    return String(node);
  try {
    return JSON.stringify(node);
  } catch {
    return String(node);
  }
};

// Mock DataTable to avoid virtualization/layout issues in tests.
jest.mock("mantine-datatable", () => {
  return {
    DataTable: (props: {
      records?: Array<Record<string, unknown>>;
      columns?: DataTableColumn[];
      fetching?: boolean;
      "aria-label"?: string;
    }) => {
      // Don't render rows if fetching
      if (props.fetching) {
        return (
          <table role="table" aria-label={props["aria-label"] ?? "Plans list"}>
            <tbody>
              <tr>
                <td>Loading...</td>
              </tr>
            </tbody>
          </table>
        );
      }
      const records = props.records ?? [];
      const columns = props.columns ?? [];
      return (
        <table role="table" aria-label={props["aria-label"] ?? "Plans list"}>
          <tbody>
            {records.map((rec, i) => (
              <tr
                role="row"
                key={String((rec as Record<string, unknown>).id ?? i)}
              >
                {columns.map((col, j) => {
                  const content =
                    typeof col.render === "function"
                      ? col.render(rec)
                      : (rec as Record<string, unknown>)[col.accessor ?? ""];
                  return (
                    <td role="cell" key={j}>
                      {safeRender(content)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    },
  };
});

// Mock next/navigation
const mockPush = jest.fn();
const mockSearchParams = new URLSearchParams();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => mockSearchParams,
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

// Mock Mantine components - use actual Modal to avoid issues with React element titles
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
const mockPlans = [
  {
    id: "plan-1",
    name: "Basic Plan",
    price: 500,
    description: "Basic mailroom service",
    storage_limit: 1024, // 1 GB
    can_receive_mail: true,
    can_receive_parcels: false,
    can_digitize: true,
  },
  {
    id: "plan-2",
    name: "Premium Plan",
    price: 1500,
    description: "Premium mailroom service with parcels",
    storage_limit: 5120, // 5 GB
    can_receive_mail: true,
    can_receive_parcels: true,
    can_digitize: true,
  },
  {
    id: "plan-3",
    name: "Enterprise Plan",
    price: 3000,
    description: "Enterprise mailroom service",
    storage_limit: null, // Unlimited
    can_receive_mail: true,
    can_receive_parcels: true,
    can_digitize: true,
  },
];

// Track fetch calls
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

// Mock global fetch
global.fetch = jest.fn((url: string | URL, init?: RequestInit) => {
  const urlString = typeof url === "string" ? url : url.toString();
  fetchCalls.push({ url: urlString, init });

  // GET all plans
  if (
    urlString.includes("/api/admin/mailroom/plans") &&
    (!init || (init.method ?? "GET").toUpperCase() === "GET") &&
    !urlString.match(/\/api\/admin\/mailroom\/plans\/[^/]+$/)
  ) {
    return Promise.resolve(
      new Response(JSON.stringify({ data: mockPlans }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // PATCH update plan
  if (
    urlString.includes("/api/admin/mailroom/plans/") &&
    init &&
    (init.method ?? "").toUpperCase() === "PATCH"
  ) {
    const planId = urlString.match(/\/plans\/([^/]+)/)?.[1];
    const bodyText = init.body ? String(init.body) : "{}";
    const parsed = JSON.parse(bodyText);
    const existingPlan = mockPlans.find((p) => p.id === planId);
    if (!existingPlan) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: "Plan not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    const updatedPlan = {
      ...existingPlan,
      ...parsed,
      // Convert GB to MB for storage_limit if provided
      storage_limit:
        parsed.storage_limit != null
          ? parsed.storage_limit * 1024
          : existingPlan.storage_limit,
    };
    // Update in mock array
    const index = mockPlans.findIndex((p) => p.id === planId);
    if (index !== -1) {
      mockPlans[index] = updatedPlan;
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          message: "Plan updated",
          data: updatedPlan,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
  }

  return Promise.resolve(
    new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }),
  );
}) as jest.Mock;

// Helper to wait for a row with specific text
const waitForRowWithText = async (text: string) => {
  // First wait for table to be present and not loading
  await waitFor(
    () => {
      const table = screen.getByRole("table", { name: /Plans list/i });
      expect(table).toBeInTheDocument();
      expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
    },
    { timeout: 3000 },
  );

  // Then wait for the specific row with text
  await waitFor(
    () => {
      const table = screen.getByRole("table", { name: /Plans list/i });
      const rows = within(table).queryAllByRole("row");
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some((r) => r.textContent?.includes(text))).toBe(true);
    },
    { timeout: 3000 },
  );
};

// Test wrapper component
const renderComponent = () => {
  return render(
    <MantineProvider>
      <Notifications />
      <PlansPage />
    </MantineProvider>,
  );
};

describe("Admin Plans Page (admin/plans)", () => {
  beforeEach(() => {
    fetchCalls = [];
    jest.clearAllMocks();
  });

  // ============================================
  // BASIC RENDERING TESTS
  // ============================================

  describe("Basic Rendering", () => {
    it("renders the plans page correctly", async () => {
      renderComponent();

      // Check for page title
      expect(
        screen.getByRole("heading", { name: /Manage Service Plans/i }),
      ).toBeInTheDocument();

      // Check for layout
      expect(screen.getByTestId("private-main-layout")).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      // Check that fetch was called
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/mailroom/plans",
        undefined,
      );
    });

    it("renders the plans list correctly", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      // Check for plan names
      expect(screen.getByText("Basic Plan")).toBeInTheDocument();
      expect(screen.getByText("Premium Plan")).toBeInTheDocument();
      expect(screen.getByText("Enterprise Plan")).toBeInTheDocument();
    });
  });

  // ============================================
  // SEARCH AND FILTERING TESTS
  // ============================================

  describe("Search and Filtering", () => {
    it("filters plans by search term", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const searchInput = screen.getByPlaceholderText(/Search plans/i);
      await userEvent.type(searchInput, "Premium");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const hasPremium = rows.some((r) =>
          r.textContent?.includes("Premium Plan"),
        );
        const hasBasic = rows.some((r) =>
          r.textContent?.includes("Basic Plan"),
        );
        expect(hasPremium).toBe(true);
        expect(hasBasic).toBe(false);
      });
    });

    it("clears filters when Clear Filters button is clicked", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const searchInput = screen.getByPlaceholderText(/Search plans/i);
      await userEvent.type(searchInput, "Premium");

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        expect(rows.some((r) => r.textContent?.includes("Premium Plan"))).toBe(
          true,
        );
      });

      const clearBtn = screen.getByRole("button", { name: /Clear Filters/i });
      await userEvent.click(clearBtn);

      await waitFor(() => {
        expect(searchInput).toHaveValue("");
        const rows = screen.getAllByRole("row");
        expect(rows.some((r) => r.textContent?.includes("Basic Plan"))).toBe(
          true,
        );
      });
    });

    it("sorts plans by name", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const sortSelect = screen.getByPlaceholderText(/Sort By/i);
      await act(async () => {
        await userEvent.click(sortSelect);
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      // Find and click the "Name (A-Z)" option
      const nameOption = await screen.findByText(/Name \(A-Z\)/i);
      await userEvent.click(nameOption);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const rowTexts = rows.map((r) => r.textContent || "");
        const basicIndex = rowTexts.findIndex((t) => t.includes("Basic Plan"));
        const enterpriseIndex = rowTexts.findIndex((t) =>
          t.includes("Enterprise Plan"),
        );
        expect(basicIndex).toBeLessThan(enterpriseIndex);
      });
    });

    it("sorts plans by price (Low-High)", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const sortSelect = screen.getByPlaceholderText(/Sort By/i);
      await act(async () => {
        await userEvent.click(sortSelect);
      });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const priceOption = await screen.findByText(/Price \(Low-High\)/i);
      await userEvent.click(priceOption);

      await waitFor(() => {
        const rows = screen.getAllByRole("row");
        const rowTexts = rows.map((r) => r.textContent || "");
        const basicIndex = rowTexts.findIndex((t) => t.includes("Basic Plan"));
        const premiumIndex = rowTexts.findIndex((t) =>
          t.includes("Premium Plan"),
        );
        expect(basicIndex).toBeLessThan(premiumIndex);
      });
    });
  });

  // ============================================
  // VIEW MODAL TESTS
  // ============================================

  describe("View Plan Details", () => {
    it("opens view modal and displays plan details", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      // Find the view button (eye icon) in the Basic Plan row
      const rows = screen.getAllByRole("row");
      const basicRow = rows.find((r) => r.textContent?.includes("Basic Plan"));
      expect(basicRow).toBeTruthy();

      // Find all buttons in the row - the view button should be the first one
      const viewButtons = within(basicRow!).getAllByRole("button");
      expect(viewButtons.length).toBeGreaterThan(0);
      const viewBtn = viewButtons[0]; // First button is the view button

      await act(async () => {
        await userEvent.click(viewBtn);
      });

      // Wait for modal to open
      const modal = await screen.findByRole("dialog", {
        name: /Plan Details/i,
      });

      // Check plan details are displayed
      expect(within(modal).getByText("Basic Plan")).toBeInTheDocument();
      expect(
        within(modal).getByText(/Basic mailroom service/i),
      ).toBeInTheDocument();
      expect(within(modal).getByText(/1 GB/i)).toBeInTheDocument();
    });

    it("closes view modal when Close button is clicked", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const rows = screen.getAllByRole("row");
      const basicRow = rows.find((r) => r.textContent?.includes("Basic Plan"));
      const viewButtons = within(basicRow!).getAllByRole("button");
      const viewBtn = viewButtons[0];

      await act(async () => {
        await userEvent.click(viewBtn);
      });

      const modal = await screen.findByRole("dialog", {
        name: /Plan Details/i,
      });

      const closeBtn = within(modal).getByRole("button", { name: /Close/i });
      await userEvent.click(closeBtn);

      await waitFor(() => {
        expect(
          screen.queryByRole("dialog", { name: /Plan Details/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  // ============================================
  // EDIT PLAN TESTS
  // ============================================

  describe("Edit Plan", () => {
    it("opens edit modal and displays plan form", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const rows = screen.getAllByRole("row");
      const basicRow = rows.find((r) => r.textContent?.includes("Basic Plan"));
      const actionButtons = within(basicRow!).getAllByRole("button");
      // The edit button should be the second button (after view)
      const editBtn = actionButtons[actionButtons.length > 1 ? 1 : 0];

      await act(async () => {
        await userEvent.click(editBtn);
      });

      // Wait for modal to open
      const modal = await screen.findByRole("dialog", {
        name: /Edit Plan/i,
      });

      // Check form fields are populated
      const nameInput = within(modal).getByLabelText(/Plan Name/i);
      expect(nameInput).toHaveValue("Basic Plan");

      const priceInput = within(modal).getByLabelText(/Price/i);
      expect(priceInput).toHaveValue(500);
    });

    it("updates plan when form is submitted", async () => {
      renderComponent();

      await waitForRowWithText("Basic Plan");

      const rows = screen.getAllByRole("row");
      const basicRow = rows.find((r) => r.textContent?.includes("Basic Plan"));
      const actionButtons = within(basicRow!).getAllByRole("button");
      const editBtn = actionButtons[actionButtons.length > 1 ? 1 : 0];

      await act(async () => {
        await userEvent.click(editBtn);
      });

      const modal = await screen.findByRole("dialog", {
        name: /Edit Plan/i,
      });

      // Update price
      const priceInput = within(modal).getByLabelText(/Price/i);
      await userEvent.clear(priceInput);
      await userEvent.type(priceInput, "750");

      // Submit form
      const saveBtn = within(modal).getByRole("button", {
        name: /Save Changes/i,
      });
      await act(async () => {
        await userEvent.click(saveBtn);
      });

      // Wait for PATCH request
      await waitFor(() => {
        expect(
          fetchCalls.some(
            (c) =>
              c.url.includes("/api/admin/mailroom/plans/plan-1") &&
              c.init?.method === "PATCH",
          ),
        ).toBe(true);
      });

      // Check success message appears
      await waitFor(() => {
        expect(
          screen.getByText(/Plan updated successfully/i),
        ).toBeInTheDocument();
      });
    });

    it("shows error message when update fails", async () => {
      // Mock fetch to return error
      (global.fetch as jest.Mock).mockImplementationOnce((url: string) => {
        if (url.includes("/api/admin/mailroom/plans/plan-1")) {
          return Promise.resolve(
            new Response(JSON.stringify({ error: "Update failed" }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }),
          );
        }
        return Promise.resolve(
          new Response(JSON.stringify({ data: mockPlans }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      });

      renderComponent();

      await waitForRowWithText("Basic Plan");

      const rows = screen.getAllByRole("row");
      const basicRow = rows.find((r) => r.textContent?.includes("Basic Plan"));
      const actionButtons = within(basicRow!).getAllByRole("button");
      const editBtn = actionButtons[actionButtons.length > 1 ? 1 : 0];

      await act(async () => {
        await userEvent.click(editBtn);
      });

      const modal = await screen.findByRole("dialog", {
        name: /Edit Plan/i,
      });

      const priceInput = within(modal).getByLabelText(/Price/i);
      await userEvent.clear(priceInput);
      await userEvent.type(priceInput, "750");

      const saveBtn = within(modal).getByRole("button", {
        name: /Save Changes/i,
      });
      await act(async () => {
        await userEvent.click(saveBtn);
      });

      // Wait for error message in modal
      await waitFor(() => {
        expect(
          within(modal).getByText(/Failed to update plan/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ============================================
  // REFRESH FUNCTIONALITY
  // ============================================

  describe("Refresh Functionality", () => {
    it("refreshes plans list when Refresh button is clicked", async () => {
      renderComponent();

      // Wait for initial data to load
      await screen.findByRole("table");
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      await waitForRowWithText("Basic Plan");

      // Get initial fetch count
      const initialFetchCount = fetchCalls.filter(
        (c) =>
          c.url.includes("/api/admin/mailroom/plans") &&
          (!c.init || (c.init.method ?? "GET").toUpperCase() === "GET"),
      ).length;

      const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
      await act(async () => {
        await userEvent.click(refreshBtn);
      });

      // Wait for fetch to be called again and for the refresh to complete
      await waitFor(
        () => {
          const getCalls = fetchCalls.filter(
            (c) =>
              c.url.includes("/api/admin/mailroom/plans") &&
              (!c.init || (c.init.method ?? "GET").toUpperCase() === "GET"),
          );
          expect(getCalls.length).toBeGreaterThan(initialFetchCount);
        },
        { timeout: 5000 },
      );

      // Wait for loading to complete - give React time to process the async update
      await waitFor(
        () => {
          expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Wait for rows to reappear - this is the key assertion
      // The table should have rows after refresh completes
      await waitFor(
        () => {
          const table = screen.getByRole("table", { name: /Plans list/i });
          const rows = within(table).queryAllByRole("row");
          expect(rows.length).toBeGreaterThan(0);
          expect(rows.some((r) => r.textContent?.includes("Basic Plan"))).toBe(
            true,
          );
        },
        { timeout: 5000 },
      );
    });
  });
});
