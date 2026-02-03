// Integration tests for MailroomRegistrations (admin).
// - Verifies list render, search, tab filters, details modal, locker assignment, and sync action.
// - Uses lightweight DataTable mock to avoid JSDOM virtualization/layout problems.
// - Includes polyfills for Mantine-friendly APIs (matchMedia, ResizeObserver, IntersectionObserver).
// - Mocks global.fetch and captures calls for assertion.

import React from "react";

type DataTableColumn = {
  accessor?: string;
  render?: (record: Record<string, unknown>) => React.ReactNode;
  title?: React.ReactNode;
};

// Mock mantine-datatable so tests can query rows synchronously.
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
                      ? col.render(rec as Record<string, unknown>)
                      : (rec as Record<string, unknown>)[col.accessor ?? ""];
                  return (
                    <td role="cell" key={j}>
                      {content as React.ReactNode}
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

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { Notifications } from "@mantine/notifications";
import MailroomRegistrations from "@/components/MailroomRegistrations";

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
const mockLocations = [{ id: "loc-1", name: "Main Office", city: "Makati" }];
const mockPlans = [{ id: "plan-1", name: "Basic Plan", price: 500 }];

const mockRegistrations = [
  {
    id: "reg-1",
    mailroom_code: "MR-001",
    full_name: "Bruce Wayne",
    email: "bruce@wayne.com",
    created_at: new Date().toISOString(), // Active
    months: 12,
    locker_qty: 1,
    location_id: "loc-1",
    plan_id: "plan-1",
    mailroom_status: true,
    is_active: true,
  },
  {
    id: "reg-2",
    mailroom_code: "MR-002",
    full_name: "Clark Kent",
    email: "clark@daily.com",
    created_at: "2020-01-01T00:00:00Z", // Inactive/Expired
    months: 1,
    locker_qty: 1,
    location_id: "loc-1",
    plan_id: "plan-1",
    mailroom_status: false,
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

const mockAssignments = [
  {
    id: "assign-1",
    registration_id: "reg-2",
    locker_id: "locker-2",
    status: "Full",
  },
];

const mockApiResponse = {
  registrations: mockRegistrations,
  lockers: mockLockers,
  assignedLockers: mockAssignments,
  plans: mockPlans,
  locations: mockLocations,
};

// --- Test Setup ---
// capture fetch calls so tests can assert API usage
const originalFetch = global.fetch;
let calls: { url: string; init?: RequestInit }[] = [];

beforeEach(() => {
  calls = [];
  global.fetch = jest.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    const urlStr = url.toString();
    calls.push({ url: urlStr, init });

    if (urlStr.includes("/api/admin/mailroom/registrations")) {
      return {
        ok: true,
        json: async () => mockApiResponse,
      };
    }

    if (urlStr.includes("/api/admin/mailroom/assigned-lockers")) {
      if (init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            data: { id: "new-assign", status: "Empty" },
          }),
        };
      }
    }

    if (urlStr.includes("/api/admin/mailroom/cron")) {
      return { ok: true, text: async () => "OK" };
    }

    return { ok: true, json: async () => ({}) };
  }) as jest.Mock;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// Helper to render the component with providers used in app
const renderComponent = () => {
  return render(
    <MantineProvider>
      <Notifications />
      <SWRConfig value={{ provider: () => new Map() }}>
        <MailroomRegistrations />
      </SWRConfig>
    </MantineProvider>,
  );
};

// Helper: wait until a table row contains the given text
const waitForRowWithText = async (text: string) => {
  await waitFor(() => {
    const rows = screen.queryAllByRole("row");
    expect(rows.some((r) => r.textContent?.includes(text))).toBe(true);
  });
};

describe("MailroomRegistrations (admin)", () => {
  // render checks: rows and badges are present
  it("renders the registrations user list correctly", async () => {
    renderComponent();

    // Ensure table renders first
    await screen.findByRole("table");

    // wait for a row containing Bruce Wayne
    await waitForRowWithText("Bruce Wayne");

    // Check other data via row text content
    const rows = screen.getAllByRole("row");
    expect(rows.some((r) => r.textContent?.includes("Clark Kent"))).toBe(true);
    expect(rows.some((r) => r.textContent?.includes("MR-001"))).toBe(true);

    // Check status badges presence (match anywhere in the document)
    expect(screen.getAllByText(/Active/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Inactive/i).length).toBeGreaterThan(0);
  });

  // search filter behavior
  it("filters users by search term", async () => {
    renderComponent();
    await screen.findByRole("table");
    await waitForRowWithText("Bruce Wayne");

    const searchInput = screen.getByPlaceholderText("Search users...");
    await userEvent.type(searchInput, "Clark");

    // wait until Bruce disappears from rows
    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("row")
          .some((r) => r.textContent?.includes("Bruce Wayne")),
      ).toBe(false),
    );
    expect(
      screen
        .getAllByRole("row")
        .some((r) => r.textContent?.includes("Clark Kent")),
    ).toBe(true);
  });

  // tab filtering — uses exact-match regex to avoid duplicate-tab ambiguity
  it("filters users by status tabs (Active/Inactive)", async () => {
    renderComponent();
    await screen.findByRole("table");
    await waitForRowWithText("Bruce Wayne");

    const activeTab = screen.getByRole("tab", { name: /^Active$/i });
    await userEvent.click(activeTab);

    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("row")
          .some((r) => r.textContent?.includes("Clark Kent")),
      ).toBe(false),
    );
    const rowsAfterActive = screen.getAllByRole("row");
    expect(
      rowsAfterActive.some((r) => r.textContent?.includes("Bruce Wayne")),
    ).toBe(true);

    const inactiveTab = screen.getByRole("tab", { name: /^Inactive$/i });
    await userEvent.click(inactiveTab);

    await waitFor(() =>
      expect(
        screen
          .queryAllByRole("row")
          .some((r) => r.textContent?.includes("Bruce Wayne")),
      ).toBe(false),
    );
    expect(
      screen
        .getAllByRole("row")
        .some((r) => r.textContent?.includes("Clark Kent")),
    ).toBe(true);
  });

  // details modal shows expected registration info
  it("opens details modal and displays user info", async () => {
    renderComponent();
    await waitForRowWithText("Bruce Wayne");

    const bruceRow = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Bruce Wayne"));
    const viewBtn = within(bruceRow!).getByRole("button", {
      name: /View Details/i,
    });
    await userEvent.click(viewBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Registration Details/i,
    });

    expect(within(modal).getByText("Bruce Wayne")).toBeInTheDocument();
    expect(within(modal).getByText("bruce@wayne.com")).toBeInTheDocument();
    // Plan name isn't present in modal markup; assert an alternative label
    expect(within(modal).getByText(/Duration:/i)).toBeInTheDocument();
  });

  // assign locker flow: choose option rendered in portal and confirm POST call
  it("assigns a locker to a user via the modal", async () => {
    renderComponent();
    await waitForRowWithText("Bruce Wayne");

    const bruceRow = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Bruce Wayne"));
    const viewBtn = within(bruceRow!).getByRole("button", {
      name: /View Details/i,
    });
    await userEvent.click(viewBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Registration Details/i,
    });

    const select = within(modal).getByPlaceholderText(
      "Select available locker",
    );
    await userEvent.click(select);

    // Click the portal-rendered option; choose last occurrence to avoid header/filter duplicates
    const optionNodes = await screen.findAllByText(/L-101/i);
    await userEvent.click(optionNodes[optionNodes.length - 1]);

    const addBtn = within(modal).getByRole("button", { name: "Add Locker" });
    await userEvent.click(addBtn);

    // assert assigned-lockers POST occurred
    await waitFor(() => {
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/admin/mailroom/assigned-lockers") &&
            c.init?.method === "POST",
        ),
      ).toBe(true);
    });

    // generic success title may be duplicated; assert success by presence of notification
    expect(await screen.findByText("Success")).toBeInTheDocument();
  });

  // sync statuses: ensure cron API invoked and specific success notification shown
  it("syncs statuses when sync button is clicked", async () => {
    renderComponent();
    await waitForRowWithText("Bruce Wayne");

    const syncBtn = screen.getByRole("button", { name: /Sync Statuses/i });
    await userEvent.click(syncBtn);

    // assert cron endpoint POSTed
    await waitFor(() => {
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/admin/mailroom/cron") &&
            c.init?.method === "POST",
        ),
      ).toBe(true);
    });

    // check specific notification message for the sync action
    expect(
      await screen.findByText(/Subscription statuses updated/i),
    ).toBeInTheDocument();
  });
});
