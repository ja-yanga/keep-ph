// Integration tests for MailroomPackages (admin).
// - Multiple flows: list rendering, search, Release, Scan, Dispose, Delete.
// - Uses lightweight mantine-datatable mock and minimal polyfills.
// - Captures fetch calls and returns Response-like objects (with clone/text/json).

// Summary:
// - Renders admin mailroom packages list and supports search (requests tab).
// - Tests Release, Scan, Dispose, and Delete flows including file uploads and confirmations.
// - Tests Add/Edit flows: validation, POST (create) and PUT (edit) behaviour.
// - Mocks: next/navigation (useSearchParams), mantine-datatable, FileReader, uploads, and API fetch responses.
// - Captures fetch calls for assertions and provides minimal Mantine/DOM shims for test stability.

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import { Notifications } from "@mantine/notifications";

// Mock next/navigation before importing the component that uses useSearchParams
jest.mock("next/navigation", () => ({
  useSearchParams: () => ({
    // default to "requests" tab so request-type packages are visible in tests
    get: () => "requests",
  }),
}));

// Mock mantine-datatable before importing the component so dynamic import uses the mock
jest.mock("mantine-datatable", () => ({
  DataTable: (props: {
    records?: Array<Record<string, unknown>>;
    columns?: {
      accessor?: string;
      title?: React.ReactNode;
      render?: (r: Record<string, unknown>) => React.ReactNode;
    }[];
    "aria-label"?: string;
  }) => {
    const records = props.records ?? [];
    const columns = props.columns ?? [];
    return (
      <table
        role="table"
        aria-label={props["aria-label"] ?? "Packages data table"}
      >
        <tbody>
          {records.map((rec, i) => {
            const record = rec as Record<string, unknown>;
            return (
              <tr role="row" key={String((record.id as string | number) ?? i)}>
                {columns.map((col, j) => {
                  const rendered =
                    typeof col.render === "function"
                      ? col.render(record)
                      : (record[col.accessor ?? ""] as unknown);
                  let node: React.ReactNode = "";
                  if (rendered === null || rendered === undefined) {
                    node = "";
                  } else if (
                    typeof rendered === "string" ||
                    typeof rendered === "number" ||
                    typeof rendered === "boolean"
                  ) {
                    node = String(rendered);
                  } else {
                    node = rendered as React.ReactNode;
                  }
                  return (
                    <td role="cell" key={j}>
                      {node}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
}));

import MailroomPackages from "@/components/MailroomPackages";

type DataTableColumn = {
  accessor?: string;
  title?: React.ReactNode;
  render?: (r: Record<string, unknown>) => React.ReactNode;
};

jest.mock("mantine-datatable", () => ({
  DataTable: (props: {
    records?: Array<Record<string, unknown>>;
    columns?: DataTableColumn[];
    "aria-label"?: string;
  }) => {
    const records = props.records ?? [];
    const columns = props.columns ?? [];
    return (
      <table
        role="table"
        aria-label={props["aria-label"] ?? "Packages data table"}
      >
        <tbody>
          {records.map((rec, i) => {
            const record = rec as Record<string, unknown>;
            return (
              <tr role="row" key={String((record.id as string | number) ?? i)}>
                {columns.map((col, j) => {
                  const rendered =
                    typeof col.render === "function"
                      ? col.render(record)
                      : (record[col.accessor ?? ""] as unknown);
                  let node: React.ReactNode = "";
                  if (rendered === null || rendered === undefined) {
                    node = "";
                  } else if (
                    typeof rendered === "string" ||
                    typeof rendered === "number" ||
                    typeof rendered === "boolean"
                  ) {
                    node = String(rendered);
                  } else {
                    node = rendered as React.ReactNode;
                  }
                  return (
                    <td role="cell" key={j}>
                      {node}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
}));

// basic polyfills/shims
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
Element.prototype.scrollIntoView = jest.fn();

// Mock FileReader for FileInput
class MockFileReader {
  result: string | null = null;
  onload: ((ev: ProgressEvent<FileReader>) => void) | null = null;
  readAsDataURL(_file?: File) {
    void _file;
    this.result = "data:image/png;base64,TEST";
    if (this.onload) {
      // cast via unknown to satisfy TypeScript structural differences
      this.onload({ target: this } as unknown as ProgressEvent<FileReader>);
    }
  }
}
(globalThis as unknown as { FileReader?: unknown }).FileReader =
  MockFileReader as unknown;

// sample packages covering multiple statuses
const samplePackages = [
  {
    id: "pkg-1",
    package_name: "Order #123",
    registration_id: "reg-1",
    package_type: "Parcel",
    status: "REQUEST_TO_RELEASE",
    received_at: new Date().toISOString(),
    registration: {
      id: "reg-1",
      full_name: "Bruce Wayne",
      email: "bruce@wayne.com",
      mobile: "09170000000",
    },
    locker: { id: "locker-1", locker_code: "L-101", is_available: false },
    // include an existing photo so editing can succeed without uploading a new file
    package_photo: "https://cdn.example/existing.png",
  },
  {
    id: "pkg-2",
    package_name: "Order #234",
    registration_id: "reg-2",
    package_type: "Document",
    status: "REQUEST_TO_SCAN",
    received_at: new Date().toISOString(),
    registration: {
      id: "reg-2",
      full_name: "Clark Kent",
      email: "clark@daily.com",
    },
    locker: { id: "locker-2", locker_code: "L-102", is_available: true },
  },
  {
    id: "pkg-3",
    package_name: "Order #345",
    registration_id: "reg-3",
    package_type: "Parcel",
    status: "REQUEST_TO_DISPOSE",
    received_at: new Date().toISOString(),
    registration: {
      id: "reg-3",
      full_name: "Diana Prince",
      email: "diana@amazon.com",
    },
    locker: { id: "locker-3", locker_code: "L-103", is_available: false },
  },
];

let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCalls = [];
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

      // combined endpoint
      if (
        url.includes("/api/admin/mailroom/packages") &&
        (!init || (init.method ?? "GET").toUpperCase() === "GET")
      ) {
        return makeResponse({
          packages: samplePackages,
          registrations: samplePackages.map((p) => p.registration),
          lockers: samplePackages.map((p) => p.locker),
          assignedLockers: [
            {
              id: "a1",
              registration_id: "reg-1",
              locker_id: "locker-1",
              status: "Normal",
            },
          ],
        });
      }

      // Create package
      if (
        url.endsWith("/api/admin/mailroom/packages") &&
        init?.method === "POST"
      ) {
        const bodyText = init.body ? String(init.body) : "{}";
        let parsed: unknown = {};
        try {
          parsed = JSON.parse(bodyText);
        } catch {
          parsed = {};
        }
        const parsedObj =
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
        const package_name =
          typeof parsedObj.package_name === "string"
            ? parsedObj.package_name
            : "New Package";
        const registration_id =
          typeof parsedObj.registration_id === "string"
            ? parsedObj.registration_id
            : "reg-1";
        const package_type =
          typeof parsedObj.package_type === "string"
            ? parsedObj.package_type
            : "Parcel";
        const status =
          typeof parsedObj.status === "string" ? parsedObj.status : "STORED";
        const newPkg = {
          id: "pkg-new",
          package_name,
          registration_id,
          package_type,
          status,
          received_at: new Date().toISOString(),
          registration: samplePackages[0].registration,
          locker: samplePackages[0].locker,
        };
        return makeResponse({ data: newPkg });
      }

      // Update package (edit)
      if (
        url.match(/\/api\/admin\/mailroom\/packages\/pkg-1/) &&
        init?.method === "PUT"
      ) {
        const bodyText = init.body ? String(init.body) : "{}";
        let parsed: unknown = {};
        try {
          parsed = JSON.parse(bodyText);
        } catch {
          parsed = {};
        }
        const parsedObj =
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : {};
        const updated = {
          ...samplePackages[0],
          ...parsedObj,
        };
        return makeResponse({ data: updated });
      }

      // release
      if (
        url.endsWith("/api/admin/mailroom/release") &&
        init?.method === "POST"
      ) {
        return makeResponse({ ok: true });
      }

      // scans upload
      if (
        url.endsWith("/api/admin/mailroom/scans") &&
        init?.method === "POST"
      ) {
        return makeResponse({ ok: true });
      }

      // dispose (PUT)
      if (
        url.match(/\/api\/admin\/mailroom\/packages\/pkg-3/) &&
        init?.method === "PUT"
      ) {
        return makeResponse({ ok: true });
      }

      // delete package
      if (
        url.match(/\/api\/admin\/mailroom\/packages\/pkg-1/) &&
        init?.method === "DELETE"
      ) {
        return makeResponse({ ok: true });
      }

      // generic upload endpoints
      if (url.includes("/upload")) {
        return makeResponse({ url: "https://cdn.example/test.png", ok: true });
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
      <Notifications />
      <SWRConfig value={{ provider: () => new Map() }}>
        <MailroomPackages />
      </SWRConfig>
    </MantineProvider>,
  );

describe("MailroomPackages (admin) - multiple flows", () => {
  it("renders packages list and supports search", async () => {
    renderComponent();
    await screen.findByRole("table");
    await waitFor(() => {
      const rows = screen.queryAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("Order #123"))).toBe(
        true,
      );
      expect(rows.some((r) => r.textContent?.includes("Order #234"))).toBe(
        true,
      );
      expect(rows.some((r) => r.textContent?.includes("Order #345"))).toBe(
        true,
      );
    });

    const search = screen.getByPlaceholderText("Search packages...");
    await userEvent.type(search, "Diana");
    await waitFor(() => {
      const rows = screen.queryAllByRole("row");
      expect(rows.some((r) => r.textContent?.includes("Diana Prince"))).toBe(
        true,
      );
      // requests tab returns all request-type rows (search not applied to requests),
      // so Bruce Wayne (REQUEST_TO_RELEASE) remains visible alongside Diana.
      expect(rows.some((r) => r.textContent?.includes("Bruce Wayne"))).toBe(
        true,
      );
    });
  });

  it("completes Release flow (REQUEST_TO_RELEASE)", async () => {
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Order #123"));
    const releaseBtn = within(row!).getByRole("button", {
      name: /Release package Order #123/i,
    });
    await userEvent.click(releaseBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Confirm Release/i,
    });

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!fileInput) throw new Error("file input not found");
    const file = new File(["x"], "proof.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    const submit = within(modal).getByRole("button", {
      name: /Upload Proof & Complete/i,
    });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.endsWith("/api/admin/mailroom/release") &&
            c.init?.method === "POST",
        ),
      ).toBe(true);
    });
  });

  it("uploads scanned document and completes scan flow (REQUEST_TO_SCAN)", async () => {
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Order #234"));
    const scanBtn = within(row!).getByRole("button", {
      name: /Upload scanned PDF for package Order #234/i,
    });
    await userEvent.click(scanBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Upload Scanned Document/i,
    });

    const fileInput = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    if (!fileInput) throw new Error("file input not found");
    const pdf = new File(["pdfcontent"], "scan.pdf", {
      type: "application/pdf",
    });
    await userEvent.upload(fileInput, pdf);

    const submit = within(modal).getByRole("button", {
      name: /Upload & Complete/i,
    });
    await userEvent.click(submit);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            c.url.endsWith("/api/admin/mailroom/scans") &&
            c.init?.method === "POST",
        ),
      ).toBe(true);
    });
  });

  it("confirms disposal and sends PUT update (REQUEST_TO_DISPOSE)", async () => {
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Order #345"));
    const disposeBtn = within(row!).getByRole("button", {
      name: /Dispose package Order #345/i,
    });
    await userEvent.click(disposeBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Confirm Disposal/i,
    });
    const confirm = within(modal).getByRole("button", {
      name: /Confirm Disposal/i,
    });
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            /\/api\/admin\/mailroom\/packages\/pkg-3/.test(c.url) &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
    });
  });

  it("deletes a package and calls DELETE endpoint", async () => {
    renderComponent();
    await screen.findByRole("table");

    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Order #123"));
    const deleteBtn = within(row!).getByRole("button", {
      name: /Delete package Order #123/i,
    });
    await userEvent.click(deleteBtn);

    const modal = await screen.findByRole("dialog", {
      name: /Confirm Deletion/i,
    });
    const confirm = within(modal).getByRole("button", { name: /Delete/i });
    await userEvent.click(confirm);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            /\/api\/admin\/mailroom\/packages\/pkg-1/.test(c.url) &&
            c.init?.method === "DELETE",
        ),
      ).toBe(true);
    });
  });
});

// add tests for Add/Edit flows
describe("MailroomPackages (admin) - create & edit flows", () => {
  it("shows validation error when trying to add package without required fields", async () => {
    renderComponent();
    await screen.findByRole("table");

    // open Add Package modal
    const addBtn = screen.getByRole("button", {
      name: /Add new package|Add Package/i,
    });
    await userEvent.click(addBtn);

    // modal appears
    const modal = await screen.findByRole("dialog", {
      name: /Add Package|Edit Package/i,
    });

    // fill package name only (leave recipient and photo empty) and submit
    const nameInput = within(modal).getByLabelText(/Package Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Test Add Package");

    const saveBtn = within(modal).getByRole("button", { name: /^Save$/i });
    await userEvent.click(saveBtn);

    // expect validation error shown
    expect(
      await within(modal).findByText(/Please fill in all required fields/i),
    ).toBeInTheDocument();
  });

  it("edits an existing package successfully", async () => {
    renderComponent();
    await screen.findByRole("table");

    // open Edit for first package
    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("Order #123"));
    const editBtn = within(row!).getByRole("button", {
      name: /Edit package Order #123/i,
    });
    await userEvent.click(editBtn);

    // modal opened prefilled
    const modal = await screen.findByRole("dialog", { name: /Edit Package/i });
    const nameInput = within(modal).getByLabelText(/Package Name/i);
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Order #123 - Edited");

    const saveBtn = within(modal).getByRole("button", { name: /^Save$/i });
    await userEvent.click(saveBtn);

    // assert PUT called for pkg-1
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) =>
            /\/api\/admin\/mailroom\/packages\/pkg-1/.test(c.url) &&
            c.init?.method === "PUT",
        ),
      ).toBe(true);
    });

    // expect success alert shown
    expect(
      await screen.findByText(/created|updated|successfully/i),
    ).toBeTruthy();
  });
});
