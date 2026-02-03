// Integration tests for customer subscription history tab (Account › Subscription History).
// - Verifies transactions are fetched from the user transactions API and rendered in the table.
// - Exercises loading, empty, error, and pagination states.
// - Verifies that clicking the "view details" action opens the shared transaction details modal.
// - Mocks mantine-datatable via AdminTable to avoid virtualization/layout issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver).
// - Captures global.fetch calls to assert API usage and responses.

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { Notifications, notifications } from "@mantine/notifications";
import SubscriptionHistoryTab from "@/components/pages/customer/Account/SubscriptionHistoryTab";

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

// Mock SessionProvider to provide a logged-in user id
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "user-1" },
    },
  }),
}));

// Mock the notifications library (keep actual Notifications component for rendering)
jest.mock("@mantine/notifications", () => {
  const actual = jest.requireActual("@mantine/notifications");
  return {
    ...actual,
    notifications: {
      show: jest.fn(),
      hide: jest.fn(),
      clean: jest.fn(),
      update: jest.fn(),
      cleanQueue: jest.fn(),
    },
  };
});

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
  total: mockRawTransactions.length,
  page: 1,
  limit: 10,
  offset: 0,
  has_more: false,
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

// Helper to render the tab with providers
const renderComponent = () =>
  render(
    <MantineProvider>
      <Notifications />
      <SubscriptionHistoryTab />
    </MantineProvider>,
  );

describe("Customer Subscription History Tab", () => {
  jest.setTimeout(15000);

  beforeEach(() => {
    fetchCalls = [];
    (notifications.show as jest.Mock).mockClear();

    global.fetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = String(input);
        fetchCalls.push({ url: urlString, init });

        // User transactions list
        if (
          urlString.includes("/api/user/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          return makeResponse({
            data: mockRawTransactions,
            meta: {
              pagination: mockPagination,
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
  // BASIC RENDERING & DATA
  // ============================================

  it("renders customer transactions table after loading", async () => {
    renderComponent();

    // Shows loading state first
    expect(screen.getByText(/Loading transactions\.\.\./i)).toBeInTheDocument();

    // Then renders table with transactions
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
  // PAGINATION
  // ============================================

  it("requests a different page when pagination changes", async () => {
    // Adjust mockPagination for this test to simulate more pages
    const paginationWithMore = { ...mockPagination, total: 20 };

    (global.fetch as jest.Mock).mockImplementationOnce(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlString = String(input);
        fetchCalls.push({ url: urlString, init });

        if (
          urlString.includes("/api/user/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          return makeResponse({
            data: mockRawTransactions,
            meta: {
              pagination: paginationWithMore,
            },
          });
        }

        return makeResponse({ error: "not found" }, false, 404);
      },
    );

    renderComponent();

    await screen.findByRole("table");

    // Initial call with page=1
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/user/transactions") &&
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
            c.url.includes("/api/user/transactions") &&
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
          urlString.includes("/api/user/transactions") &&
          (!init || (init.method ?? "GET").toUpperCase() === "GET")
        ) {
          return makeResponse({
            data: [],
            meta: {
              pagination: {
                total: 0,
                page: 1,
                limit: 10,
                offset: 0,
                has_more: false,
              },
            },
          });
        }

        return makeResponse({ error: "not found" }, false, 404);
      },
    );

    renderComponent();

    // Wait for empty state message
    await waitFor(() => {
      expect(screen.getByText(/No transactions found\./i)).toBeInTheDocument();
    });
  });

  // ============================================
  // ERROR STATE
  // ============================================

  it("shows an error message and notification when the API request fails", async () => {
    // Suppress expected error log from the component so it doesn't clutter test output
    const originalConsoleError = console.error;
    console.error = jest.fn((...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0] : String(args[0]);
      if (msg.includes("Error fetching transactions")) return;
      originalConsoleError.call(console, ...args);
    });

    try {
      (global.fetch as jest.Mock).mockImplementationOnce(
        async (input: RequestInfo | URL, init?: RequestInit) => {
          const urlString = String(input);
          fetchCalls.push({ url: urlString, init });

          if (
            urlString.includes("/api/user/transactions") &&
            (!init || (init.method ?? "GET").toUpperCase() === "GET")
          ) {
            return makeResponse(
              { error: "Failed to load transactions" },
              false,
              500,
            );
          }

          return makeResponse({ error: "not found" }, false, 404);
        },
      );

      renderComponent();

      // Error state rendered in the tab
      await waitFor(() => {
        expect(
          screen.getByText(/Failed to load transactions/i),
        ).toBeInTheDocument();
      });

      // Notification shown
      expect(notifications.show).toHaveBeenCalled();
    } finally {
      console.error = originalConsoleError;
    }
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

    // Modal comes from shared ViewTransactionDetailsModal
    const modal = await screen.findByRole("dialog", {
      name: /Transaction Details/i,
    });

    expect(within(modal).getByText(/Payment Information/i)).toBeInTheDocument();
    expect(within(modal).getByText("TX-001")).toBeInTheDocument();
    expect(within(modal).getByText(/Payment Method/i)).toBeInTheDocument();
  });
});
