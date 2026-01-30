// Integration tests for Admin Mailrooms page (admin/mailrooms).
// - Tests the page route renders correctly with layout and title.
// - Verifies the MailroomRegistrations component is properly integrated.
// - Exercises search, filtering, tab navigation, and locker assignment flows.
// - Mocks mantine-datatable to avoid virtualization/layout issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver).
// - Captures global.fetch calls to assert API usage and responses.

import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { Notifications } from "@mantine/notifications";
import MailroomRegistrationsPage from "@/app/admin/mailrooms/page";

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
      "aria-label"?: string;
    }) => {
      const records = props.records ?? [];
      const columns = props.columns ?? [];
      return (
        <table
          role="table"
          aria-label={props["aria-label"] ?? "Registrations list"}
        >
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

// Polyfills / shims required by Mantine and component behavior.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

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
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as new (
    cb?: IntersectionObserverCallback,
    opts?: IntersectionObserverInit,
  ) => IntersectionObserver;
}

Element.prototype.scrollIntoView = jest.fn();

// Mock URL.createObjectURL and revokeObjectURL for file previews
global.URL.createObjectURL = jest.fn(() => "blob:http://localhost/test");
global.URL.revokeObjectURL = jest.fn();

// --- Mock data and fetch capture ---
const mockRegistrations = [
  {
    id: "reg-1",
    mailroom_code: "MR-001",
    full_name: "Alice Smith",
    email: "alice@example.com",
    phone_number: "09171234567",
    created_at: new Date().toISOString(),
    months: 12,
    locker_qty: 1,
    location_id: "loc-1",
    plan_id: "plan-1",
    mailroom_status: true,
    location_name: "Main Office",
    plan_name: "Basic Plan",
    is_active: true,
  },
  {
    id: "reg-2",
    mailroom_code: "MR-002",
    full_name: "Bob Jones",
    email: "bob@example.com",
    phone_number: "09171234568",
    created_at: "2020-01-01T00:00:00Z",
    months: 1,
    locker_qty: 1,
    location_id: "loc-1",
    plan_id: "plan-1",
    mailroom_status: false,
    location_name: "Main Office",
    plan_name: "Basic Plan",
    is_active: false,
  },
];

const mockLockers = [
  {
    id: "locker-1",
    locker_code: "L-101",
    is_available: true,
    location_id: "loc-1",
  },
  {
    id: "locker-2",
    locker_code: "L-102",
    is_available: false,
    location_id: "loc-1",
  },
];

const mockLocations = [
  {
    id: "loc-1",
    name: "Main Office",
    city: "Makati",
    region: "NCR",
  },
];

const mockPlans = [
  {
    id: "plan-1",
    name: "Basic Plan",
    price: 500,
  },
];

const mockAssignments: unknown[] = [];

let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

// Setup global.fetch mock
beforeEach(() => {
  fetchCalls = [];
  mockSearchParams.delete("tab");
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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

      // GET session - mock authenticated admin user
      if (
        url.includes("/api/session") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET")
      ) {
        return makeResponse({
          ok: true,
          user: {
            id: "admin-user-id",
            email: "admin1@example.com",
          },
          profile: {
            id: "admin-profile-id",
            email: "admin1@example.com",
          },
          role: "admin",
          kyc: {
            status: "VERIFIED",
          },
          needs_onboarding: false,
        });
      }

      // GET registrations
      if (
        url.includes("/api/admin/mailroom/registrations") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET") &&
        !url.includes("/search")
      ) {
        return makeResponse({
          registrations: mockRegistrations,
          lockers: mockLockers,
          assignedLockers: mockAssignments,
          plans: mockPlans,
          locations: mockLocations,
        });
      }

      // GET registrations search
      if (
        url.includes("/api/admin/mailroom/registrations/search") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET")
      ) {
        return makeResponse({
          data: mockRegistrations,
        });
      }

      // POST assign locker
      if (
        url.includes("/api/admin/mailroom/assigned-lockers") &&
        init &&
        (init.method ?? "").toUpperCase() === "POST"
      ) {
        return makeResponse({
          ok: true,
          data: { id: "assign-1", status: "Empty" },
        });
      }

      // POST sync statuses (cron)
      if (
        url.includes("/api/admin/mailroom/cron") &&
        init &&
        (init.method ?? "").toUpperCase() === "POST"
      ) {
        return makeResponse({ ok: true });
      }

      return makeResponse({ error: "not found" }, false, 404);
    },
  ) as jest.Mock;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// render helper with providers used by the component
const renderComponent = () =>
  render(
    <MantineProvider>
      <Notifications />
      <SWRConfig value={{ provider: () => new Map() }}>
        <MailroomRegistrationsPage />
      </SWRConfig>
    </MantineProvider>,
  );

// helper: wait until a table row contains the given text
const waitForRowWithText = async (text: string) => {
  await waitFor(() => {
    expect(screen.getByText(text)).toBeInTheDocument();
  });
};

describe("Admin Mailrooms Page (admin/mailrooms)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================
  // PAGE RENDERING TESTS
  // ============================================

  describe("Page Rendering", () => {
    it("renders the page with correct title and layout", async () => {
      renderComponent();

      // Check that the page title is rendered
      await waitFor(() => {
        expect(screen.getByText(/Mailroom Registrations/i)).toBeInTheDocument();
      });

      // Check that the layout is rendered
      expect(screen.getByTestId("private-main-layout")).toBeInTheDocument();

      // Wait for table to render
      await screen.findByRole("table");
    });

    it("renders registrations list correctly", async () => {
      renderComponent();

      // Wait for table to render
      await screen.findByRole("table");
      await waitForRowWithText("Alice Smith");

      // Check that registrations are displayed
      const rows = screen.queryAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("Alice Smith"))).toBe(
        true,
      );
      expect(rows.some((r) => r.textContent?.includes("Bob Jones"))).toBe(true);
      expect(rows.some((r) => r.textContent?.includes("MR-001"))).toBe(true);
    });
  });

  // ============================================
  // SEARCH AND FILTERING TESTS
  // ============================================

  describe("Search and Filtering", () => {
    it("filters users by search term", async () => {
      renderComponent();

      await screen.findByRole("table");
      await waitForRowWithText("Alice Smith");

      const searchInput = screen.getByPlaceholderText("Search users...");
      await userEvent.type(searchInput, "Bob");

      // Wait until Alice disappears from rows
      await waitFor(() => {
        const rows = screen.queryAllByRole("row");
        expect(rows.some((r) => r.textContent?.includes("Alice Smith"))).toBe(
          false,
        );
      });

      // Bob should still be visible
      const rows = screen.queryAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("Bob Jones"))).toBe(true);
    });

    it("filters users by status tabs (Active/Inactive)", async () => {
      renderComponent();

      await screen.findByRole("table");
      await waitForRowWithText("Alice Smith");

      // Click Active tab
      const activeTab = screen.getByRole("tab", { name: /^Active$/i });
      await userEvent.click(activeTab);

      // Wait for filter to apply
      await waitFor(() => {
        const rows = screen.queryAllByRole("row");
        expect(rows.some((r) => r.textContent?.includes("Bob Jones"))).toBe(
          false,
        );
      });

      // Alice should still be visible (active)
      const rows = screen.queryAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("Alice Smith"))).toBe(
        true,
      );

      // Click Inactive tab
      const inactiveTab = screen.getByRole("tab", { name: /^Inactive$/i });
      await userEvent.click(inactiveTab);

      // Wait for filter to apply
      await waitFor(() => {
        const rows = screen.queryAllByRole("row");
        expect(rows.some((r) => r.textContent?.includes("Alice Smith"))).toBe(
          false,
        );
      });

      // Bob should be visible (inactive)
      const rowsAfter = screen.queryAllByRole("row");
      expect(rowsAfter.some((r) => r.textContent?.includes("Bob Jones"))).toBe(
        true,
      );
    });
  });

  // ============================================
  // USER DETAILS AND LOCKER ASSIGNMENT TESTS
  // ============================================

  describe("User Details and Locker Assignment", () => {
    it("opens details modal and displays user info", async () => {
      renderComponent();

      await waitForRowWithText("Alice Smith");

      const aliceRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.includes("Alice Smith"));
      const viewBtn = within(aliceRow!).getByRole("button", {
        name: /View Details/i,
      });

      await act(async () => {
        await userEvent.click(viewBtn);
      });

      // Wait for modal to open - using actual Mantine Modal which handles React element titles
      const modal = await screen.findByRole("dialog", {
        name: /Registration Details/i,
      });

      expect(within(modal).getByText("Alice Smith")).toBeInTheDocument();
      expect(within(modal).getByText("alice@example.com")).toBeInTheDocument();
      expect(within(modal).getByText(/Duration:/i)).toBeInTheDocument();
    });

    it("assigns a locker to a user via the modal", async () => {
      renderComponent();

      // Wait for table to fully render
      await screen.findByRole("table");
      await waitFor(() => {
        expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument();
      });

      await waitForRowWithText("Alice Smith");

      // Wait a bit more for full rendering
      await new Promise((resolve) => setTimeout(resolve, 500));

      const aliceRow = screen
        .getAllByRole("row")
        .find((r) => r.textContent?.includes("Alice Smith"));
      expect(aliceRow).toBeTruthy();

      const viewBtn = within(aliceRow!).getByRole("button", {
        name: /View Details/i,
      });

      await act(async () => {
        await userEvent.click(viewBtn);
      });

      // Wait for modal to open - using actual Mantine Modal which handles React element titles
      const modal = await screen.findByRole("dialog", {
        name: /Registration Details/i,
      });

      // Find and click the locker select
      const select = within(modal).getByPlaceholderText(
        "Select available locker",
      );
      await act(async () => {
        await userEvent.click(select);
      });

      // Wait for dropdown to open
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Find and click locker option - filter for Select options (have value attribute)
      await waitFor(() => {
        const allOptions = document.querySelectorAll('[role="option"][value]');
        const selectOptions = Array.from(allOptions).filter((opt) => {
          const text = opt.textContent || "";
          return text.includes("L-101");
        });
        expect(selectOptions.length).toBeGreaterThan(0);
      });

      const allOptions = Array.from(
        document.querySelectorAll('[role="option"][value]'),
      );
      const lockerOption = allOptions.find((opt) =>
        opt.textContent?.includes("L-101"),
      ) as HTMLElement;

      expect(lockerOption).toBeTruthy();

      // Click the locker option to select it
      await act(async () => {
        await userEvent.click(lockerOption!);
      });

      // Wait for selection to register and button to be enabled
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Click Add button - should be enabled now
      const addBtn = within(modal).getByRole("button", { name: "Add Locker" });
      expect(addBtn).not.toBeDisabled();

      await act(async () => {
        await userEvent.click(addBtn);
      });

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Assert POST was called
      await waitFor(() => {
        expect(
          fetchCalls.some(
            (c) =>
              c.url.includes("/api/admin/mailroom/assigned-lockers") &&
              c.init?.method === "POST",
          ),
        ).toBe(true);
      });
    });
  });

  // ============================================
  // SYNC STATUSES TEST
  // ============================================

  describe("Sync Statuses", () => {
    it("syncs statuses when sync button is clicked", async () => {
      renderComponent();

      await waitForRowWithText("Alice Smith");

      const syncBtn = screen.getByRole("button", { name: /Sync Statuses/i });
      await userEvent.click(syncBtn);

      // Assert cron endpoint was called
      await waitFor(() => {
        expect(
          fetchCalls.some(
            (c) =>
              c.url.includes("/api/admin/mailroom/cron") &&
              c.init?.method === "POST",
          ),
        ).toBe(true);
      });
    });
  });
});
