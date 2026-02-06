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

// Mock number formatter so we can assert formatted output deterministically
jest.mock("@/utils/format", () => ({
  formatCount: jest.fn((value: number) => `f:${value}`),
}));

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

// helper: get the numeric value rendered under a stats card label (p tag)
const getStatsValueByLabel = (label: string) => {
  const labelEls = screen
    .getAllByText(label)
    .filter((el) => el.tagName.toLowerCase() === "p");
  const labelEl = labelEls[0];
  const container = labelEl?.parentElement ?? null;
  if (!container) return "";
  const texts = container.querySelectorAll("p");
  if (texts.length < 2) return "";
  return texts[1].textContent ?? "";
};

describe("AdminRewards (admin)", () => {
  describe("Stats Cards", () => {
    it("renders stats labels and formatted counts", async () => {
      renderComponent();

      expect((await screen.findAllByText("Pending")).length).toBeGreaterThan(0);
      expect(screen.getAllByText("Processing").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Paid").length).toBeGreaterThan(0);

      // For 25 claims with alternating statuses:
      // PENDING = 13, PAID = 12, PROCESSING = 0
      expect(getStatsValueByLabel("Pending")).toBe("f:13");
      expect(getStatsValueByLabel("Processing")).toBe("f:0");
      expect(getStatsValueByLabel("Paid")).toBe("f:12");
    });

    it("calls formatCount with the computed counts", async () => {
      const { formatCount } = await import("@/utils/format");
      const formatSpy = formatCount as unknown as jest.Mock;

      renderComponent();

      await waitFor(() => {
        expect(formatSpy).toHaveBeenCalledWith(13);
        expect(formatSpy).toHaveBeenCalledWith(0);
        expect(formatSpy).toHaveBeenCalledWith(12);
      });
    });

    it("updates stats when data changes", async () => {
      // Force all claims to PROCESSING
      mockClaims = Array.from({ length: 5 }, (_, i) => ({
        id: `claim-${i + 1}`,
        user: { email: `user${i + 1}@example.com`, users_email: null },
        referral_count: i,
        total_referrals: i,
        amount: 100 * (i + 1),
        payment_method: "GCash",
        account_details: `0917000000${i}`,
        created_at: new Date().toISOString(),
        status: "PROCESSING",
        proof_url: null,
      }));

      renderComponent();

      expect((await screen.findAllByText("Processing")).length).toBeGreaterThan(
        0,
      );
      expect(getStatsValueByLabel("Pending")).toBe("f:0");
      expect(getStatsValueByLabel("Processing")).toBe("f:5");
      expect(getStatsValueByLabel("Paid")).toBe("f:0");
    });

    it("shows 0s when there are no claims", async () => {
      mockClaims = [];
      renderComponent();

      expect((await screen.findAllByText("Pending")).length).toBeGreaterThan(0);
      expect(getStatsValueByLabel("Pending")).toBe("f:0");
      expect(getStatsValueByLabel("Processing")).toBe("f:0");
      expect(getStatsValueByLabel("Paid")).toBe("f:0");
    });
  });

  it("displays the title 'Reward Claims'", async () => {
    renderComponent();
    expect(
      screen.getByRole("heading", { name: /Rewards & Referral Claims/i }),
    ).toBeInTheDocument();
  });

  it("renders claims list and supports search & tabs", async () => {
    renderComponent();

    await screen.findByRole("table");
    await waitForRowWithText("claim-1");

    const search = screen.getByPlaceholderText("Search claims...");
    await userEvent.type(search, "user3@example.com");

    await waitFor(() => {
      const rows = screen.queryAllByRole("row");
      expect(
        rows.some((r) => r.textContent?.includes("user3@example.com")),
      ).toBe(true);
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

    // find a row that contains masked account (maskAccount returns stars)
    const rows = screen.queryAllByRole("row");
    const maskedRow = rows.find((r) => r.textContent?.includes("****"));
    expect(maskedRow).toBeDefined();

    // find the icon-only button in that row (ActionIcon renders svg-only button)
    const buttons = within(maskedRow!).queryAllByRole("button");
    const iconOnlyBtn = buttons.find(
      (b) => (b.textContent ?? "").trim() === "",
    );
    expect(iconOnlyBtn).toBeDefined();

    // click to reveal
    await userEvent.click(iconOnlyBtn!);
    expect(maskedRow!.textContent).not.toContain("****");

    // click again to hide
    await userEvent.click(iconOnlyBtn!);
    expect(maskedRow!.textContent).toContain("****");
  });

  it("opens and closes the upload proof modal", async () => {
    renderComponent();
    await screen.findByRole("table");

    // find first Upload button in table and click
    const uploadBtn = screen.getAllByRole("button", { name: /Upload/i })[0];
    await userEvent.click(uploadBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Upload Proof of Payment/i,
    });
    expect(modal).toBeInTheDocument();

    const cancelBtn = within(modal).getByRole("button", { name: /Cancel/i });
    await userEvent.click(cancelBtn);

    await waitFor(() => {
      expect(
        screen.queryByRole("dialog", { name: /Upload Proof of Payment/i }),
      ).not.toBeInTheDocument();
    });
  });

  it("uploads proof and marks claim as PAID (Upload Proof flow)", async () => {
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("user1@example.com"));
    const uploadBtn = within(row!).getByRole("button", { name: /Upload/i });
    await userEvent.click(uploadBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Upload Proof of Payment/i,
    });

    const fileInputEl = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!fileInputEl)
      throw new Error("file input not found in Upload Proof modal");

    const file = new File(["dummy"], "proof.png", { type: "image/png" });
    await userEvent.upload(fileInputEl, file);

    const submit = within(modal).getByRole("button", {
      name: /Upload\s*&\s*Mark\s*Paid/i,
    });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.includes("/api/admin/rewards/claim-1") &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
    });

    expect(await screen.findByText("Marked Paid")).toBeInTheDocument();
  });

  it("marks a PROCESSING claim as PAID via Confirm modal (Mark Paid flow)", async () => {
    mockClaims[0].status = "PROCESSING";
    renderComponent();
    await screen.findByRole("table");

    // switch to Processing tab so the row is visible
    const processingTab = screen.getByRole("tab", { name: /Processing/i });
    await userEvent.click(processingTab);

    // wait for the row to appear
    await waitFor(() => {
      const rows = screen.queryAllByRole("row");
      expect(
        rows.some((r) => r.textContent?.includes("user1@example.com")),
      ).toBe(true);
    });

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("user1@example.com"));
    const markBtn = within(row!).getByRole("button", { name: /Mark Paid/i });
    await userEvent.click(markBtn);

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

    const successNodes = await screen.findAllByText(/Claim marked PAID/i);
    expect(successNodes.length).toBeGreaterThan(0);
  });
});
