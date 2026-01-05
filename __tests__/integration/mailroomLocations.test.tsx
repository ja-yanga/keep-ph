import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

/*
  Integration tests for MailroomLocations component.
  - Deterministic mock for mantine-datatable that respects `columns.render`.
  - ResizeObserver polyfill for Mantine.
  - Isolated SWR cache per test.
*/

/* Typed mock for mantine-datatable (no `any`) */
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

/* ResizeObserver polyfill required by Mantine */
class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

import MailroomLocations from "@/components/MailroomLocations";

describe("MailroomLocations", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("renders locations and shows name", async () => {
    const loc = {
      id: "l1",
      name: "Main Office",
      code: "MKT",
      region: "NCR",
      city: "Makati",
      barangay: "Bel-Air",
      zip: "1227",
      total_lockers: 10,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [loc] }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomLocations />
        </MantineProvider>
      </SWRConfig>,
    );

    expect(await screen.findByText(/Main Office/i)).toBeInTheDocument();
  });

  it("filters locations via search input", async () => {
    const locations = [
      {
        id: "l1",
        name: "Main Office",
        code: "MKT",
        region: "NCR",
        city: "Makati",
        barangay: "Bel-Air",
        zip: "1227",
        total_lockers: 10,
      },
      {
        id: "l2",
        name: "Branch",
        code: "BRN",
        region: "CAL",
        city: "Cebu",
        barangay: "Lahug",
        zip: "6000",
        total_lockers: 5,
      },
    ];

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: locations }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomLocations />
        </MantineProvider>
      </SWRConfig>,
    );

    await screen.findByText(/Main Office/i);
    const input = screen.getByPlaceholderText(/Search.../i) as HTMLInputElement;

    await userEvent.type(input, "Branch");
    await waitFor(() => {
      expect(screen.queryByText(/No locations found/i)).toBeNull();
      expect(screen.getByText(/Branch/i)).toBeInTheDocument();
    });

    await userEvent.clear(input);
    await userEvent.type(input, "no-match");
    expect(await screen.findByText(/No locations found/i)).toBeInTheDocument();
  });

  it("opens View modal and displays selected location details", async () => {
    const loc = {
      id: "l1",
      name: "Main Office",
      code: "MKT",
      region: "NCR",
      city: "Makati",
      barangay: "Bel-Air",
      zip: "1227",
      total_lockers: 10,
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [loc] }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomLocations />
        </MantineProvider>
      </SWRConfig>,
    );

    await screen.findByText(/Main Office/i);

    const rows = screen.getAllByRole("row");
    if (rows.length < 2) throw new Error("No data rows found");
    const dataRow = rows[1];
    const actionBtns = within(dataRow).queryAllByRole("button");
    if (actionBtns.length === 0) throw new Error("No action buttons found");
    const viewBtn = actionBtns[0];
    await userEvent.click(viewBtn);

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/Location Details/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Main Office/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Makati/i)).toBeInTheDocument();
    expect(within(modal).getByText(/10 Lockers/i)).toBeInTheDocument();
  });

  it("creates and edits location (POST and PATCH flows)", async () => {
    const loc = {
      id: "l1",
      name: "Main Office",
      code: "MKT",
      region: "NCR",
      city: "Makati",
      barangay: "Bel-Air",
      zip: "1227",
      total_lockers: 10,
    };

    type ServerState = { created: boolean; updated: boolean };
    type FetchWithState = jest.Mock & { serverState?: ServerState };

    const fetchMock = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      const method = opts?.method ? String(opts.method).toUpperCase() : "GET";
      const fm = fetchMock as unknown as FetchWithState;

      // initialize simple server-side state once
      if (!fm.serverState) fm.serverState = { created: false, updated: false };
      const state = fm.serverState;

      if (method === "GET") {
        const base = [loc];
        if (state.created) base.push({ ...loc, id: "l2", name: "Created" });
        if (state.updated) base[0] = { ...base[0], name: "Updated" };
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: base }),
        } as unknown as Response);
      }

      if (method === "POST") {
        state.created = true;
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: "Location created",
            data: { ...loc, id: "l2", name: "Created" },
          }),
        } as unknown as Response);
      }

      // PATCH
      state.updated = true;
      return Promise.resolve({
        ok: true,
        json: async () => ({
          message: "Location updated",
          data: { ...loc, name: "Updated" },
        }),
      } as unknown as Response);
    });

    global.fetch = fetchMock as unknown as typeof global.fetch;

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomLocations />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait for initial load
    await screen.findByText(/Main Office/i);

    // Open Create modal and submit
    const createBtn = screen.getByRole("button", { name: /Create/i });
    await userEvent.click(createBtn);

    const createModal = await screen.findByRole("dialog");
    const nameInput = within(createModal).getByLabelText(/Name/i);
    await userEvent.type(nameInput, "Created");

    // Fill other required fields (code, region, city, barangay, zip, total_lockers)
    const codeInput = within(createModal).getByLabelText(/Code/i);
    await userEvent.type(codeInput, "CRT");

    // Region and City are simple TextInputs in this form — type values directly
    const regionInput = within(createModal).getByLabelText(/Region/i);
    await userEvent.type(regionInput, "NCR");

    const cityInput = within(createModal).getByLabelText(/City/i);
    await userEvent.type(cityInput, "Makati");

    const barangayInput = within(createModal).getByLabelText(/Barangay/i);
    await userEvent.type(barangayInput, "Created Barangay");

    const zipInput = within(createModal).getByLabelText(/Zip/i);
    await userEvent.type(zipInput, "0000");

    const lockersInput = within(createModal).getByLabelText(/Total Lockers/i);
    await userEvent.clear(lockersInput);
    await userEvent.type(lockersInput, "2");

    const createSubmit = within(createModal).getByRole("button", {
      name: /Create/i,
    });
    await userEvent.click(createSubmit);

    // Wait for POST + subsequent GET (refresh) to complete before asserting new row
    await waitFor(() => {
      expect((fetchMock as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(
        2,
      );
    });
    // There may be multiple "Created" nodes (alert + table). assert at least one match.
    const createdMatches = await screen.findAllByText(/Created/i);
    expect(createdMatches.length).toBeGreaterThanOrEqual(1);

    // Edit existing row: click edit (second button)
    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    const buttons = within(dataRow).getAllByRole("button");
    if (buttons.length < 2) throw new Error("Edit button not found");
    const editBtn = buttons[1];
    await userEvent.click(editBtn);

    const editModal = await screen.findByRole("dialog");
    const saveBtn = within(editModal).getByRole("button", { name: /Save/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });
    // After PATCH the mocked server state reflects the update; assert it appears
    // There may be multiple "Updated" nodes (alert + table). assert at least one match.
    const updatedMatches = await screen.findAllByText(/Updated/i);
    expect(updatedMatches.length).toBeGreaterThanOrEqual(1);
  }, 20000);
});
