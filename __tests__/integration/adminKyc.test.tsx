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

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => "/admin/kyc",
}));

const mockKycData = [
  {
    id: "1",
    user_id: "user-1",
    status: "SUBMITTED",
    full_name: "John Submitted",
    id_document_type: "PASSPORT",
    submitted_at: "2024-01-01T10:00:00Z",
  },
  {
    id: "2",
    user_id: "user-2",
    status: "VERIFIED",
    full_name: "Jane Verified",
    id_document_type: "DRIVER_LICENSE",
    submitted_at: "2024-01-01T10:00:00Z",
    verified_at: "2024-01-02T10:00:00Z",
  },
  {
    id: "3",
    user_id: "user-3",
    status: "REJECTED",
    full_name: "Bob Rejected",
    id_document_type: "NATIONAL_ID",
    submitted_at: "2024-01-01T10:00:00Z",
  },
];

describe("Admin KYC Workflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSWR as jest.Mock).mockReturnValue({
      data: { data: mockKycData, total_count: 3 },
      error: null,
      isValidating: false,
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
    const submittedTab = screen.getByLabelText("Submitted");
    fireEvent.click(submittedTab);

    // SWR key should have changed to include status=SUBMITTED
    expect(useSWR).toHaveBeenLastCalledWith(
      expect.stringContaining("status=SUBMITTED"),
      expect.any(Function),
      expect.any(Object),
    );

    // Click "Verified" tab
    const verifiedTab = screen.getByLabelText("Verified");
    fireEvent.click(verifiedTab);
    expect(useSWR).toHaveBeenLastCalledWith(
      expect.stringContaining("status=VERIFIED"),
      expect.any(Function),
      expect.any(Object),
    );

    // Click "Rejected" tab
    const rejectedTab = screen.getByLabelText("Rejected");
    fireEvent.click(rejectedTab);
    expect(useSWR).toHaveBeenLastCalledWith(
      expect.stringContaining("status=REJECTED"),
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("should fetch data when searching", async () => {
    renderWithProviders(<AdminKycPage />);

    const searchInput = screen.getByPlaceholderText(
      /Search by name or user id\.\.\./i,
    );
    await userEvent.type(searchInput, "John");

    const searchButton = screen.getByLabelText(/Submit search/i);
    await userEvent.click(searchButton);

    expect(useSWR).toHaveBeenLastCalledWith(
      expect.stringContaining("q=John"),
      expect.any(Function),
      expect.any(Object),
    );
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
});
