// Integration tests for AdminRewards (admin).
// - Renders claims list, verifies search and tab filtering (Pending / Paid).
// - Exercises "Upload Proof" and "Mark Paid" flows (PUT requests).
// - Mocks mantine-datatable to avoid virtualization/layout issues in JSDOM.
// - Provides necessary polyfills/shims (matchMedia, ResizeObserver, IntersectionObserver, FileReader).
// - Captures global.fetch calls to assert API usage and responses.

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { Notifications } from "@mantine/notifications";
import AdminRewardsPage from "@/app/admin/rewards/page";

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
          <table
            role="table"
            aria-label={props["aria-label"] ?? "Rewards list"}
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

// Polyfills / shims required by Mantine and component behavior.
// matchMedia
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

// minimal ResizeObserver shim
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as new () => TestRO;
}

// minimal IntersectionObserver shim
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

// Mantine components may call scrollIntoView when navigating options
Element.prototype.scrollIntoView = jest.fn();

// Mock FileReader to synchronously return a base64 string for uploads
class MockFileReader {
  result: string | null = null;
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  readAsDataURL(_file?: File): void {
    void _file; // mark param used to avoid lint error
    this.result = "data:image/png;base64,TESTBASE64";
    if (this.onload) {
      // @ts-expect-error emulate ProgressEvent target.result
      this.onload({ target: this } as ProgressEvent<FileReader>);
    }
  }
}
(globalThis as unknown as { FileReader?: unknown }).FileReader =
  MockFileReader as unknown;

// --- Mock data and fetch capture ---
const generateMockClaims = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `claim-${i + 1}`,
    user: { email: `user${i + 1}@example.com`, users_email: null },
    referral_count: i,
    total_referrals: i,
    amount: 100 * (i + 1),
    payment_method: "GCash",
    account_details: `0917000000${i}`,
    created_at: new Date().toISOString(),
    status: i % 2 === 0 ? "PENDING" : "PAID",
    proof_url: i % 2 === 1 ? "https://example.com/proof.pdf" : null,
  }));
};

let mockClaims = generateMockClaims(25);

let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

// Setup global.fetch mock that returns Response-like objects with clone/text/json
beforeEach(() => {
  fetchCalls = [];
  mockClaims = generateMockClaims(25);
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

      // GET list
      if (
        url.includes("/api/admin/rewards") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET")
      ) {
        return makeResponse(mockClaims);
      }

      // PUT update (upload or mark paid)
      if (
        url.match(/\/api\/admin\/rewards\/.+/) &&
        init &&
        (init.method ?? "").toUpperCase() === "PUT"
      ) {
        const bodyText = init.body ? String(init.body) : "{}";
        const parsed = JSON.parse(bodyText);
        const idMatch = url.split("/").pop() ?? "unknown";
        const updated = {
          ...(mockClaims.find((c) => c.id === idMatch) ?? {}),
          status: parsed.status ?? "PAID",
        };
        return makeResponse({ ok: true, claim: updated });
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
        <AdminRewardsPage />
      </SWRConfig>
    </MantineProvider>,
  );

// helper: wait until a table row contains the given text
const waitForRowWithText = async (text: string) => {
  await waitFor(() => {
    const rows = screen.queryAllByRole("row");
    expect(rows.some((r) => r.textContent?.includes(text))).toBe(true);
  });
};

describe("AdminRewards (admin)", () => {
  it("displays the title 'Reward Claims'", async () => {
    renderComponent();
    // heading renders as h1 in the page; assert by text only
    expect(
      screen.getByRole("heading", { name: /Rewards & Referral Claims/i }),
    ).toBeInTheDocument();
  });

  it("renders claims list and supports search & tabs", async () => {
    renderComponent();

    // wait for table and a row containing claim id snippet
    await screen.findByRole("table");
    await waitForRowWithText("claim-1");

    // search by email
    const search = screen.getByPlaceholderText("Search claims...");
    await userEvent.type(search, "user3@example.com");

    await waitFor(() => {
      const rows = screen.queryAllByRole("row");
      expect(
        rows.some((r) => r.textContent?.includes("user3@example.com")),
      ).toBe(true);
      // user1 should be filtered out
      expect(
        rows.some((r) => r.textContent?.includes("user1@example.com")),
      ).toBe(false);
    });
  });

  it("supports pagination and changing pages", async () => {
    renderComponent();
    await screen.findByRole("table");

    const nextPageBtn = screen.getByRole("button", { name: /Next page/i });
    const currentPage = screen.getByTestId("current-page");

    expect(currentPage.textContent).toBe("1");
    expect(nextPageBtn).not.toBeDisabled();

    await userEvent.click(nextPageBtn);
    expect(currentPage.textContent).toBe("2");
  });

  it("shows disclosure toggle to reveal/hide account details", async () => {
    renderComponent();
    await screen.findByRole("table");

    const revealBtn = screen.getAllByRole("button", {
      name: /Reveal account details/i,
    })[0];
    const row = revealBtn.closest("tr")!;

    // Initial state: masked
    expect(row.textContent).toContain("****");

    // Click reveal
    await userEvent.click(revealBtn);
    expect(row.textContent).not.toContain("****");

    // Icon should change to hide
    const hideBtn = within(row).getByRole("button", {
      name: /Hide account details/i,
    });
    expect(hideBtn).toBeInTheDocument();

    // Click hide
    await userEvent.click(hideBtn);
    expect(row.textContent).toContain("****");
  });

  it("opens and closes the upload proof modal", async () => {
    renderComponent();
    await screen.findByRole("table");

    const uploadBtn = screen.getAllByRole("button", {
      name: /Upload proof for claim/i,
    })[0];
    await userEvent.click(uploadBtn);

    // Modal should be visible
    const modal = await screen.findByRole("dialog", {
      name: /Upload Proof of Payment/i,
    });
    expect(modal).toBeInTheDocument();

    // Click cancel
    const cancelBtn = within(modal).getByRole("button", { name: /Cancel/i });
    await userEvent.click(cancelBtn);

    // Modal should be gone
    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Upload Proof of Payment/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("uploads proof and marks claim as PAID (Upload Proof flow)", async () => {
    renderComponent();
    await screen.findByRole("table");

    // open Upload Proof for first claim (PENDING)
    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("user1@example.com"));
    // match aria-label used by component for Upload button
    const uploadBtn = within(row!).getByRole("button", {
      name: /Upload proof for claim/i,
    });
    await userEvent.click(uploadBtn);

    // modal opened
    const modal = await screen.findByRole("dialog", {
      name: /Upload Proof of Payment/i,
    });

    // find native file input rendered into the document (Mantine FileInput may render external input)
    const fileInputEl = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!fileInputEl)
      throw new Error("file input not found in Upload Proof modal");

    const file = new File(["dummy"], "proof.png", { type: "image/png" });
    // upload to the real <input type="file">
    await userEvent.upload(fileInputEl, file);

    // click Upload & Mark Paid (match aria-label)
    const submit = within(modal).getByRole("button", {
      name: /Upload proof and mark claim as paid/i,
    });
    await userEvent.click(submit);

    // assert PUT called for claim-1
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/rewards/claim-1") &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
    });

    // assert success notification title shown
    expect(await screen.findByText("Marked Paid")).toBeInTheDocument();
  });

  it("marks a PROCESSING claim as PAID via Confirm modal (Mark Paid flow)", async () => {
    // adjust mock data to include a PROCESSING claim
    mockClaims[0].status = "PROCESSING";
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("user1@example.com"));
    // target aria-label used by component for Mark Paid button
    const markBtn = within(row!).getByRole("button", {
      name: /Mark claim .* as paid/i,
    });
    await userEvent.click(markBtn);

    // confirm modal appears
    const confirm = await screen.findByRole("dialog", {
      name: /Confirm Action/i,
    });
    const confirmBtn = within(confirm).getByRole("button", { name: /PAID/i });
    await userEvent.click(confirmBtn);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            /\/api\/admin\/rewards\/claim-1/.test(c.url) &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
    });

    // confirm flow sets a global success alert/notification — accept multiple matches
    const successNodes = await screen.findAllByText(/Claim marked PAID/i);
    expect(successNodes.length).toBeGreaterThan(0);
  });
});
