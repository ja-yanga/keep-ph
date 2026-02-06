// Polyfill ResizeObserver and IntersectionObserver for JSDOM
const g = globalThis as unknown as {
  ResizeObserver: new () => ResizeObserver;
  IntersectionObserver: new (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) => IntersectionObserver;
};
if (typeof g.ResizeObserver === "undefined") {
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
if (typeof g.IntersectionObserver === "undefined") {
  g.IntersectionObserver = class {
    constructor() {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords() {
      return [];
    }
    readonly root: Element | null = null;
    readonly rootMargin: string = "";
    readonly thresholds: ReadonlyArray<number> = [];
  } as unknown as new (
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) => IntersectionObserver;
}

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import AdminKycPage from "@/app/admin/kyc/page";
import useSWR from "swr";
import { notifications } from "@mantine/notifications";

// Mocking dependencies
jest.mock("swr");
jest.mock("@mantine/notifications", () => ({
  notifications: {
    show: jest.fn(),
  },
}));

// Mock DataTable
jest.mock("mantine-datatable", () => {
  type MockDataTableProps<T> = {
    records: T[];
    columns: {
      accessor: string;
      title: React.ReactNode;
      render?: (record: T) => React.ReactNode;
    }[];
    noRecordsText?: string;
  };

  const MockDataTable = <T extends Record<string, unknown>>({
    records,
    columns,
    noRecordsText,
  }: MockDataTableProps<T>) => (
    <div data-testid="mock-data-table">
      {records.length === 0 ? (
        <div>{noRecordsText}</div>
      ) : (
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.accessor}>{col.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((rec, recIdx) => (
              <tr key={(rec.id as string) ?? recIdx}>
                {columns.map((col, idx) => (
                  <td key={col.accessor ?? idx}>
                    {col.render
                      ? col.render(rec)
                      : (rec[col.accessor] as React.ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
  return {
    __esModule: true,
    DataTable: MockDataTable,
  };
});

// Mock next/dynamic to be synchronous and handle loader results
jest.mock("next/dynamic", () => ({
  __esModule: true,
  default: (
    loader: () => Promise<
      React.ComponentType<unknown> | { default: React.ComponentType<unknown> }
    >,
  ) => {
    const MockDynamic = (props: Record<string, unknown>) => {
      const [Component, setComponent] =
        React.useState<React.ComponentType<unknown> | null>(null);
      React.useEffect(() => {
        const load = async () => {
          const mod = await loader();
          setComponent(() => ("default" in mod ? mod.default : mod));
        };
        load();
      }, []);
      return Component ? <Component {...props} /> : null;
    };
    return MockDynamic;
  },
}));

// Mock SessionProvider
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: {
      user: { id: "admin-123", email: "admin@example.com", role: "admin" },
    },
    status: "authenticated",
  }),
}));

// Mock PrivateMainLayout to simplify
jest.mock("@/components/Layout/PrivateMainLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock next/navigation (include useSearchParams used by the component)
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => "/admin/kyc",
  useSearchParams: () => ({
    get: () => null,
  }),
}));

const mockKycData = [
  {
    user_kyc_id: "1",
    user_id: "user-1",
    user_kyc_status: "SUBMITTED",
    user_kyc_first_name: "John",
    user_kyc_last_name: "Submitted",
    user_kyc_id_document_type: "PASSPORT",
    user_kyc_submitted_at: "2024-01-01T10:00:00Z",
  },
  {
    user_kyc_id: "2",
    user_id: "user-2",
    user_kyc_status: "VERIFIED",
    user_kyc_first_name: "Jane",
    user_kyc_last_name: "Verified",
    user_kyc_id_document_type: "DRIVER_LICENSE",
    user_kyc_submitted_at: "2024-01-01T10:00:00Z",
    user_kyc_verified_at: "2024-01-02T10:00:00Z",
  },
  {
    user_kyc_id: "3",
    user_id: "user-3",
    user_kyc_status: "REJECTED",
    user_kyc_first_name: "Bob",
    user_kyc_last_name: "Rejected",
    user_kyc_id_document_type: "NATIONAL_ID",
    user_kyc_submitted_at: "2024-01-01T10:00:00Z",
  },
];

describe("Admin KYC Workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSWR as jest.Mock).mockImplementation((key: string) => {
      const keyStr = String(key);
      const isStats =
        keyStr.includes("pageSize=1") && !keyStr.includes("sortBy=");
      if (isStats) {
        if (keyStr.includes("status=SUBMITTED")) {
          return {
            data: { total_count: 111 },
            error: null,
            isValidating: false,
          };
        }
        if (keyStr.includes("status=VERIFIED")) {
          return {
            data: { total_count: 222 },
            error: null,
            isValidating: false,
          };
        }
        if (keyStr.includes("status=REJECTED")) {
          return {
            data: { total_count: 333 },
            error: null,
            isValidating: false,
          };
        }
      }
      // Table data path (supports status filtering)
      let filtered = mockKycData;
      if (keyStr.includes("status=SUBMITTED")) {
        filtered = mockKycData.filter((r) => r.user_kyc_status === "SUBMITTED");
      } else if (keyStr.includes("status=VERIFIED")) {
        filtered = mockKycData.filter((r) => r.user_kyc_status === "VERIFIED");
      } else if (keyStr.includes("status=REJECTED")) {
        filtered = mockKycData.filter((r) => r.user_kyc_status === "REJECTED");
      }
      return {
        data: { data: filtered, total_count: filtered.length },
        error: null,
        isValidating: false,
      };
    });

    // Mock global fetch for actions
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as unknown as Response);
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<MantineProvider>{ui}</MantineProvider>);
  };

  // Helper: get the numeric value displayed under a stats label.
  const getStatValueByLabel = (label: string) => {
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

  it("should find KYC Verification title", async () => {
    renderWithProviders(<AdminKycPage />);
    expect(screen.getByText(/KYC Verification/i)).toBeInTheDocument();
  });

  it("should fetch and display data in All, submitted, verified, rejected tabs", async () => {
    renderWithProviders(<AdminKycPage />);

    // Initially "All" is active (mocked data has 3 records)
    expect(await screen.findByText("John Submitted")).toBeInTheDocument();
    expect(screen.getByText("Jane Verified")).toBeInTheDocument();
    expect(screen.getByText("Bob Rejected")).toBeInTheDocument();

    // Click "Submitted" tab
    const submittedTab = screen.getByRole("tab", { name: /Submitted/i });
    fireEvent.click(submittedTab);

    // SWR key should have changed to include status=SUBMITTED
    expect(
      (useSWR as jest.Mock).mock.calls.some((c) =>
        String(c[0]).includes("status=SUBMITTED"),
      ),
    ).toBe(true);

    // Click "Verified" tab
    const verifiedTab = screen.getByRole("tab", { name: /Verified/i });
    fireEvent.click(verifiedTab);
    expect(
      (useSWR as jest.Mock).mock.calls.some((c) =>
        String(c[0]).includes("status=VERIFIED"),
      ),
    ).toBe(true);

    // Click "Rejected" tab
    const rejectedTab = screen.getByRole("tab", { name: /Rejected/i });
    fireEvent.click(rejectedTab);
    expect(
      (useSWR as jest.Mock).mock.calls.some((c) =>
        String(c[0]).includes("status=REJECTED"),
      ),
    ).toBe(true);
  });

  it("should fetch data when searching", async () => {
    renderWithProviders(<AdminKycPage />);

    const searchInput = await screen.findByPlaceholderText(
      /Search by name or user id\.\.\./i,
    );
    await userEvent.type(searchInput, "John");

    const searchButton = screen.getByLabelText(/Submit search/i);
    await userEvent.click(searchButton);

    expect(
      (useSWR as jest.Mock).mock.calls.some((c) =>
        String(c[0]).includes("q=John"),
      ),
    ).toBe(true);
  });

  it("should show modal when clicking Manage", async () => {
    renderWithProviders(<AdminKycPage />);

    const manageButtons = await screen.findAllByRole("button", {
      name: /Manage/i,
    });
    await userEvent.click(manageButtons[0]);

    expect(await screen.findByText(/KYC Details/i)).toBeInTheDocument();
    expect(screen.getAllByText("John Submitted")[0]).toBeInTheDocument();
  });

  it("should mark as verified", async () => {
    renderWithProviders(<AdminKycPage />);

    const manageButtons = await screen.findAllByRole("button", {
      name: /Manage/i,
    });
    await userEvent.click(manageButtons[0]); // John Submitted

    const verifyButton = await screen.findByRole("button", {
      name: /Mark Verified/i,
    });
    await userEvent.click(verifyButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("user-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ action: "VERIFIED" }),
        }),
      );
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success",
        color: "green",
      }),
    );
  });

  it("should reject kyc", async () => {
    renderWithProviders(<AdminKycPage />);

    const manageButtons = await screen.findAllByRole("button", {
      name: /Manage/i,
    });
    await userEvent.click(manageButtons[0]); // John Submitted

    const rejectButton = await screen.findByRole("button", { name: /Reject/i });
    await userEvent.click(rejectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("user-1"),
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ action: "REJECTED" }),
        }),
      );
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success",
        color: "green",
      }),
    );
  });

  it("should render KYC stats cards with counts", async () => {
    renderWithProviders(<AdminKycPage />);

    // Stats cards use total_count from SWR mocks above (111/222/333)
    expect(await screen.findByText("111")).toBeInTheDocument();
    expect(screen.getByText("222")).toBeInTheDocument();
    expect(screen.getByText("333")).toBeInTheDocument();
  });

  it("should render KYC stats labels and formatted counts", async () => {
    (useSWR as jest.Mock).mockImplementation((key: string) => {
      const keyStr = String(key);
      const isStats =
        keyStr.includes("pageSize=1") && !keyStr.includes("sortBy=");
      if (isStats) {
        if (keyStr.includes("status=SUBMITTED")) {
          return {
            data: { total_count: 1111 },
            error: null,
            isValidating: false,
          };
        }
        if (keyStr.includes("status=VERIFIED")) {
          return {
            data: { total_count: 2222 },
            error: null,
            isValidating: false,
          };
        }
        if (keyStr.includes("status=REJECTED")) {
          return {
            data: { total_count: 3333 },
            error: null,
            isValidating: false,
          };
        }
      }
      return {
        data: { data: mockKycData, total_count: mockKycData.length },
        error: null,
        isValidating: false,
      };
    });

    renderWithProviders(<AdminKycPage />);

    // Labels (stats cards use <p>, tabs use <span>)
    expect((await screen.findAllByText("Submitted")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Verified").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rejected").length).toBeGreaterThan(0);

    // Formatted values (Intl.NumberFormat adds commas)
    expect(getStatValueByLabel("Submitted")).toBe("1,111");
    expect(getStatValueByLabel("Verified")).toBe("2,222");
    expect(getStatValueByLabel("Rejected")).toBe("3,333");
  });

  it("should call SWR with stats keys for each status", async () => {
    renderWithProviders(<AdminKycPage />);

    await waitFor(() => {
      const calls = (useSWR as jest.Mock).mock.calls.map((c) => String(c[0]));
      expect(
        calls.some(
          (k) => k.includes("pageSize=1") && k.includes("status=SUBMITTED"),
        ),
      ).toBe(true);
      expect(
        calls.some(
          (k) => k.includes("pageSize=1") && k.includes("status=VERIFIED"),
        ),
      ).toBe(true);
      expect(
        calls.some(
          (k) => k.includes("pageSize=1") && k.includes("status=REJECTED"),
        ),
      ).toBe(true);
    });
  });

  it("should show 0s when stats data is unavailable", async () => {
    (useSWR as jest.Mock).mockImplementation((key: string) => {
      const keyStr = String(key);
      const isStats =
        keyStr.includes("pageSize=1") && !keyStr.includes("sortBy=");
      if (isStats) {
        return { data: undefined, error: null, isValidating: false };
      }
      return {
        data: { data: mockKycData, total_count: mockKycData.length },
        error: null,
        isValidating: false,
      };
    });

    renderWithProviders(<AdminKycPage />);

    // When stats data is missing, each card should show "0"
    expect((await screen.findAllByText("Submitted")).length).toBeGreaterThan(0);
    expect(getStatValueByLabel("Submitted")).toBe("0");
    expect(getStatValueByLabel("Verified")).toBe("0");
    expect(getStatValueByLabel("Rejected")).toBe("0");
  });
});
