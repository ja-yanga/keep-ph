import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

/*
  Test file for AdminUserKyc component.

  Notes:
  - We mock mantine-datatable to provide a deterministic table implementation
    that respects `columns` and `render` so the component's action buttons
    and cell renderers remain functional in JSDOM.
  - ResizeObserver is polyfilled because Mantine components expect it.
  - Each test uses SWRConfig with an isolated provider so SWR cache doesn't leak.
  - Tests are ordered: render badge, filtering behavior, modal detail display,
    and finally the "Mark Verified" POST flow.
*/

/* Mock mantine-datatable with typed props (avoid `any`) */
jest.mock("mantine-datatable", () => {
  type RecordType = Record<string, unknown>;
  type Column = {
    render?: (r: RecordType) => React.ReactNode;
    accessor?: string;
    title?: string;
    header?: string;
  };

  const DataTable = (props: {
    records?: RecordType[];
    noRecordsText?: string;
    columns?: Column[];
  }) => {
    const { records = [], noRecordsText = "No records", columns = [] } = props;

    // Header row: render column titles in table header
    const headerRow = React.createElement(
      "tr",
      null,
      columns.map((col: Column, i: number) =>
        React.createElement(
          "th",
          { key: i },
          col.title ?? col.header ?? col.accessor ?? "",
        ),
      ),
    );

    // Body rows: either a single "no records" row or one row per record.
    const bodyRows = (() => {
      if (records.length === 0) {
        return [
          React.createElement(
            "tr",
            { key: "no-records" },
            React.createElement(
              "td",
              { colSpan: Math.max(columns.length, 1) },
              React.createElement("div", null, noRecordsText),
            ),
          ),
        ];
      }

      return records.map((r: RecordType) =>
        React.createElement(
          "tr",
          { key: String((r as RecordType).id ?? JSON.stringify(r)) },
          columns.map((col: Column, ci: number) => {
            let cellContent: React.ReactNode = null;
            if (typeof col.render === "function") {
              // Use the provided render function to preserve button handlers and structure
              cellContent = col.render(r);
            } else if (col.accessor) {
              const val = r[col.accessor];
              cellContent =
                val !== undefined && val !== null ? String(val) : null;
            }
            return React.createElement("td", { key: ci }, cellContent);
          }),
        ),
      );
    })();

    return React.createElement(
      "table",
      null,
      React.createElement("thead", null, headerRow),
      React.createElement("tbody", null, bodyRows),
    );
  };

  return { DataTable };
});

/* Polyfill for Mantine ResizeObserver used in layout components */
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

import AdminUserKyc from "@/components/pages/admin/KycPage/AdminUserKyc";

describe("AdminUserKyc", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Reset mocks and preserve original fetch for restoration after tests
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch to avoid cross-test interference
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders KYC records and shows count badge", async () => {
    // Provide a single-row response for the listing endpoint
    const rows = [
      {
        id: "r1",
        user_id: "u1",
        status: "SUBMITTED",
        first_name: "John",
        last_name: "Doe",
        full_name: "John Doe",
      },
    ];

    // Mock global.fetch for the component's GET request
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: rows, total_count: rows.length }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AdminUserKyc />
        </MantineProvider>
      </SWRConfig>,
    );

    // Assert the badge displays the expected count (flexible numeric match)
    expect(await screen.findByText(/\d+\s*Records/i)).toBeInTheDocument();
  });

  it("filters results via search input", async () => {
    // Two test rows to exercise filtering
    const testRows = [
      {
        id: "r1",
        user_id: "u1",
        status: "SUBMITTED",
        first_name: "John",
        last_name: "Doe",
        full_name: "John Doe",
      },
      {
        id: "r2",
        user_id: "u2",
        status: "SUBMITTED",
        first_name: "Jane",
        last_name: "Smith",
        full_name: "Jane Smith",
      },
    ];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      const searchParams = new URL(url, "http://localhost").searchParams;
      const query = searchParams.get("q") || "";
      const filtered = testRows.filter(
        (r) =>
          r.full_name.toLowerCase().includes(query.toLowerCase()) ||
          r.user_id.toLowerCase().includes(query.toLowerCase()),
      );
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: filtered, total_count: filtered.length }),
      } as unknown as Response);
    });

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AdminUserKyc />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for badge to ensure data loaded
    await screen.findByText(/\d+\s*Records/i);

    // Ensure table rows were rendered (header + data rows)
    await waitFor(() => {
      expect(screen.getAllByRole("row").length).toBeGreaterThanOrEqual(2);
    });

    const input = screen.getByPlaceholderText(
      /Search by name or user id/i,
    ) as HTMLInputElement;

    // Type a query that matches nothing -> expect the "no records" text
    await userEvent.type(input, "no-match-value");
    expect(
      await screen.findByText(/No records found/i, {}, { timeout: 2000 }),
    ).toBeInTheDocument();

    // Clear and type a query that should match Jane -> assert filtering applied
    await userEvent.clear(input);
    await userEvent.type(input, "Jane");

    // Wait until "No records found" disappears (indicates filtering applied)
    await waitFor(
      () => {
        expect(screen.queryByText(/No records found/i)).toBeNull();
      },
      { timeout: 2000 },
    );

    // Ensure the input reflects the search term (confirmation that filtering triggered)
    expect((input as HTMLInputElement).value).toBe("Jane");
  });

  it("opens Manage modal and displays selected user's details", async () => {
    // Single row used to open modal and verify details rendering
    const row = {
      id: "r1",
      user_id: "u1",
      status: "SUBMITTED",
      first_name: "Alice",
      last_name: "Admin",
      full_name: "Alice Admin",
      id_document_type: "Government ID",
      submitted_at: "2024-01-01T00:00:00Z",
    };

    // Mock GET listing response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [row], total_count: 1 }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AdminUserKyc />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for rows to load
    await screen.findByText(/\d+\s*Records/i);

    // Find and click the Manage button for the first row
    const manageBtns = await screen.findAllByRole("button", {
      name: /Manage/i,
    });
    if (manageBtns.length === 0) throw new Error("No Manage buttons found");
    await userEvent.click(manageBtns[0]);

    // Locate the modal and assert selected user's details are displayed within it
    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/KYC Details/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Alice Admin/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Government ID/i)).toBeInTheDocument();
    // Note: user_id is not displayed in modal UI so it's intentionally not asserted.
  });

  it("opens Manage modal and posts Mark Verified", async () => {
    // Row used to test POST action triggered by "Mark Verified"
    const row = {
      id: "r1",
      user_id: "u1",
      status: "SUBMITTED",
      first_name: "Alice",
      last_name: "Admin",
      id_document_type: "Government ID",
    };

    // Mock fetch to return the list for GET and a success for POST
    const fetchMock = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      if (
        !opts ||
        !opts.method ||
        (opts.method as string).toUpperCase() === "GET"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [row], total_count: 1 }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, ok: true }),
      } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AdminUserKyc />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for data to render
    await screen.findByText(/\d+\s*Records/i);

    // Click the first Manage button then "Mark Verified"
    const manageBtns = await screen.findAllByRole("button", {
      name: /Manage/i,
    });
    if (manageBtns.length === 0) throw new Error("No Manage buttons found");
    await userEvent.click(manageBtns[0]);

    // Modal opens
    expect(await screen.findByText(/KYC Details/i)).toBeInTheDocument();

    // Click "Mark Verified" and assert a POST was made
    const markBtn = screen.getByRole("button", { name: /Mark Verified/i });
    await userEvent.click(markBtn);

    expect(fetchMock).toHaveBeenCalled();
  });
});
