// filepath: c:\Users\Raitoningu\code\keep-ph\__tests__\integration\mailroomLockers.test.tsx
// Integration tests for MailroomLockers (admin).
// - Verifies listing, search, tab filtering (Available / Occupied).
// - Exercises Add / Edit / Delete flows through modal dialogs.
// - Ensures correct API calls (GET/POST/PUT/DELETE) are made.
// - Mocks mantine-datatable to render a simple table in tests.
// - Provides JSDOM polyfills (ResizeObserver) and a scrollIntoView mock for Mantine.
//
// Notes:
// - Tests stub global.fetch per test to return deterministic data.
// - The DataTable mock renders columns via the provided `render` functions so tests
//   can assert visible values without relying on the real datatable implementation.
// - Keep tests focused: assert API calls and key UI behaviors rather than full visual rendering.

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

// Mock mantine-datatable so DataTable renders synchronously in tests.
// The mock converts each cell to a simple string/element so table rows are stable.
jest.mock("mantine-datatable", () => {
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

  return {
    __esModule: true,
    DataTable: ({
      records = [],
      columns = [],
      "aria-label": ariaLabel,
      sortStatus,
      onSortStatusChange,
    }: {
      records?: Record<string, unknown>[];
      columns?: {
        title?: React.ReactNode;
        accessor?: string;
        render?: (r: Record<string, unknown>) => React.ReactNode;
        sortable?: boolean;
      }[];
      sortStatus?: { columnAccessor: string; direction: "asc" | "desc" };
      onSortStatusChange?: (s: {
        columnAccessor: string;
        direction: "asc" | "desc";
      }) => void;
      [key: string]: unknown;
    }) =>
      React.createElement(
        "table",
        { "aria-label": (ariaLabel as string) || "Lockers list" },
        React.createElement(
          "thead",
          null,
          React.createElement(
            "tr",
            null,
            (columns || []).map((c, i) => {
              const accessor = String(c.accessor ?? "");
              const handleSort = () => {
                if (!c.sortable || !onSortStatusChange || !accessor) return;

                // Determine next sort direction without nested ternaries:
                // - default to "asc" on first click
                // - toggle to "desc" if already sorting by this column
                let direction: "asc" | "desc" = "asc";
                if (
                  sortStatus &&
                  sortStatus.columnAccessor === accessor &&
                  sortStatus.direction === "asc"
                ) {
                  direction = "desc";
                }

                onSortStatusChange({
                  columnAccessor: accessor,
                  direction,
                });
              };
              return React.createElement(
                "th",
                {
                  key: i,
                  role: "columnheader",
                  onClick: handleSort,
                },
                safeRender(c.title),
              );
            }),
          ),
        ),
        React.createElement(
          "tbody",
          null,
          (records || []).map((r) =>
            React.createElement(
              "tr",
              {
                key: String((r as Record<string, unknown>).id ?? Math.random()),
              },
              (columns || []).map((col, idx) => {
                const cell =
                  col && typeof col.render === "function"
                    ? col.render(r as Record<string, unknown>)
                    : (r as Record<string, unknown>)[
                        String(col?.accessor ?? "")
                      ];
                return React.createElement(
                  "td",
                  { key: idx },
                  safeRender(cell),
                );
              }),
            ),
          ),
        ),
      ),
  };
});

// import component after mocks
import MailroomLockers from "@/components/MailroomLockers";

// mock next/navigation search params used by the component
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    // component only calls `.get("tab")` on mount — return null by default
    get: () => null,
  }),
}));

// polyfill ResizeObserver for JSDOM (Mantine components expect it)
type TestRO = { observe(): void; unobserve(): void; disconnect(): void };
const g = globalThis as unknown as { ResizeObserver?: new () => TestRO };
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// Polyfill scrollIntoView used by Mantine combobox behavior in tests
Element.prototype.scrollIntoView = jest.fn();

jest.setTimeout(15000);

describe("MailroomLockers (admin)", () => {
  // Minimal location and locker fixtures used across tests.
  const locations = [
    { id: "loc-1", name: "Main Office" },
    { id: "loc-2", name: "Branch" },
  ];

  const lockers = [
    {
      location_locker_id: "L1",
      location_locker_code: "A-101",
      mailroom_location_id: "loc-1",
      location_locker_is_available: true,
      location_locker_is_assignable: true,
      location: {
        mailroom_location_id: "loc-1",
        mailroom_location_name: "Main Office",
      },
      assigned: null,
    },
    {
      location_locker_id: "L2",
      location_locker_code: "B-201",
      mailroom_location_id: "loc-2",
      location_locker_is_available: false,
      location_locker_is_assignable: false,
      location: {
        mailroom_location_id: "loc-2",
        mailroom_location_name: "Branch",
      },
      assigned: {
        mailroom_assigned_locker_id: "asg-1",
        mailroom_assigned_locker_status: "Near Full",
        registration: { full_name: "Jane Doe" },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Default fetch handler: supports locations GET and lockers GET (with search/tab).
    // Individual tests override globalThis.fetch when they need POST/PUT/DELETE assertions.
    (globalThis.fetch as unknown) = jest.fn(
      async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes("/api/admin/mailroom/locations")) {
          return {
            ok: true,
            json: async () => ({ data: locations }),
          } as unknown as Response;
        }
        if (url.includes("/api/admin/mailroom/lockers")) {
          const u = new URL(url, "http://localhost");
          const search = (u.searchParams.get("search") || "").toLowerCase();
          const activeTab = u.searchParams.get("activeTab") || "all";
          let filtered = lockers.slice();
          if (search)
            filtered = filtered.filter((l) =>
              l.location_locker_code?.toLowerCase().includes(search),
            );
          if (activeTab === "available")
            filtered = filtered.filter((l) => l.location_locker_is_available);
          if (activeTab === "occupied")
            filtered = filtered.filter((l) => !l.location_locker_is_available);
          return {
            ok: true,
            json: async () => ({
              data: filtered,
              pagination: {
                page: 1,
                pageSize: 10,
                totalCount: filtered.length,
                totalPages: 1,
              },
            }),
          } as unknown as Response;
        }
        return {
          ok: false,
          text: async () => "not found",
        } as unknown as Response;
      },
    ) as typeof global.fetch;
  });

  function renderComponent() {
    // SWRConfig with Map provider prevents shared test cache between renders.
    return render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomLockers />
        </MantineProvider>
      </SWRConfig>,
    );
  }

  it("renders lockers list with locations and statuses", async () => {
    renderComponent();

    // wait for table element to appear
    const table = await screen.findByRole("table", { name: /Lockers list/i });
    expect(table).toBeInTheDocument();

    // confirm fetch was called and rows are present
    await waitFor(() => {
      expect(
        (globalThis.fetch as jest.Mock).mock.calls.some((c: unknown[]) =>
          String(c[0]).includes("/api/admin/mailroom/lockers"),
        ),
      ).toBe(true);
      const rows = table.querySelectorAll("tbody tr");
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  it("filters lockers by search and by tabs", async () => {
    renderComponent();

    // wait for initial rows
    const table = await screen.findByRole("table", { name: /Lockers list/i });
    await waitFor(() => {
      expect(table.querySelectorAll("tbody tr").length).toBeGreaterThan(0);
    });

    // Search for B-201 -> assert API called with search param.
    const searchInput = screen.getByLabelText(
      "Search lockers",
    ) as HTMLInputElement;
    await userEvent.type(searchInput, "B-201");
    const submitBtn = screen.getAllByLabelText("Submit search")[0];
    await userEvent.click(submitBtn);

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") &&
            u.includes("search=B-201"),
        ),
      ).toBe(true);
    });

    // Clear search and verify fetch called without search filter
    const clearBtn = screen.getByLabelText("Clear search");
    await userEvent.click(clearBtn);
    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") && /search=(&|$)/.test(u),
        ),
      ).toBe(true);
    });

    // Switch to "Available" tab -> backend should receive activeTab=available
    const availableTab = screen.getByRole("tab", { name: /Available/i });
    await userEvent.click(availableTab);
    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") &&
            u.includes("activeTab=available"),
        ),
      ).toBe(true);
    });

    // Switch to "Occupied" tab -> backend should receive activeTab=occupied
    const occupiedTab = screen.getByRole("tab", { name: /Occupied/i });
    await userEvent.click(occupiedTab);
    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") &&
            u.includes("activeTab=occupied"),
        ),
      ).toBe(true);
    });
  });

  it("adds a locker via the Add Locker form", async () => {
    // install a fetch handler supporting GET/POST for this test so we can assert POST payload.
    const serverFetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method || "GET").toUpperCase();

        if (url.includes("/api/admin/mailroom/locations")) {
          return {
            ok: true,
            json: async () => ({ data: locations }),
          } as unknown as Response;
        }

        if (url.includes("/api/admin/mailroom/lockers") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              data: lockers,
              pagination: {
                page: 1,
                pageSize: 10,
                totalCount: lockers.length,
                totalPages: 1,
              },
            }),
          } as unknown as Response;
        }

        if (url.includes("/api/admin/mailroom/lockers") && method === "POST") {
          // echo created locker, include is_assignable returned value
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return {
            ok: true,
            json: async () => ({
              data: {
                location_locker_id: "NEW",
                location_locker_code: body.locker_code,
                mailroom_location_id: body.location_id,
                location_locker_is_available: true,
                location_locker_is_assignable: body.is_assignable ?? true,
                location: {
                  mailroom_location_id: body.location_id,
                  mailroom_location_name: "Main Office",
                },
                assigned: null,
              },
            }),
          } as unknown as Response;
        }

        return {
          ok: false,
          text: async () => "not found",
        } as unknown as Response;
      },
    ) as unknown as typeof global.fetch;

    globalThis.fetch = serverFetch;

    renderComponent();

    // wait for table to render
    await screen.findByRole("table", { name: /Lockers list/i });

    // open add modal
    let addBtn;
    try {
      addBtn = await screen.findByLabelText("Add new locker");
    } catch {
      addBtn = await screen.findByRole("button", {
        name: /(?:Add Locker|Add)/i,
      });
    }
    await userEvent.click(addBtn);

    // fill modal fields and select location via type + keyboard
    const addDialog = await screen.findByRole("dialog", {
      name: /Add Locker/i,
    });
    const codeInput = await within(addDialog).findByLabelText(/Locker Code/i);
    await userEvent.type(codeInput, "C-300");

    const locInput = within(addDialog).getByPlaceholderText("Select location");
    await userEvent.click(locInput);
    await userEvent.type(locInput, "Main Office");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    // submit and assert POST called with expected body
    const saveBtn = await within(addDialog).findByLabelText(
      "Save locker details",
    );
    await userEvent.click(saveBtn);

    await waitFor(() => {
      const calls = (serverFetch as jest.Mock).mock.calls.map((c) => ({
        url: String(c[0]),
        init: c[1],
      }));
      expect(
        calls.some(
          (c) =>
            c.url.includes("/api/admin/mailroom/lockers") &&
            c.init?.method === "POST",
        ),
      ).toBe(true);
      const postCall = calls.find(
        (c) =>
          c.url.includes("/api/admin/mailroom/lockers") &&
          c.init?.method === "POST",
      );
      expect(postCall).toBeTruthy();
      const sent =
        postCall && postCall.init && postCall.init.body
          ? JSON.parse(String(postCall.init.body))
          : {};
      expect(sent.locker_code).toBe("C-300");
      expect(sent.location_id).toBeDefined();
      expect(sent.is_assignable).toBe(true);
    });
  });

  it("edits an existing locker and saves changes", async () => {
    // server returns lockers on GET and echoes PUT updates for L1
    const serverFetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method || "GET").toUpperCase();

        if (url.includes("/api/admin/mailroom/locations")) {
          return {
            ok: true,
            json: async () => ({ data: locations }),
          } as unknown as Response;
        }

        if (url.includes("/api/admin/mailroom/lockers") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              data: lockers,
              pagination: {
                page: 1,
                pageSize: 10,
                totalCount: lockers.length,
                totalPages: 1,
              },
            }),
          } as unknown as Response;
        }

        // accept PUT to specific locker id and return updated locker shape
        if (
          url.match(/\/api\/admin\/mailroom\/lockers\/.+/) &&
          method === "PUT"
        ) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return {
            ok: true,
            json: async () => ({
              data: {
                location_locker_id: "L1",
                location_locker_code: body.locker_code,
                mailroom_location_id: body.location_id,
                location_locker_is_available: true,
                location_locker_is_assignable: body.is_assignable ?? true,
                location: {
                  mailroom_location_id: body.location_id,
                  mailroom_location_name: "Main Office",
                },
                assigned: lockers[0].assigned,
              },
            }),
          } as unknown as Response;
        }

        return {
          ok: false,
          text: async () => "not found",
        } as unknown as Response;
      },
    ) as unknown as typeof global.fetch;

    globalThis.fetch = serverFetch;

    renderComponent();

    // open edit for A-101 and change locker code
    await screen.findByRole("table", { name: /Lockers list/i });
    const editBtn = await screen.findByLabelText(/Edit locker A-101/i);
    await userEvent.click(editBtn);

    const codeInput = (await screen.findByLabelText(
      /Locker Code/i,
    )) as HTMLInputElement;
    await userEvent.clear(codeInput);
    await userEvent.type(codeInput, "A-101-UPDATED");

    // save and assert PUT called with updated code
    await userEvent.click(screen.getByLabelText("Save locker details"));
    await waitFor(() => {
      const calls = (serverFetch as jest.Mock).mock.calls.map((c) => ({
        url: String(c[0]),
        init: c[1],
      }));
      expect(
        calls.some(
          (c) =>
            c.url.match(/\/api\/admin\/mailroom\/lockers\/L1/) &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
      const putCall = calls.find(
        (c) =>
          c.url.match(/\/api\/admin\/mailroom\/lockers\/L1/) &&
          c.init?.method === "PUT",
      );
      const sent =
        putCall && putCall.init && putCall.init.body
          ? JSON.parse(String(putCall.init.body))
          : {};
      expect(sent.locker_code).toBe("A-101-UPDATED");
    });
  });

  it("deletes a locker after confirming the delete modal", async () => {
    // server supports DELETE for L1 and returns success
    const serverFetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method || "GET").toUpperCase();

        if (url.includes("/api/admin/mailroom/locations")) {
          return {
            ok: true,
            json: async () => ({ data: locations }),
          } as unknown as Response;
        }

        if (url.includes("/api/admin/mailroom/lockers") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              data: lockers,
              pagination: {
                page: 1,
                pageSize: 10,
                totalCount: lockers.length,
                totalPages: 1,
              },
            }),
          } as unknown as Response;
        }

        if (
          url.match(/\/api\/admin\/mailroom\/lockers\/.+/) &&
          method === "DELETE"
        ) {
          return { ok: true, json: async () => ({}) } as unknown as Response;
        }

        return {
          ok: false,
          text: async () => "not found",
        } as unknown as Response;
      },
    ) as unknown as typeof global.fetch;

    globalThis.fetch = serverFetch;

    renderComponent();

    // open delete for A-101 and confirm
    await screen.findByRole("table", { name: /Lockers list/i });
    const deleteBtn = await screen.findByLabelText(/Delete locker A-101/i);
    await userEvent.click(deleteBtn);

    const confirmDialog = await screen.findByRole("dialog", {
      name: /Confirm Deletion/i,
    });
    const confirmBtn = within(confirmDialog).getByLabelText(
      "Confirm locker deletion",
    );
    await userEvent.click(confirmBtn);

    // assert DELETE called
    await waitFor(() => {
      const calls = (serverFetch as jest.Mock).mock.calls.map((c) => ({
        url: String(c[0]),
        init: c[1],
      }));
      expect(
        calls.some(
          (c) =>
            c.url.match(/\/api\/admin\/mailroom\/lockers\/L1/) &&
            c.init?.method === "DELETE",
        ),
      ).toBe(true);
    });

    // global success alert should appear in UI
    expect(
      await screen.findByText(/Locker deleted successfully/i),
    ).toBeInTheDocument();
  });

  it("toggles assignable in edit modal and sends is_assignable", async () => {
    // server responds to GET and echoes back PUT updates for L2 so we can assert payload
    const serverFetch = jest.fn(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = (init?.method || "GET").toUpperCase();

        if (url.includes("/api/admin/mailroom/locations")) {
          return {
            ok: true,
            json: async () => ({ data: locations }),
          } as unknown as Response;
        }

        if (url.includes("/api/admin/mailroom/lockers") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              data: lockers,
              pagination: {
                page: 1,
                pageSize: 10,
                totalCount: lockers.length,
                totalPages: 1,
              },
            }),
          } as unknown as Response;
        }

        if (
          url.match(/\/api\/admin\/mailroom\/lockers\/.+/) &&
          method === "PUT"
        ) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return {
            ok: true,
            json: async () => ({
              data: {
                location_locker_id: "L2",
                location_locker_code: body.locker_code,
                mailroom_location_id: body.location_id,
                location_locker_is_available: true,
                location_locker_is_assignable: body.is_assignable ?? true,
                location: {
                  mailroom_location_id: body.location_id,
                  mailroom_location_name: "Branch",
                },
                assigned: lockers[1].assigned,
              },
            }),
          } as unknown as Response;
        }

        return {
          ok: false,
          text: async () => "not found",
        } as unknown as Response;
      },
    ) as unknown as typeof global.fetch;

    globalThis.fetch = serverFetch;

    renderComponent();

    // open edit modal for B-201 (initial assignable=false in fixture)
    await screen.findByRole("table", { name: /Lockers list/i });
    const editBtn = await screen.findByLabelText(/Edit locker B-201/i);
    await userEvent.click(editBtn);

    const dialog = await screen.findByRole("dialog", { name: /Edit Locker/i });

    // the Assignable control is a Switch -> role "switch"
    const assignableSwitch = within(dialog).getByRole("switch", {
      name: /Set locker assignable/i,
    });
    // initial state should reflect fixture (unchecked == not assignable)
    expect(assignableSwitch).not.toBeChecked();

    // toggle to true (assignable) and save
    await userEvent.click(assignableSwitch);
    expect(assignableSwitch).toBeChecked();

    const saveBtn = within(dialog).getByLabelText("Save locker details");
    await userEvent.click(saveBtn);

    // assert PUT payload includes is_assignable: true
    await waitFor(() => {
      const calls = (serverFetch as jest.Mock).mock.calls.map((c) => ({
        url: String(c[0]),
        init: c[1],
      }));
      const putCall = calls.find(
        (c) =>
          c.url.match(/\/api\/admin\/mailroom\/lockers\/L2/) &&
          c.init?.method === "PUT",
      );
      expect(putCall).toBeTruthy();
      const sent =
        putCall && putCall.init && putCall.init.body
          ? JSON.parse(String(putCall.init.body))
          : {};
      expect(sent.is_assignable).toBe(true);
    });
  });

  it("renders Assignable badge values in the table", async () => {
    renderComponent();

    // table should render both Yes and No based on fixture data
    await screen.findByRole("table", { name: /Lockers list/i });
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("requests sorting by Assignable when the column header is clicked", async () => {
    renderComponent();

    // click Assignable header to trigger sort
    const header = await screen.findByRole("columnheader", {
      name: /Assignable/i,
    });
    await userEvent.click(header);

    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") &&
            u.includes("sortBy=location_locker_is_assignable") &&
            u.includes("sortOrder=asc"),
        ),
      ).toBe(true);
    });

    // click again to toggle to desc
    await userEvent.click(header);
    await waitFor(() => {
      const calls = (globalThis.fetch as jest.Mock).mock.calls.map((c) =>
        String(c[0]),
      );
      expect(
        calls.some(
          (u: string) =>
            u.includes("/api/admin/mailroom/lockers") &&
            u.includes("sortBy=location_locker_is_assignable") &&
            u.includes("sortOrder=desc"),
        ),
      ).toBe(true);
    });
  });
});
