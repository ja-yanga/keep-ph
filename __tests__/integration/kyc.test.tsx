import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

/*
  Integration tests for KycPage (mailroom KYC)

  - Mocks for SessionProvider, next/navigation and supabase are placed
    before importing the page so client hooks don't throw in tests.
  - Tests cover: verified snapshot, empty state submit-disabled,
    form validation (fields/files required) and full submit flow.
*/

// Mock session, next/navigation and supabase BEFORE importing KycPage
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: { user: { id: "user-123", email: "user@example.com" } },
    refresh: jest.fn(),
  }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  usePathname: () => "/",
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: jest.fn(), user: null },
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

import KycPage from "@/app/(private)/mailroom/kyc/page";

describe("KycPage — user kyc", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  // JSDOM doesn't implement createObjectURL; mock it so KycPage preview hooks won't throw
  const mockCreateObjectURL = jest.fn(() => "blob:mock");
  const mockRevokeObjectURL = jest.fn();

  // Save original URL object so we can restore after tests.
  const originalURL = (globalThis as unknown as Record<string, unknown>).URL;

  beforeAll(() => {
    const newURL = {
      ...(originalURL as Record<string, unknown>),
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    };
    Object.defineProperty(globalThis, "URL", {
      value: newURL,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(globalThis, "URL", {
      value: originalURL,
      configurable: true,
    });
  });

  it("renders verified snapshot when API returns VERIFIED kyc", async () => {
    const kycRow = {
      user_kyc_status: "VERIFIED",
      user_kyc_id_document_type: "Government ID",
      user_kyc_first_name: "Jane",
      user_kyc_last_name: "Doe",
      user_kyc_date_of_birth: "1990-05-12",
      user_kyc_id_front_url: "https://example.com/front.jpg",
      user_kyc_id_back_url: "https://example.com/back.jpg",
      id_document_number: "ABCD-1234-XYZ",
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kyc: kycRow }),
    } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    expect(
      await screen.findByText(/Verification Complete/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Verified Information/i)).toBeInTheDocument();
  });

  it("shows form and keeps Submit disabled when no kyc exists", async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kyc: null }),
    } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    const submitBtn = await screen.findByRole("button", {
      name: /Submit for Verification/i,
    });
    expect(submitBtn).toBeDisabled();
  });

  it("keeps Submit disabled until required fields and files provided", async () => {
    // initial GET returns no kyc
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kyc: null }),
    } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    // wait for the form submit button to appear
    const submitBtn = await screen.findByRole("button", {
      name: /Submit for Verification/i,
    });
    expect(submitBtn).toBeDisabled();

    // fill some required fields but not all
    await userEvent.type(
      await screen.findByLabelText(/Document Number/i),
      "ID-123",
    );
    await userEvent.type(screen.getByLabelText(/First name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/Last name/i), "Doe");
    // still disabled because files / address / dob missing
    expect(submitBtn).toBeDisabled();
  });

  it("submits form when fields and files present (opens confirm modal and calls API)", async () => {
    // initial GET (load) then POST (submit)
    (globalThis.fetch as jest.Mock) = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ kyc: null }),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    // fill required fields
    await userEvent.type(
      await screen.findByLabelText(/Document Number/i),
      "ID-123",
    );
    await userEvent.type(screen.getByLabelText(/First name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/Last name/i), "Doe");
    await userEvent.type(
      screen.getByLabelText(/^Date of birth/i),
      "1990-01-01",
    );
    await userEvent.type(
      (await findInputByAnyLabel(
        /Address line one/i,
        /Address Line 1/i,
        /Address line 1/i,
        /Line 1/i,
        /Address 1/i,
      )) as HTMLInputElement,
      "123 Street",
    );
    await userEvent.type(screen.getByLabelText(/City/i), "Quezon City");
    await userEvent.type(screen.getByLabelText(/Region/i), "Metro Manila");
    await userEvent.type(screen.getByLabelText(/Postal/i), "1100");

    // attach files
    const frontFile = new File(["front"], "front.png", { type: "image/png" });
    const backFile = new File(["back"], "back.png", { type: "image/png" });

    // Mantine FileInput renders a visible button and a hidden <input type="file">.
    // Query the actual file inputs directly and upload to them (first = front, second = back).
    const fileInputs = Array.from(
      document.querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[];
    if (fileInputs.length < 2) {
      throw new Error("Expected at least 2 file inputs for front/back images");
    }
    await userEvent.upload(fileInputs[0], frontFile);
    await userEvent.upload(fileInputs[1], backFile);

    // submit -> opens confirm modal
    const submitBtn = screen.getByRole("button", {
      name: /Submit for Verification/i,
    });
    expect(submitBtn).toBeEnabled();
    await userEvent.click(submitBtn);

    // confirm modal appears, click Confirm
    const confirmBtn = await screen.findByRole("button", { name: /Confirm/i });
    await userEvent.click(confirmBtn);

    // expect POST request called (second call)
    await waitFor(() => {
      expect(
        (globalThis.fetch as jest.Mock).mock.calls.length,
      ).toBeGreaterThanOrEqual(2);
      expect((globalThis.fetch as jest.Mock).mock.calls[1][0]).toMatch(
        /\/api\/user\/kyc/,
      );
    });
  });
});

/**
 * Try several common label patterns and return the first matching input element.
 * This makes tests resilient to small label text differences (e.g. "Address line one" vs "Address Line 1").
 */
async function findInputByAnyLabel(...patterns: Array<RegExp | string>) {
  // Use the parameter type of screen.findByLabelText to avoid `any`
  type LabelMatcher = Parameters<typeof screen.findByLabelText>[0];
  for (const p of patterns) {
    try {
      const el = await screen.findByLabelText(p as LabelMatcher);
      return el;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    `No input found for labels: ${patterns.map(String).join(", ")}`,
  );
}
