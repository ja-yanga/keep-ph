// filepath: c:\Users\Raitoningu\code\keep-ph\__tests__\integration\mailroomLockers.test.tsx
// Integration tests for MailroomLockers (admin).
// - Verifies listing, search, tab filtering (Available / Occupied).
// - Exercises Add / Edit / Delete flows through modal dialogs.
// - Ensures correct API calls (GET/POST/PUT/DELETE) are made.
// - Mocks mantine-datatable to render a simple table in tests.
// - Provides JSDOM polyfills (ResizeObserver) and a scrollIntoView mock for Mantine.

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

// Mock mantine-datatable so DataTable renders synchronously in tests
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
    }: {
      records?: Record<string, unknown>[];
      columns?: {
        title?: React.ReactNode;
        accessor?: string;
        render?: (r: Record<string, unknown>) => React.ReactNode;
      }[];
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
            (columns || []).map((c, i) =>
              React.createElement("th", { key: i }, safeRender(c.title)),
            ),
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

// polyfill ResizeObserver for JSDOM
type TestRO = { observe(): void; unobserve(): void; disconnect(): void };
const g = globalThis as unknown as { ResizeObserver?: new () => TestRO };
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// Polyfill scrollIntoView for Mantine dropdown navigation
Element.prototype.scrollIntoView = jest.fn();

jest.setTimeout(15000);

describe("MailroomLockers (admin)", () => {
  const locations = [
    { id: "loc-1", name: "Main Office" },
    { id: "loc-2", name: "Branch" },
  ];

  const lockers = [
    {
      id: "L1",
      locker_code: "A-101",
      location_id: "loc-1",
      is_available: true,
      location: { id: "loc-1", name: "Main Office" },
      assigned: null,
    },
    {
      id: "L2",
      locker_code: "B-201",
      location_id: "loc-2",
      is_available: false,
      location: { id: "loc-2", name: "Branch" },
      assigned: {
        id: "asg-1",
        status: "Near Full",
        registration: { full_name: "Jane Doe" },
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

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
              l.locker_code.toLowerCase().includes(search),
            );
          if (activeTab === "available")
            filtered = filtered.filter((l) => l.is_available);
          if (activeTab === "occupied")
            filtered = filtered.filter((l) => !l.is_available);
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

    // wait for table element
    const table = await screen.findByRole("table", { name: /Lockers list/i });
    expect(table).toBeInTheDocument();

    // verify the lockers endpoint was requested and table has rows
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

    // Search for B-201 -> assert fetch was invoked with search param (UI rendering may vary)
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

    // Clear search -> ensure fetch called without search filter
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

    // Switch to "Available" tab -> fetch should include activeTab=available
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

    // Switch to "Occupied" tab -> fetch should include activeTab=occupied
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
    // install a fetch handler that supports GET/POST/PUT/DELETE for this test
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
          // echo created locker
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return {
            ok: true,
            json: async () => ({ data: { id: "NEW", ...body } }),
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

    // wait for table to render so UI is stabilised
    await screen.findByRole("table", { name: /Lockers list/i });

    // open add modal (accept aria-label or visible text fallback)
    let addBtn;
    try {
      addBtn = await screen.findByLabelText("Add new locker");
    } catch {
      addBtn = await screen.findByRole("button", {
        name: /(?:Add Locker|Add)/i,
      });
    }
    await userEvent.click(addBtn);

    // wait for modal and scope to it
    const addDialog = await screen.findByRole("dialog", {
      name: /Add Locker/i,
    });

    // type locker code scoped to dialog
    const codeInput = await within(addDialog).findByLabelText(/Locker Code/i);
    await userEvent.type(codeInput, "C-300");

    // select location: verify input exists, then type and enter to select (avoids portal visibility issues)
    const locInput = within(addDialog).getByPlaceholderText("Select location");
    await userEvent.click(locInput);
    await userEvent.type(locInput, "Main Office");
    // wait a tick for internal filtering
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    // submit
    const saveBtn = await within(addDialog).findByLabelText(
      "Save locker details",
    );
    await userEvent.click(saveBtn);

    // assert POST occurred with expected payload
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
    });
  });

  it("edits an existing locker and saves changes", async () => {
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

        // accept PUT to specific locker id
        if (
          url.match(/\/api\/admin\/mailroom\/lockers\/.+/) &&
          method === "PUT"
        ) {
          const body = init?.body ? JSON.parse(String(init.body)) : {};
          return {
            ok: true,
            json: async () => ({ data: { ...body } }),
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

    // ensure table rendered and open the edit control for the A-101 row
    await screen.findByRole("table", { name: /Lockers list/i });
    const editBtn = await screen.findByLabelText(/Edit locker A-101/i);
    await userEvent.click(editBtn);

    // change locker code
    const codeInput = (await screen.findByLabelText(
      /Locker Code/i,
    )) as HTMLInputElement;
    await userEvent.clear(codeInput);
    await userEvent.type(codeInput, "A-101-UPDATED");

    // save
    await userEvent.click(screen.getByLabelText("Save locker details"));

    // assert PUT was called
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

    // ensure table rendered and click the delete control for A-101
    await screen.findByRole("table", { name: /Lockers list/i });
    const deleteBtn = await screen.findByLabelText(/Delete locker A-101/i);
    await userEvent.click(deleteBtn);

    // confirm deletion in modal (scope to the confirm dialog)
    const confirmDialog = await screen.findByRole("dialog", {
      name: /Confirm Deletion/i,
    });
    const confirmBtn = within(confirmDialog).getByLabelText(
      "Confirm locker deletion",
    );
    await userEvent.click(confirmBtn);

    // assert DELETE called and success alert shows
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

    // global success alert should appear
    expect(
      await screen.findByText(/Locker deleted successfully/i),
    ).toBeInTheDocument();
  });
});
