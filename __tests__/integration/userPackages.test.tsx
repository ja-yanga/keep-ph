import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import UserPackages from "@/components/UserPackages";

// Summary:
// - Renders package list and heading
// - Image preview modal (click package photo)
// - Request Scan flow (opens action modal -> submit -> PATCH)
// - Confirm Receipt flow for RELEASED packages (action modal -> PATCH)
// - Search/filtering by package name/type
// - Release & Dispose flows (action modal -> PATCH)
// - View Proof (release proof image) and View Scan (PDF iframe) + Request Rescan (PATCH)
// - Request Scan disabled when storage is full
// - Pagination controls when packages exceed per-page

// Mock next/image to a plain img for tests (forward only safe props so no DOM warnings)
// This replaces Next.js Image with a simple <img> to allow clicks and src assertions.
jest.mock("next/image", () => {
  const MockImage = (props: unknown) => {
    const p = props as Record<string, unknown>;
    const src = (p.src as string) ?? "";
    const alt = (p.alt as string) ?? "";
    const onClick = p.onClick as (() => void) | undefined;
    const style = (p.style as Record<string, unknown>) ?? undefined;
    const title = (p.title as string) ?? undefined;
    return React.createElement("img", {
      src,
      alt,
      onClick,
      style,
      title,
    });
  };
  MockImage.displayName = "NextImage";
  return MockImage;
});

// Mock PackageActionModal to a simple dialog that calls submitAction when the submit button is clicked
// This avoids rendering the real modal implementation while keeping submit behavior.
jest.mock("@/components/PackageActionModal", () => {
  const MockModal = (props: unknown) => {
    const p = props as Record<string, unknown>;
    const opened = Boolean(p.opened);
    const submitAction = p.submitAction as (() => Promise<void>) | undefined;
    const onClose = p.onClose as (() => void) | undefined;
    if (!opened) return null;
    return React.createElement(
      "div",
      { role: "dialog", "aria-label": "Package Action Modal" },
      React.createElement(
        "button",
        {
          type: "button",
          onClick: async () => {
            if (submitAction) await submitAction();
            if (onClose) onClose();
          },
        },
        "Submit Action",
      ),
    );
  };
  MockModal.displayName = "PackageActionModal";
  return MockModal;
});

// Provide a fake session so user-specific logic runs (component reads session)
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ session: { user: { id: "user-1" } } }),
}));

// small DOM shims used by Mantine in tests
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
Element.prototype.scrollIntoView = jest.fn();
const g = globalThis as unknown as {
  ResizeObserver?: new () => {
    observe(): void;
    unobserve(): void;
    disconnect(): void;
  };
};
if (typeof g.ResizeObserver === "undefined") {
  // Provide a minimal ResizeObserver mock used by some components
  g.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  } as unknown as new () => {
    observe(): void;
    unobserve(): void;
    disconnect(): void;
  };
}

// capture fetch calls to assert API interactions
let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCalls = [];
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });

      const makeResponse = (body: unknown, ok = true, status = 200) =>
        ({
          ok,
          status,
          json: async () => body,
          text: async () =>
            typeof body === "string" ? body : JSON.stringify(body),
          clone: () => ({
            text: async () =>
              typeof body === "string" ? body : JSON.stringify(body),
          }),
        }) as unknown as Response;

      // user addresses used in Release flow (component may fetch addresses)
      if (url.includes("/api/user/addresses")) {
        return makeResponse({
          data: [
            {
              id: "addr-1",
              user_address_label: "Home",
              user_address_contact_name: "Test Recipient",
              user_address_line1: "123 Test St",
              user_address_city: "Testville",
              user_address_postal: "1000",
              user_address_is_default: true,
            },
          ],
        });
      }

      // scans usage endpoint used by component; return minimal usage payload
      if (
        url.includes("/api/user/scans") &&
        init?.method !== "PATCH" &&
        init?.method !== "PATCH"
      ) {
        return makeResponse({
          usage: { used_mb: 1, limit_mb: 10, percentage: 10 },
          scans: [],
        });
      }

      // patch package endpoint - respond with patched item
      if (init && String(init.method ?? "").toUpperCase() === "PATCH") {
        return makeResponse({ ok: true, mailbox_item: { id: "patched" } });
      }

      return makeResponse({}, false, 404);
    },
  ) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

// sample data used across tests
const samplePackages = [
  {
    id: "pkg-1",
    package_name: "Parcel A",
    package_type: "Parcel",
    package_photo: "https://cdn.example/parcel-a.png",
    status: "STORED",
    received_at: new Date().toISOString(),
  },
  {
    id: "pkg-2",
    package_name: "Doc B",
    package_type: "Document",
    package_files: [
      {
        id: "f1",
        url: "https://cdn.example/doc-b.pdf",
        type: "SCANNED",
        name: "doc-b.pdf",
        uploaded_at: "2024-01-01T00:00:00Z",
      },
    ],
    status: "STORED",
    received_at: new Date().toISOString(),
  },
  {
    id: "pkg-3",
    package_name: "Parcel C",
    package_type: "Parcel",
    status: "RELEASED",
    received_at: new Date().toISOString(),
    mailroom_file_table: [
      {
        mailroom_file_type: "RELEASED",
        mailroom_file_url: "https://cdn.example/release-proof.png",
      },
    ],
  },
];

const lockers = [{ id: "locker-1", locker_code: "L-1" }];

describe("UserPackages (user) component", () => {
  it("renders package cards and opens image preview modal", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    // Assert heading and package titles render
    expect(
      await screen.findByRole("heading", { name: /Packages/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Parcel A")).toBeInTheDocument();
    expect(screen.getByText("Doc B")).toBeInTheDocument();

    const user = userEvent.setup();

    // clicking the package image should open preview modal with the correct src
    const img = screen.getAllByAltText("Package photo")[0];
    await user.click(img);

    const dialog = await screen.findByRole("dialog");
    const previewImg = within(dialog).getByRole("img");
    expect(previewImg).toHaveAttribute(
      "src",
      "https://cdn.example/parcel-a.png",
    );
  });

  it("requests scan via modal submit (Request Scan) and sends PATCH", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    const user = userEvent.setup();

    // open Request Scan modal by clicking the button, then submit
    const requestScanBtn = await screen.findByRole("button", {
      name: /Request Scan/i,
    });
    await user.click(requestScanBtn);

    const actionDialog = await screen.findByRole("dialog", {
      name: /Package Action Modal/i,
    });
    const submitBtn = within(actionDialog).getByRole("button", {
      name: /Submit Action/i,
    });
    await user.click(submitBtn);

    // verify PATCH call was issued
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "PATCH",
        ),
      ).toBe(true);
    });
  });

  it("confirms receipt for RELEASED package and sends PATCH", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    const user = userEvent.setup();

    // find Confirm Receipt action and submit via mocked modal
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm Receipt/i,
    });
    await user.click(confirmBtn);

    const actionDialog = await screen.findByRole("dialog", {
      name: /Package Action Modal/i,
    });
    const submitBtn = within(actionDialog).getByRole("button", {
      name: /Submit Action/i,
    });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "PATCH",
        ),
      ).toBe(true);
    });
  });

  it("filters packages by search input", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    const user = userEvent.setup();
    const search = screen.getByPlaceholderText(
      /Search by package name or package type.../i,
    );
    await user.type(search, "Doc B");

    // ensure filtering hides non-matching items
    await waitFor(() => {
      expect(screen.queryByText("Doc B")).toBeInTheDocument();
      expect(screen.queryByText("Parcel A")).not.toBeInTheDocument();
    });
  });

  it("Release and Dispose flows open modal and send PATCH", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    const user = userEvent.setup();

    // Click the first Release button available and submit via mocked modal
    const releaseBtns = await screen.findAllByRole("button", {
      name: /Release/i,
    });
    const releaseBtn = releaseBtns[0];
    await user.click(releaseBtn);

    const releaseDialog = await screen.findByRole("dialog", {
      name: /Package Action Modal/i,
    });
    await within(releaseDialog)
      .getByRole("button", { name: /Submit Action/i })
      .click();

    await waitFor(() =>
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "PATCH",
        ),
      ).toBe(true),
    );

    // Click the first Dispose button and submit
    const disposeBtns = await screen.findAllByRole("button", {
      name: /Dispose/i,
    });
    const disposeBtn = disposeBtns[0];
    await user.click(disposeBtn);

    const disposeDialog = await screen.findByRole("dialog", {
      name: /Package Action Modal/i,
    });
    await within(disposeDialog)
      .getByRole("button", { name: /Submit Action/i })
      .click();

    await waitFor(() =>
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "PATCH",
        ),
      ).toBe(true),
    );
  });

  it("view proof opens modal and view scan opens iframe and Request Rescan triggers PATCH", async () => {
    // provide scanMap for pkg-2 so View Scan button appears
    const scanMap = { "pkg-2": "https://cdn.example/scan-doc.pdf" };

    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
          scanMap={scanMap}
        />
      </MantineProvider>,
    );

    const user = userEvent.setup();

    // View Proof: click first View Proof and assert image src
    const viewProofBtn = await screen.findByRole("button", {
      name: /View Proof/i,
    });
    await user.click(viewProofBtn);

    const proofDialog = await screen.findByRole("dialog");
    const img = within(proofDialog).getByRole("img");
    expect(img).toHaveAttribute("src", "https://cdn.example/release-proof.png");

    // View Scan for pkg-2: opens dialog with iframe (PDF preview)
    const viewScanBtn = await screen.findByRole("button", {
      name: /View Scan/i,
    });
    await user.click(viewScanBtn);

    const scanDialog = await screen.findByRole("dialog");
    const iframe = scanDialog.querySelector("iframe");
    expect(iframe).toBeTruthy();

    // Request Rescan inside scan dialog triggers PATCH
    const rescanBtn = within(scanDialog).getByRole("button", {
      name: /Request Rescan/i,
    });
    await user.click(rescanBtn);

    await waitFor(() =>
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "PATCH",
        ),
      ).toBe(true),
    );
  });

  it("disables Request Scan when storage is full", async () => {
    render(
      <MantineProvider>
        <UserPackages
          packages={samplePackages}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
          isStorageFull
        />
      </MantineProvider>,
    );

    // Request Scan buttons should exist but be disabled when storage is full
    const reqButtons = screen.queryAllByRole("button", {
      name: /Request Scan/i,
    });
    expect(reqButtons.length).toBeGreaterThan(0);
    expect(reqButtons[0]).toBeDisabled();
  });

  it("shows pagination controls when packages exceed perPage", async () => {
    // create 5 packages to exceed perPage=3
    const many = Array.from({ length: 5 }).map((_, i) => ({
      id: `p-${i}`,
      package_name: `Many ${i}`,
      package_type: "Parcel",
      status: "STORED",
      received_at: new Date().toISOString(),
    }));
    render(
      <MantineProvider>
        <UserPackages
          packages={many}
          lockers={lockers}
          planCapabilities={{
            can_receive_mail: true,
            can_receive_parcels: true,
            can_digitize: true,
          }}
        />
      </MantineProvider>,
    );

    // Next pagination control should render
    const next = await screen.findByRole("button", { name: /Next/i });
    expect(next).toBeInTheDocument();

    // navigate to next page and assert new items shown
    const user = userEvent.setup();
    await user.click(next);

    await waitFor(() => {
      expect(
        screen.queryByText("Many 3") || screen.queryByText("Many 4"),
      ).toBeTruthy();
    });
  });
});
