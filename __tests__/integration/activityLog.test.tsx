import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import React from "react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import ActivityLogContent from "@/components/pages/admin/ActivityLog/ActivityLogContent";

const safeRender = (node: unknown): React.ReactNode => {
  if (node === null || node === undefined) return null;
  if (React.isValidElement(node)) return node;
  if (
    typeof node === "string" ||
    typeof node === "number" ||
    typeof node === "boolean"
  ) {
    return String(node);
  }
  try {
    return JSON.stringify(node);
  } catch {
    return String(node);
  }
};

type MockRecord = {
  activity_log_id?: string;
  [key: string]: unknown;
};

// Mock DataTable to avoid virtualization/layout issues in tests.
jest.mock("mantine-datatable", () => {
  return {
    DataTable: (props: {
      records?: Array<MockRecord>;
      columns?: Array<{
        title?: React.ReactNode;
        accessor?: string;
        render?: (record: MockRecord) => React.ReactNode;
      }>;
      onRowClick?: (params: { record: MockRecord }) => void;
      "aria-label"?: string;
    }) => {
      const records = props.records ?? [];
      const columns = props.columns ?? [];
      return (
        <div data-testid="data-table-container">
          <table
            role="table"
            aria-label={props["aria-label"] ?? "Activity logs"}
          >
            <thead>
              <tr>
                {columns.map((col, i) => (
                  <th key={i}>{col.title}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((rec, i) => (
                <tr
                  role="row"
                  key={String(rec.activity_log_id || i)}
                  data-testid={`row-${rec.activity_log_id || i}`}
                  onClick={() => props.onRowClick?.({ record: rec })}
                  style={{ cursor: "pointer" }}
                >
                  {columns.map((col, j) => {
                    const content =
                      typeof col.render === "function"
                        ? col.render(rec)
                        : rec[col.accessor ?? ""];
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
        </div>
      );
    },
  };
});

// Polyfills / shims for Mantine/JSDOM
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

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserver;

const mockLogs = [
  {
    activity_log_id: "1",
    activity_created_at: "2024-01-01T10:00:00Z",
    actor_email: "admin@example.com",
    activity_entity_type: "USER",
    activity_action: "UPDATE",
    activity_ip_address: "127.0.0.1",
    activity_user_agent: "Mozilla/5.0",
    activity_details: {
      email: "target@example.com",
      update_type: "profile_update",
    },
  },
  {
    activity_log_id: "2",
    activity_created_at: "2024-01-02T11:00:00Z",
    actor_email: "staff@example.com",
    activity_entity_type: "MAILBOX_ITEM",
    activity_action: "CREATE",
    activity_ip_address: "192.168.1.1",
    activity_user_agent: "Chrome",
    activity_details: { package_name: "Important Package" },
  },
];

describe("ActivityLogContent Integration", () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        logs: mockLogs,
        total_count: 2,
      }),
    });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () =>
    render(
      <MantineProvider>
        <ActivityLogContent />
      </MantineProvider>,
    );

  it("renders the activity log table with mock data", async () => {
    renderComponent();

    // Check rendering of search and filter button
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
    expect(screen.getByTestId("filter-button")).toBeInTheDocument();

    // Wait for data to load and check if mock data is rendered
    await waitFor(() => {
      expect(screen.getByText("admin@example.com")).toBeInTheDocument();
      expect(screen.getByText("staff@example.com")).toBeInTheDocument();
    });
  });

  it("shows filter popover when filter button is clicked", async () => {
    renderComponent();

    const filterBtn = screen.getByTestId("filter-button");
    await userEvent.click(filterBtn);

    expect(screen.getByText("Filter Activity Logs")).toBeInTheDocument();
    expect(screen.getByTestId("entity-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("action-select")).toBeInTheDocument();
  });

  it("filters by entity type and action", async () => {
    renderComponent();

    // Initial fetch
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    // Open filter popover
    await userEvent.click(screen.getByTestId("filter-button"));

    // Select Entity Type: User
    const entitySelect = screen.getByPlaceholderText("Select entity type");
    await userEvent.click(entitySelect);
    const userOption = await screen.findByText("User");
    await userEvent.click(userOption);

    // Select Action: Login
    const actionSelect = screen.getByPlaceholderText("Select action");
    await userEvent.click(actionSelect);
    const loginOption = await screen.findByText("Login");
    await userEvent.click(loginOption);

    await waitFor(
      () => {
        const calls = fetchMock.mock.calls.map((c) => c[0]);
        const filterCall = calls.find(
          (url) =>
            url.includes("entity_type=USER") && url.includes("action=LOGIN"),
        );
        expect(filterCall).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("filters by date range", async () => {
    renderComponent();

    await userEvent.click(screen.getByTestId("filter-button"));

    // Wait for popover content
    const fromDateInput = await screen.findByTestId("from-date-filter");
    const toDateInput = await screen.findByTestId("to-date-filter");

    fireEvent.change(fromDateInput, { target: { value: "2024-01-01" } });
    fireEvent.change(toDateInput, { target: { value: "2024-01-31" } });

    await waitFor(
      () => {
        const calls = fetchMock.mock.calls.map((c) => c[0]);
        const dateCall = calls.find(
          (url) =>
            url.includes("date_from=2024-01-01") &&
            url.includes("date_to=2024-01-31"),
        );
        expect(dateCall).toBeDefined();
      },
      { timeout: 3000 },
    );
  });

  it("shows details modal when a row is clicked", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("row-1")).toBeInTheDocument();
    });

    // Click the first row
    const row = screen.getByTestId("row-1");
    await userEvent.click(row);

    // Check if modal appears
    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText("Activity Details")).toBeInTheDocument();

    // Check for specific details inside the modal specifically
    expect(within(modal).getByText("admin@example.com")).toBeInTheDocument();
    expect(within(modal).getByText("127.0.0.1")).toBeInTheDocument();
    expect(within(modal).getByText(/user update/i)).toBeInTheDocument();
  });
});
