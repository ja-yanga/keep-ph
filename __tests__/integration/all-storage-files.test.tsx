import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

// mock next/image to avoid Next.js image loader errors in JSDOM
jest.mock("next/image", () => {
  return {
    __esModule: true,
    default: ({
      src,
      alt,
      ...props
    }: {
      src: string | { src?: string };
      alt?: string;
      [k: string]: unknown;
    }) => {
      // only forward string/number props to avoid boolean DOM attribute warnings
      const forwardedProps = Object.fromEntries(
        Object.entries(props).filter(([, v]) => {
          const t = typeof v;
          return t === "string" || t === "number";
        }),
      ) as Record<string, string | number>;

      const srcStr =
        typeof src === "string"
          ? src
          : (src && (src as unknown as { src?: string }).src) || "";

      return React.createElement("img", {
        src: srcStr,
        alt,
        ...forwardedProps,
      });
    },
  };
});

/*
  Integration tests for AllStorageFiles component.

  - Mocks: session, next/navigation, supabase client to isolate component.
  - JSDOM shims: URL.createObjectURL, ResizeObserver, matchMedia for Mantine.
  - SWRConfig wrapper prevents cache interference between tests.
*/

jest.mock("@/components/SessionProvider", () => ({
  // Provide a stable session object for components that read current user
  useSession: () => ({ session: { user: { id: "user-1" } } }),
}));

// Mock next/navigation hooks used by components (router no-op)
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

// Mock supabase client to avoid initializing real client during tests
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: jest.fn(), user: null },
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

// JSDOM shims used by Mantine and file preview code
const mockCreateObjectURL = jest.fn(() => "blob:mock");
const mockRevokeObjectURL = jest.fn();
const originalURL = (globalThis as unknown as Record<string, unknown>).URL;

beforeAll(() => {
  // Replace global URL with createObjectURL/revokeObjectURL stubs so
  // components that create previews won't throw in tests.
  Object.defineProperty(globalThis, "URL", {
    value: {
      ...(originalURL as Record<string, unknown>),
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    },
    configurable: true,
  });

  // Minimal ResizeObserver stub — Mantine/layout code may rely on it.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Provide a typed window.matchMedia fallback for responsive hooks.
  if (!window.matchMedia) {
    const fakeMatchMedia = (query: string): MediaQueryList =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;

    Object.defineProperty(window, "matchMedia", {
      value: fakeMatchMedia,
      configurable: true,
    });
  }
});

afterAll(() => {
  // Restore original URL after tests complete.
  Object.defineProperty(globalThis, "URL", {
    value: originalURL,
    configurable: true,
  });
});

import AllStorageFiles from "@/components/AllStorageFiles";

describe("AllStorageFiles component", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    // Save/restore fetch so tests can provide per-test mocks.
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  it("shows empty state when no files", async () => {
    // Mock GET /api/user/storage returning empty scans array
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scans: [] }),
    } as unknown as Response);

    // Render component inside SWR and Mantine providers
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AllStorageFiles />
        </MantineProvider>
      </SWRConfig>,
    );

    // Expect empty state message to appear (match actual component text)
    expect(await screen.findByText(/No files found/i)).toBeInTheDocument();

    // Assert fetch was called for the storage endpoint (allow query params)
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/user/storage"),
      expect.any(Object),
    );
  });

  it("renders list of files and opens preview modal", async () => {
    // Prepare a single scan record to be returned by the GET request
    const scans = [
      {
        id: "s1",
        file_name: "doc.png",
        file_url: "https://example.com/doc.png",
        file_size_mb: 0.12,
        uploaded_at: new Date().toISOString(),
        mime_type: "image/png",
        package_id: null,
        package: null,
      },
    ];

    // Mock fetch GET -> returns scans
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ scans }),
    } as unknown as Response);

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AllStorageFiles />
        </MantineProvider>
      </SWRConfig>,
    );

    const filenameNode = await screen.findByText(/doc\.png/i);
    expect(filenameNode).toBeInTheDocument();

    const table = (await screen.findAllByRole("table"))[0];
    expect(within(table).getByText(/doc\.png/i)).toBeInTheDocument();

    const docRow = (within(table).getAllByRole("row") || []).find((r) =>
      /doc\.png/i.test(r.textContent || ""),
    ) as HTMLElement | undefined;
    expect(docRow).toBeDefined();

    let previewBtn: HTMLElement;
    try {
      previewBtn = within(docRow as HTMLElement).getByRole("button", {
        name: /preview/i,
      });
    } catch {
      previewBtn = within(docRow as HTMLElement).getAllByRole("button")[0];
    }

    await userEvent.click(previewBtn);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByAltText(/doc\.png/i)).toHaveAttribute(
      "src",
      "https://example.com/doc.png",
    );
  });

  it("deletes a file when confirmed and removes it from list", async () => {
    // Single scan item used for delete flow
    const scans = [
      {
        id: "delete-1",
        file_name: "to-delete.pdf",
        file_url: "https://example.com/to-delete.pdf",
        file_size_mb: 1.2,
        uploaded_at: new Date().toISOString(),
        mime_type: "application/pdf",
        package_id: null,
        package: null,
      },
    ];

    // keep mutable state so subsequent GET after DELETE returns empty
    let deleted = false;
    const fetchMock = jest.fn(
      async (input: RequestInfo, init?: RequestInit) => {
        const url = String(input);
        const method = (init && init.method) ?? "GET";
        if (url.includes("/api/user/storage") && method === "GET") {
          return {
            ok: true,
            json: async () => ({
              scans: deleted ? [] : scans,
              pagination: { total: deleted ? 0 : 1, limit: 10 },
            }),
          } as unknown as Response;
        }
        if (
          url.includes(`/api/user/storage/${encodeURIComponent("delete-1")}`) &&
          method === "DELETE"
        ) {
          deleted = true;
          return {
            ok: true,
            json: async () => ({ success: true }),
          } as unknown as Response;
        }
        return { ok: false, json: async () => ({}) } as unknown as Response;
      },
    ) as unknown as typeof globalThis.fetch;
    globalThis.fetch = fetchMock;

    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <AllStorageFiles />
        </MantineProvider>
      </SWRConfig>,
    );

    expect(await screen.findByText(/to-delete\.pdf/i)).toBeInTheDocument();

    const tableAfter = (await screen.findAllByRole("table"))[0];
    const delRow = (within(tableAfter).getAllByRole("row") || []).find((r) =>
      /to-delete\.pdf/i.test(r.textContent || ""),
    );
    expect(delRow).toBeDefined();

    let deleteBtnInRow: HTMLElement;
    try {
      deleteBtnInRow = within(delRow as HTMLElement).getByRole("button", {
        name: /delete/i,
      });
    } catch {
      deleteBtnInRow = within(delRow as HTMLElement)
        .getAllByRole("button")
        .pop()!;
    }
    await userEvent.click(deleteBtnInRow);

    const confirmDialog = await screen.findByRole("dialog");
    const delBtn = within(confirmDialog).getByRole("button", {
      name: /Delete/i,
    });
    await userEvent.click(delBtn);

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          `/api/user/storage/${encodeURIComponent("delete-1")}`,
        ),
        expect.objectContaining({ method: "DELETE" }),
      );
    });

    // after deletion the list should be empty; wait for row to be removed
    await waitFor(
      () => {
        expect(screen.queryByText(/to-delete\.pdf/i)).not.toBeInTheDocument();
      },
      { timeout: 8000 },
    );
  });
});

// increase jest timeout for this integration file
jest.setTimeout(15000);
