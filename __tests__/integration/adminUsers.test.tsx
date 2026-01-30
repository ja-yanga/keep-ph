import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import UsersPage from "@/app/admin/users/page";

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
      onPageChange?: (page: number) => void;
      page?: number;
      totalRecords?: number;
      recordsPerPage?: number;
    }) => {
      const records = props.records ?? [];
      const columns = props.columns ?? [];
      return (
        <div data-testid="data-table-container">
          <table role="table" aria-label={props["aria-label"] ?? "Users list"}>
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
          <div className="pagination-controls">
            <button
              aria-label="Previous page"
              disabled={props.page === 1}
              onClick={() => props.onPageChange?.((props.page ?? 1) - 1)}
            >
              Prev
            </button>
            <span data-testid="current-page">{props.page}</span>
            <button
              aria-label="Next page"
              disabled={
                (props.page ?? 1) * (props.recordsPerPage ?? 10) >=
                (props.totalRecords ?? 0)
              }
              onClick={() => props.onPageChange?.((props.page ?? 1) + 1)}
            >
              Next
            </button>
          </div>
        </div>
      );
    },
  };
});

// Mock PrivateMainLayout
jest.mock("@/components/Layout/PrivateMainLayout", () => {
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="private-layout">{children}</div>
    ),
  };
});

// Polyfills / shims
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

// --- Mock data and fetch capture ---
const generateMockUsers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    users_id: `user-${i + 1}`,
    users_email: `user${i + 1}@example.com`,
    users_role: i % 2 === 0 ? "admin" : "user",
    users_created_at: new Date().toISOString(),
    users_is_verified: true,
    user_kyc_table: {
      user_kyc_first_name: `First${i + 1}`,
      user_kyc_last_name: `Last${i + 1}`,
    },
  }));

let mockUsers = generateMockUsers(25);
let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCalls = [];
  mockUsers = generateMockUsers(25);
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

      if (url.includes("/api/session")) {
        return makeResponse({
          role: "admin",
          user: { id: "current-user-id" },
        });
      }

      if (url.includes("/api/admin/users/") && init?.method === "PATCH") {
        return makeResponse({ ok: true });
      }

      if (url.includes("/api/admin/users")) {
        return makeResponse({ data: mockUsers, count: mockUsers.length });
      }

      return makeResponse({ error: "not found" }, false, 404);
    },
  ) as jest.Mock;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

const renderComponent = () =>
  render(
    <MantineProvider>
      <SWRConfig value={{ provider: () => new Map() }}>
        <UsersPage />
      </SWRConfig>
    </MantineProvider>,
  );

describe("Admin Users (admin)", () => {
  it("renders Manage Users title", async () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /Manage Users/i }),
    ).toBeInTheDocument();
  });

  it("searches on Enter", async () => {
    renderComponent();

    const search = screen.getByPlaceholderText("Search users...");
    await userEvent.type(search, "First3{enter}");

    await waitFor(() => {
      expect(
        fetchCalls.some((c) => c.url.includes("/api/admin/users?q=First3")),
      ).toBe(true);
    });
  });

  it("shows and clears filters", async () => {
    renderComponent();

    const search = screen.getByPlaceholderText("Search users...");
    await userEvent.type(search, "First2{enter}");

    const clearBtn = await screen.findByRole("button", {
      name: /Clear Filters/i,
    });
    await userEvent.click(clearBtn);

    await waitFor(() => {
      expect(
        fetchCalls.some((c) => c.url.includes("/api/admin/users?q=")),
      ).toBe(true);
    });
  });

  it("filters by role tab", async () => {
    renderComponent();

    const adminTab = screen.getByRole("tab", { name: /Admin/i });
    await userEvent.click(adminTab);

    await waitFor(() => {
      expect(fetchCalls.some((c) => c.url.includes("role=admin"))).toBe(true);
    });
  });

  it("supports pagination", async () => {
    renderComponent();
    await screen.findByRole("table");

    const nextPageBtn = screen.getByRole("button", { name: /Next page/i });
    const currentPage = screen.getByTestId("current-page");

    expect(currentPage.textContent).toBe("1");
    await userEvent.click(nextPageBtn);

    expect(currentPage.textContent).toBe("2");
  });

  it("refreshes the list", async () => {
    renderComponent();
    const initialCalls = fetchCalls.length;

    const refreshBtn = screen.getByRole("button", { name: /Refresh/i });
    await userEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchCalls.length).toBeGreaterThan(initialCalls);
    });
  });

  it("opens View Details modal", async () => {
    renderComponent();
    await screen.findByRole("table");

    const viewBtn = screen.getByLabelText(/View details for First1 Last1/i);
    await userEvent.click(viewBtn);

    const dialog = await screen.findByRole("dialog", {
      name: /User Details/i,
    });
    expect(within(dialog).getByText(/user1@example.com/i)).toBeInTheDocument();
  });

  it("opens Edit Role modal and saves", async () => {
    renderComponent();
    await screen.findByRole("table");

    const editBtn = screen.getByLabelText(/Edit role for First2 Last2/i);
    await userEvent.click(editBtn);

    await screen.findByRole("dialog", { name: /Edit Role/i });

    const saveBtn = screen.getByRole("button", { name: /Save Changes/i });
    await userEvent.click(saveBtn);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/users/") && c.init?.method === "PATCH",
        ),
      ).toBe(true);
    });
  });
});
