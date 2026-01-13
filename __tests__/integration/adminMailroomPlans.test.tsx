import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

/*
  Integration tests for MailroomPlans component.

  Overview:
  - Mock mantine-datatable with a deterministic implementation that honors
    `columns.render` so action buttons remain interactive in tests.
  - Polyfill ResizeObserver because Mantine components depend on it.
  - Use isolated SWRConfig provider per test to avoid cache leaks.
  - Tests:
    1. renders plans and shows plan name
    2. filters results via search input
    3. opens View modal and displays plan details
    4. edits plan and sends PATCH, showing success alert
*/

/* Typed mock for mantine-datatable (avoid `any`) */
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

    // Render table header from columns
    const header = React.createElement(
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

    // Render body: either a single "no records" row or one row per record
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
          { key: String(r.id ?? JSON.stringify(r)) },
          columns.map((col: Column, ci: number) => {
            let content: React.ReactNode = null;
            if (typeof col.render === "function") {
              // Use provided render function to preserve structure & handlers
              content = col.render(r);
            } else if (col.accessor) {
              const val = r[col.accessor];
              content = val !== undefined && val !== null ? String(val) : null;
            }
            return React.createElement("td", { key: ci }, content);
          }),
        ),
      );
    })();

    return React.createElement(
      "table",
      null,
      React.createElement("thead", null, header),
      React.createElement("tbody", null, bodyRows),
    );
  };

  return { DataTable };
});

/* ResizeObserver polyfill required by Mantine layout components */
class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

import MailroomPlans from "@/components/pages/admin/PlanPage/MailroomPlans";

describe("MailroomPlans", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Clear jest mocks and save original fetch for restore
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    // Restore original fetch to avoid cross-test contamination
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders plans and shows plan name", async () => {
    // Arrange: single plan response
    const plan = {
      id: "p1",
      name: "Personal",
      price: 100,
      description: "Basic plan",
      storage_limit: 1024,
      can_receive_mail: true,
      can_receive_parcels: false,
      can_digitize: true,
    };

    // Mock GET response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [plan] }),
    } as unknown as Response);

    // Act: render component with isolated SWR cache
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomPlans />
        </MantineProvider>
      </SWRConfig>,
    );

    // Assert: plan name appears in the DOM
    await waitFor(() => {
      expect(screen.getByText(/Personal/i)).toBeInTheDocument();
    });
  });

  it("filters results via search input", async () => {
    // Arrange: two plans for filtering test
    const plans = [
      {
        id: "p1",
        name: "Personal",
        price: 100,
        description: "Basic",
        storage_limit: 1024,
        can_receive_mail: true,
        can_receive_parcels: false,
        can_digitize: true,
      },
      {
        id: "p2",
        name: "Business",
        price: 500,
        description: "Pro",
        storage_limit: 5120,
        can_receive_mail: true,
        can_receive_parcels: true,
        can_digitize: true,
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: plans }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomPlans />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for both rows to render
    await waitFor(() => {
      expect(screen.getByText(/Personal/i)).toBeInTheDocument();
      expect(screen.getByText(/Business/i)).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText(
      /Search plans/i,
    ) as HTMLInputElement;

    // Act: enter a no-match term and assert "No plans found" is shown
    await userEvent.type(input, "no-match");
    expect(await screen.findByText(/No plans found/i)).toBeInTheDocument();

    // Act: clear and search for Business; assert Business shows and no "No plans" text
    await userEvent.clear(input);
    await userEvent.type(input, "Business");

    await waitFor(() => {
      expect(screen.queryByText(/No plans found/i)).toBeNull();
      expect(screen.getByText(/Business/i)).toBeInTheDocument();
    });
  });

  it("opens View modal and displays plan details", async () => {
    // Arrange: single plan used to open the view modal
    const plan = {
      id: "p1",
      name: "Personal",
      price: 100,
      description: "Basic plan description",
      storage_limit: 2048,
      can_receive_mail: true,
      can_receive_parcels: false,
      can_digitize: true,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [plan] }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomPlans />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for a data row to appear
    await screen.findByText(/Personal/i);

    // Locate first data row (skip header) and its action buttons
    const rows = screen.getAllByRole("row");
    const headerCount = 1;
    if (rows.length <= headerCount) throw new Error("No data rows found");
    const dataRow = rows[1];

    // Query all buttons in the action cell and pick the first (view)
    const actionBtns = within(dataRow).queryAllByRole("button");
    if (actionBtns.length === 0)
      throw new Error("No action buttons found in row");
    const viewBtn = actionBtns[0];

    // Act: click view button
    await userEvent.click(viewBtn);

    // Assert: modal displays plan details and expected fields
    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/Plan Details/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Personal/i)).toBeInTheDocument();
    expect(
      within(modal).getByText(/Basic plan description/i),
    ).toBeInTheDocument();
    // Check currency symbol presence as basic price formatting assertion
    expect(within(modal).getByText(/₱/)).toBeInTheDocument();
  });

  it("edits plan and sends PATCH, showing success alert", async () => {
    // Arrange: plan used for edit flow
    const plan = {
      id: "p1",
      name: "Personal",
      price: 100,
      description: "Basic plan",
      storage_limit: 1024,
      can_receive_mail: true,
      can_receive_parcels: false,
      can_digitize: true,
    };

    // Mock fetch: GET returns list; PATCH returns success message
    const fetchMock = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      if (
        !opts ||
        !opts.method ||
        (opts.method as string).toUpperCase() === "GET"
      ) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [plan] }),
        } as unknown as Response);
      }
      // PATCH response
      return Promise.resolve({
        ok: true,
        json: async () => ({ message: "Plan updated" }),
      } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomPlans />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for data row
    await waitFor(() => {
      expect(screen.getByText(/Personal/i)).toBeInTheDocument();
    });

    // Find the data row and its action buttons; click the second (edit)
    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    const buttons = within(dataRow).getAllByRole("button");
    if (buttons.length < 2) throw new Error("Edit button not found");
    const editBtn = buttons[1];
    await userEvent.click(editBtn);

    // Modal opens; click Save Changes to trigger PATCH
    const modal = await screen.findByRole("dialog");
    const saveBtn = within(modal).getByRole("button", {
      name: /Save Changes/i,
    });
    await userEvent.click(saveBtn);

    // Assert PATCH was called and success alert is shown
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/Plan updated successfully!/i),
    ).toBeInTheDocument();
  });
});
