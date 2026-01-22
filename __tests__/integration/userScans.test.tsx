// Summary:
// - Renders user scans list and storage usage badge
// - Opens preview modal for images and PDFs
// - Deletes a scan (confirm dialog) and asserts DELETE API call
// Notes:
// - Minimal DOM shims provided for Mantine compatibility
// - fetch calls are captured in `fetchCalls` for assertions

import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import UserScans from "@/components/UserScans";

// minimal DOM shims/polyfills used by Mantine in tests
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

// use a typed global alias instead of 'any' and remove unused TestRO
const g = globalThis as unknown as {
  ResizeObserver?: new () => {
    observe(): void;
    unobserve(): void;
    disconnect(): void;
  };
};
if (typeof g.ResizeObserver === "undefined") {
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

const sampleScans = [
  {
    id: "s1",
    file_name: "photo1.png",
    file_url: "https://cdn.example/photo1.png",
    file_size_mb: 0.5,
    uploaded_at: "2023-01-01T00:00:00Z",
    package: { package_name: "Order #1" },
  },
  {
    id: "s2",
    file_name: "doc1.pdf",
    file_url: "https://cdn.example/doc1.pdf",
    file_size_mb: 2.2,
    uploaded_at: "2023-02-01T00:00:00Z",
    package: { package_name: "Order #2" },
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
      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "{}",
        clone: () => ({ text: async () => "{}" }),
      } as unknown as Response;
    },
  ) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

describe("UserScans component", () => {
  it("renders provided scans, shows storage usage, preview opens image/pdf", async () => {
    render(
      <MantineProvider>
        <UserScans
          scans={sampleScans}
          usage={{ used_mb: 2.7, limit_mb: 10, percentage: 27 }}
        />
      </MantineProvider>,
    );

    // Badge shows files count
    expect(await screen.findByText(/2 Files/i)).toBeInTheDocument();

    // wait for table to render (loading false)
    const table = await screen.findByRole("table");

    // find the preview ActionIcon button by its accessible name (global)
    const previewBtn = within(table).getByRole("button", {
      name: /preview photo1\.png/i,
    });
    const user = userEvent.setup();
    await user.click(previewBtn);

    // wait for modal titled with file name and image inside it
    const modal = await screen.findByRole("dialog", { name: /photo1\.png/i });
    const img = await within(modal).findByAltText(/photo1\.png/i);
    expect(img).toHaveAttribute("src", "https://cdn.example/photo1.png");
  });

  it("deletes a scan when confirmed and calls DELETE endpoint", async () => {
    // mock confirm to allow deletion
    const origConfirm = global.confirm;
    (global as unknown as { confirm: (message?: string) => boolean }).confirm =
      () => true;

    render(
      <MantineProvider>
        <UserScans scans={[...sampleScans]} usage={null} />
      </MantineProvider>,
    );

    const user = userEvent.setup();

    const table = await screen.findByRole("table");

    // find delete ActionIcon button by accessible name (global)
    const deleteBtn = within(table).getByRole("button", {
      name: /delete doc1\.pdf/i,
    });
    await user.click(deleteBtn);

    // expect DELETE call to have been made
    await waitFor(() => {
      expect(
        fetchCalls.some(
          (c) => String(c.init?.method ?? "").toUpperCase() === "DELETE",
        ),
      ).toBe(true);
    });

    // after delete, doc1.pdf text should be gone
    await waitFor(() => {
      expect(screen.queryByText(/doc1\.pdf/i)).toBeNull();
    });

    // restore confirm
    (global as unknown as { confirm: (message?: string) => boolean }).confirm =
      origConfirm;
  });
});
