// Integration tests for Admin Transactions page (admin/transactions).
// - Tests the page route renders correctly with layout and title.
// - Verifies the TransactionTable component is properly integrated.
// - Exercises summary metrics, sorting, empty state, error state, and view-details modal.
// - Mocks mantine-datatable via AdminTable to avoid virtualization/layout issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver).
// - Captures global.fetch calls to assert API usage and responses.

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { Notifications } from "@mantine/notifications";
import AdminTransactionsPage from "@/app/admin/transactions/page";

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

// Mock DataTable to avoid virtualization/layout issues and to expose simple pagination controls.
jest.mock("mantine-datatable", () => {
  return {
    DataTable: (props: {
      records?: Array<Record<string, unknown>>;
      columns?: DataTableColumn[];
      page?: number;
      totalRecords?: number;
      recordsPerPage?: number;
      onPageChange?: (page: number) => void;
      "aria-label"?: string;
    }) => {
      const records = props.records ?? [];
      const columns = props.columns ?? [];
      const page = props.page ?? 1;
      const totalRecords = props.totalRecords ?? records.length;
      const recordsPerPage = props.recordsPerPage ?? (records.length || 10);
      const totalPages =
        recordsPerPage > 0
          ? Math.max(1, Math.ceil(totalRecords / recordsPerPage))
          : 1;

      return (
        <div>
          <table
            role="table"
            aria-label={props["aria-label"] ?? "Transactions list"}
          >
            <thead>
              <tr>
                {columns.map((col, j) => (
                  <th key={j}>{safeRender(col.title)}</th>
                ))}
              </tr>
            </thead>
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
          {totalPages > 1 && (
            <div>
              <button
                type="button"
                onClick={() => props.onPageChange?.(Math.max(1, page - 1))}
              >
                Previous page
              </button>
              <button
                type="button"
                onClick={() =>
                  props.onPageChange?.(Math.min(totalPages, page + 1))
                }
              >
                Next page
              </button>
            </div>
          )}
        </div>
      );
    },
  };
});

// Mock next/navigation router used by layout if needed
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

// Mock Mantine components that commonly cause JSDOM noise
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

// Mock PrivateMainLayout to simplify testing and avoid depending on session fetching
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
const mockRawTransactions = [
  {
    payment_transaction_id: "TX-001",
    mailroom_registration_id: "reg-1",
    user_id: "user-1",
    payment_transaction_amount: 1500,
    payment_transaction_status: "PAID",
    payment_transaction_date: "2024-01-01T10:00:00Z",
    payment_transaction_method: "CARD",
    payment_transaction_type: "SUBSCRIPTION",
    payment_transaction_reference_id: "REF-001",
    payment_transaction_channel: "WEB",
    payment_transaction_reference: "INV-001",
    payment_transaction_order_id: "ORD-001",
    payment_transaction_created_at: "2024-01-01T09:50:00Z",
    payment_transaction_updated_at: "2024-01-01T10:05:00Z",
    user_name: "Alice Smith",
    users_email: "alice@example.com",
    mobile_number: "09171234567",
    subscription: null,
    plan: null,
  },
  {
    payment_transaction_id: "TX-002",
    mailroom_registration_id: "reg-2",
    user_id: "user-2",
    payment_transaction_amount: 2500,
    payment_transaction_status: "FAILED",
    payment_transaction_date: "2024-01-02T11:00:00Z",
    payment_transaction_method: "GCASH",
    payment_transaction_type: "SUBSCRIPTION",
    payment_transaction_reference_id: "REF-002",
    payment_transaction_channel: "MOBILE",
    payment_transaction_reference: "INV-002",
    payment_transaction_order_id: "ORD-002",
    payment_transaction_created_at: "2024-01-02T10:45:00Z",
    payment_transaction_updated_at: "2024-01-02T11:10:00Z",
    user_name: "Bob Jones",
    users_email: "bob@example.com",
    mobile_number: "09171234568",
    subscription: null,
    plan: null,
  },
];

const mockPagination = {
  // Use a total greater than recordsPerPage so pagination controls are rendered
  total: 20,
  page: 1,
  limit: 10,
};

const mockStats = {
  total_revenue: 1500,
  total_transactions: 2,
  successful_transactions: 1,
  avg_transaction: 1500,
};

// Track fetch calls
let fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
const originalFetch = global.fetch;

const makeResponse = (body: unknown, ok = true, status = 200) => {
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return {
    ok,
    status,
    json: async () => (typeof body === "string" ? JSON.parse(body) : body),
    text: async () => bodyStr,
    clone: () => ({ text: async () => bodyStr }),
  } as unknown as Response;
};

// Helper to render the page with providers
const renderComponent = () =>
  render(
    <MantineProvider>
      <Notifications />
      <SWRConfig value={{ provider: () => new Map() }}>
        <AdminTransactionsPage />
      </SWRConfig>
    </MantineProvider>,
  );

describe("Admin Transactions Page (admin/transactions)", () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    fetchCalls = [];

    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = String(input);
        fetchCalls.push({ url: urlString, init });

        // Admin transactions list
        if (
          urlString.includes("/api/admin/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          // Default successful response
          return makeResponse({
            data: mockRawTransactions,
            meta: {
              pagination: mockPagination,
              stats: mockStats,
            },
          });
        }

        return makeResponse({ error: "not found" }, false, 404);
      },
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  // ============================================
  // BASIC RENDERING & METRICS
  // ============================================

  it("renders the transactions page with layout, title, metrics, and table", async () => {
    renderComponent();

    // Layout present
    expect(screen.getByTestId("private-main-layout")).toBeInTheDocument();

    // Main region from page.tsx
    const main = screen.getByRole("main", {
      name: /Admin transactions table/i,
    });
    expect(main).toBeInTheDocument();

    // Page title from TransactionTable
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Transactions/i }),
      ).toBeInTheDocument();
    });

    // Summary metric cards from StatCard
    expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Transactions/i)).toBeInTheDocument();
    // "Successful" may appear in multiple places; just ensure at least one match exists.
    expect(screen.getAllByText(/Successful/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Average Transaction/i)).toBeInTheDocument();

    // Metric values derived from stats (formatted currency and counts)
    // Currency text may appear multiple times (e.g., totals card and table rows);
    // only assert that at least one match exists.
    expect(screen.getAllByText("₱1,500.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText(String(mockStats.total_transactions)),
    ).toBeInTheDocument();
    expect(
      screen.getByText(String(mockStats.successful_transactions)),
    ).toBeInTheDocument();

    // Table should render transactions
    await screen.findByRole("table");
    await waitFor(() => {
      const rows = screen.getAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("TX-001"))).toBe(true);
      expect(rows.some((r) => r.textContent?.includes("TX-002"))).toBe(true);
      expect(rows.some((r) => r.textContent?.includes("PAID"))).toBe(true);
      expect(rows.some((r) => r.textContent?.includes("FAILED"))).toBe(true);
    });
  });

  // ============================================
  // SORTING / QUERY PARAMS
  // ============================================

  it("changes sort direction when clicking the Date header and updates API query", async () => {
    renderComponent();

    // Wait for table and initial fetch
    await screen.findByRole("table");
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("sortBy=payment_transaction_date") &&
            c.url.includes("sortDir=desc"),
        ),
      ).toBe(true);
    });

    // Click on the Date column header to toggle sort
    const dateHeader = screen.getByText("Date").closest("div");
    expect(dateHeader).toBeTruthy();

    await act(async () => {
      await userEvent.click(dateHeader as HTMLElement);
    });

    // Wait for new fetch with asc direction and reset to page=1
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("sortBy=payment_transaction_date") &&
            c.url.includes("sortDir=asc") &&
            c.url.includes("page=1"),
        ),
      ).toBe(true);
    });
  });

  // ============================================
  // PAGINATION
  // ============================================

  it("requests a different page when pagination changes", async () => {
    renderComponent();

    await screen.findByRole("table");

    // Initial call with page=1
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("page=1"),
        ),
      ).toBe(true);
    });

    const nextButton = await screen.findByRole("button", {
      name: /Next page/i,
    });

    await act(async () => {
      await userEvent.click(nextButton);
    });

    // Subsequent call with page=2
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("page=2"),
        ),
      ).toBe(true);
    });
  });

  // ============================================
  // EMPTY STATE
  // ============================================

  it("shows an empty state message when no transactions are returned", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = String(input);
        fetchCalls.push({ url: urlString, init });

        if (
          urlString.includes("/api/admin/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          return makeResponse({
            data: [],
            meta: {
              pagination: { total: 0, page: 1, limit: 10 },
              stats: {
                total_revenue: 0,
                total_transactions: 0,
                successful_transactions: 0,
                avg_transaction: 0,
              },
            },
          });
        }

        return makeResponse({ error: "not found" }, false, 404);
      },
    );

    renderComponent();

    // Wait for empty state message inside the Paper
    await waitFor(() => {
      expect(screen.getByText(/No transactions found\./i)).toBeInTheDocument();
    });
  });

  // ============================================
  // ERROR STATE
  // ============================================

  it("shows an error message when the API request fails", async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = String(input);
        fetchCalls.push({ url: urlString, init });

        if (
          urlString.includes("/api/admin/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          return makeResponse(
            { error: "Failed to fetch transactions" },
            false,
            500,
          );
        }

        return makeResponse({ error: "not found" }, false, 404);
      },
    );

    renderComponent();

    // Error state from TransactionTable
    await waitFor(() => {
      expect(
        screen.getByText(/Error loading transactions/i),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Failed to fetch transactions/i),
      ).toBeInTheDocument();
    });
  });

  // ============================================
  // SEARCH
  // ============================================

  it("sends search query to API when user types and submits search", async () => {
    renderComponent();

    await screen.findByRole("table");

    const searchInput = screen.getByTestId("search-input");
    expect(searchInput).toBeInTheDocument();

    await act(async () => {
      await userEvent.type(searchInput, "TX-001");
    });

    const submitButton = screen.getByTestId("submit-search-button");
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("search=TX-001") &&
            c.url.includes("page=1"),
        ),
      ).toBe(true);
    });
  });

  it("sends search on Enter key in search input", async () => {
    renderComponent();

    await screen.findByRole("table");

    const searchInput = screen.getByTestId("search-input");
    await act(async () => {
      await userEvent.type(searchInput, "alice");
    });
    await act(async () => {
      await userEvent.keyboard("{Enter}");
    });

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("search=alice") &&
            c.url.includes("page=1"),
        ),
      ).toBe(true);
    });
  });

  it("clears search and resets to page 1 when clicking clear search button", async () => {
    renderComponent();

    await screen.findByRole("table");

    const searchInput = screen.getByTestId("search-input");
    await act(async () => {
      await userEvent.type(searchInput, "TX-001");
    });

    const submitButton = screen.getByTestId("submit-search-button");
    await act(async () => {
      await userEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/transactions?") &&
            c.url.includes("search=TX-001"),
        ),
      ).toBe(true);
    });

    const clearButton = screen.getByTestId("clear-search-button");
    await act(async () => {
      await userEvent.click(clearButton);
    });

    await waitFor(() => {
      const withEmptySearch = fetchCalls.filter((c) => {
        if (!c.url.includes("/api/admin/transactions?")) return false;
        const m = c.url.match(/search=([^&]*)/);
        return m ? m[1] === "" : false;
      });
      expect(withEmptySearch.length).toBeGreaterThan(0);
    });
    expect(searchInput).toHaveValue("");
  });

  // ============================================
  // VIEW DETAILS MODAL
  // ============================================

  it("opens the transaction details modal when clicking the view action", async () => {
    renderComponent();

    await screen.findByRole("table");
    await waitFor(() => {
      expect(
        screen
          .getAllByRole("row")
          .some((r) => r.textContent?.includes("TX-001")),
      ).toBe(true);
    });

    // Find the row for TX-001 and its action button
    const rows = screen.getAllByRole("row");
    const txRow = rows.find((r) => r.textContent?.includes("TX-001"));
    expect(txRow).toBeTruthy();

    const viewButton = within(txRow as HTMLElement).getByRole("button", {
      name: /View details of transaction TX-001/i,
    });

    await act(async () => {
      await userEvent.click(viewButton);
    });

    // Modal comes from ViewTransactionDetailsModal
    const modal = await screen.findByRole("dialog", {
      name: /Transaction Details/i,
    });

    expect(
      within(modal).getByText(/Transaction Information/i),
    ).toBeInTheDocument();
    expect(within(modal).getByText("TX-001")).toBeInTheDocument();
    expect(within(modal).getByText("Alice Smith")).toBeInTheDocument();
    expect(within(modal).getByText(/Payment Method/i)).toBeInTheDocument();
  });
});
