import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";

// Increase Jest timeout for this file: form/file uploads and network waits can be slow when run in the full suite.
jest.setTimeout(20000);

/*
  Integration tests for KycPage (mailroom KYC)

  - Mocks for SessionProvider, next/navigation and supabase are placed
    before importing the page so client hooks don't throw in tests.
  - Tests cover: verified snapshot, empty state submit-disabled,
    form validation (fields/files required) and full submit flow.
*/

/* Mock session, next/navigation and supabase BEFORE importing KycPage */
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: { user: { id: "user-123", email: "user@example.com" } },
    refresh: jest.fn(),
  }),
}));

// add router spies so tests can assert .back() calls
const pushMock = jest.fn();
const backMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
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

// Mock address actions
jest.mock("@/app/actions/get", () => ({
  getRegion: jest
    .fn()
    .mockResolvedValue([
      { region: "National Capital Region (NCR)", region_id: "reg-1" },
    ]),
  getProvince: jest.fn().mockResolvedValue([
    {
      province: "NCR, City of Manila, First District",
      province_id: "prov-1",
    },
  ]),
  getCity: jest
    .fn()
    .mockResolvedValue([
      { city: "Tondo I/II, City of Manila", city_id: "city-1" },
    ]),
  getBarangay: jest.fn().mockResolvedValue([
    {
      barangay: "Barangay 1",
      barangay_id: "brgy-1",
      barangay_zip_code: "1013",
    },
  ]),
}));

import KycPage from "@/app/(private)/mailroom/kyc/page";

/*
  KycPage tests:
  - mock network responses with global.fetch to simulate server state
  - mock URL.createObjectURL used by file preview logic in the page
*/
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

    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
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

    // mock GET returning an already-verified KYC row
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kyc: kycRow }),
    } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    // assert verified UI shows expected headings/labels
    expect(
      await screen.findByText(/Verification Complete/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Verified Information/i)).toBeInTheDocument();
  });

  it("shows form and keeps Submit disabled when no kyc exists", async () => {
    // mock GET returning null KYC to render the submission form
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
    // Submit should be disabled until required fields/files are provided
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

    // Cascading Address Selection
    // 1. Select Region
    const regionSelect = await screen.findByTestId("region-select");
    await userEvent.click(regionSelect);
    await userEvent.click(
      await screen.findByText("National Capital Region (NCR)"),
    );

    // 2. Select Province (mocked to depend on Region)
    const provinceSelect = await screen.findByTestId("province-select");
    await waitFor(() => expect(provinceSelect).not.toBeDisabled());
    await userEvent.click(provinceSelect);
    await userEvent.click(
      await screen.findByText("NCR, City of Manila, First District"),
    );

    // 3. Select City
    const citySelect = await screen.findByTestId("city-select");
    await waitFor(() => expect(citySelect).not.toBeDisabled());
    await userEvent.click(citySelect);
    await userEvent.click(
      await screen.findByText("Tondo I/II, City of Manila"),
    );

    // 4. Select Barangay
    const barangaySelect = await screen.findByTestId("barangay-select");
    await waitFor(() => expect(barangaySelect).not.toBeDisabled());
    await userEvent.click(barangaySelect);
    await userEvent.click(await screen.findByText("Barangay 1"));

    // Verify Postal Code is auto-filled
    await waitFor(() => {
      expect(screen.getByLabelText(/Postal Code/i)).toHaveValue("1013");
    });

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
    await waitFor(() => expect(submitBtn).toBeEnabled());
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

  it("back button calls router.back()", async () => {
    // initial GET returns no kyc to render the form view with Back button
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ kyc: null }),
    } as unknown as Response);

    render(
      <MantineProvider>
        <KycPage />
      </MantineProvider>,
    );

    // wait for the Back button to appear and click it
    const backBtn = await screen.findByRole("button", { name: /Go back/i });
    await userEvent.click(backBtn);

    // assert router.back was invoked — this verifies the in-page navigation button
    expect(backMock).toHaveBeenCalled();
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
