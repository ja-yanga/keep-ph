// Integration tests for Admin IP Whitelist page.
// - Renders page, verifies title and that list API is called.
// - Mocks mantine-datatable and PrivateMainLayout; mocks fetch for GET list.

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import IpWhitelistPage from "@/app/admin/ip-whitelist/page";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

// Mock mantine-datatable to avoid virtualization/layout issues in JSDOM
jest.mock("mantine-datatable", () => {
  const MockTable = (props: {
    records?: Array<Record<string, unknown>>;
    columns?: Array<{
      accessor?: string;
      title?: React.ReactNode;
      render?: (r: Record<string, unknown>) => React.ReactNode;
    }>;
    noRecordsText?: string;
  }) => (
    <div data-testid="ip-whitelist-table">
      <table role="table" aria-label="IP whitelist">
        <tbody>
          {(props.records ?? []).length === 0 ? (
            <tr>
              <td>{props.noRecordsText ?? "No records"}</td>
            </tr>
          ) : (
            (props.records ?? []).map((rec, i) => (
              <tr
                key={String(
                  (rec as Record<string, unknown>).admin_ip_whitelist_id ?? i,
                )}
              >
                <td>{String((rec as Record<string, unknown>).ip_cidr)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
  return { DataTable: MockTable };
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

// Polyfills
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
const g = globalThis as unknown as { ResizeObserver?: new () => TestRO };
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as new () => TestRO;
}

const mockListResponse = {
  entries: [
    {
      admin_ip_whitelist_id: "id-1",
      ip_cidr: "203.0.113.0/24",
      description: "Office",
      created_at: "2025-01-01T00:00:00Z",
      created_by: "user-1",
      created_by_name: "Admin User",
      updated_at: null,
      updated_by: null,
    },
  ],
  total_count: 1,
  current_ip: "203.0.113.10",
  current_match_ids: ["id-1"],
};

function renderPage() {
  return render(
    <MantineProvider>
      <IpWhitelistPage />
    </MantineProvider>,
  );
}

describe("Admin IP Whitelist page", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    global.fetch = jest.fn((url: string | URL) => {
      const path = typeof url === "string" ? url : url.toString();
      if (
        path.includes(API_ENDPOINTS.admin.ipWhitelist) &&
        !path.includes("/")
      ) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockListResponse),
        } as Response);
      }
      return Promise.reject(new Error("Unexpected fetch"));
    }) as jest.Mock;
  });

  it("renders page title and description", async () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /IP Whitelist/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Manage the IP ranges allowed to access admin features/i,
      ),
    ).toBeInTheDocument();
  });

  it("fetches whitelist and shows content", async () => {
    renderPage();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        API_ENDPOINTS.admin.ipWhitelist,
        expect.objectContaining({ cache: "no-store" }),
      );
    });
    await waitFor(() => {
      expect(screen.getByText(/Allowed IPs/i)).toBeInTheDocument();
    });
  });

  it("shows Add IP button after load", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Add IP/i }),
      ).toBeInTheDocument();
    });
  });

  it("shows Refresh button", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Refresh/i }),
      ).toBeInTheDocument();
    });
  });
});
