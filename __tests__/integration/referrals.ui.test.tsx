import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import ReferralsContent from "@/components/pages/customer/ReferralsPage/ReferralsContent";
import { REFERRALS_UI } from "@/utils/constants";
import userEvent from "@testing-library/user-event";

/**
 * Integration tests: Referrals UI (non-rewards flows)
 *
 * Tests included:
 * - renders referral code returned from the API
 * - copy button copies to clipboard and shows success label
 * - referrals list renders and shows correct count/progress
 * - progress title reflects (count/threshold)
 *
 * Notes:
 * - Components expect an authenticated session; we mock useSession.
 * - Mantine components may rely on ResizeObserver/matchMedia in JSDOM.
 * - Tests mock global.fetch with a deterministic sequence of responses.
 */

/* mock session so components render as an authenticated user */
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({
    session: { user: { id: "user-1", email: "u@example.com" } },
    refresh: jest.fn(),
  }),
}));

/* Mantine polyfills used by components in JSDOM */
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});
if (typeof global.matchMedia === "undefined") {
  Object.defineProperty(global, "matchMedia", {
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    configurable: true,
  });
}

describe("Referrals UI (no rewards flows)", () => {
  beforeEach(() => {
    // clear mocks between tests to avoid cross-test interference
    jest.clearAllMocks();
  });

  // Silence noisy console output from component during tests
  let errorSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;
  beforeEach(() => {
    // stub console methods so test output remains clean
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });
  afterEach(() => {
    // restore console behavior after each test
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it("renders referral code", async () => {
    // Mock sequence: 1) generate referral code, 2) empty referrals list, 3) empty claims
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referral_code: "CODE123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referrals: [] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ claims: [] }) });

    // assign mock to global fetch with a typed globalThis assignment (no @ts-expect-error)
    (globalThis as unknown as { fetch?: jest.Mock }).fetch = fetchMock;

    // render referrals content inside MantineProvider for accurate rendering
    render(
      <MantineProvider>
        <ReferralsContent />
      </MantineProvider>,
    );

    // assert the generated code appears in the UI
    expect(await screen.findByText("CODE123")).toBeTruthy();

    // verify the generate endpoint was called
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[0][0])).toContain(
      "/api/referrals/generate",
    );
  });

  it("copy button works: copies code and shows success label", async () => {
    // Mock sequence: generate code, list, claims (component may call multiple endpoints)
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referral_code: "CODE123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referrals: [] }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ claims: [] }) });

    (globalThis as unknown as { fetch?: jest.Mock }).fetch = fetchMock;

    // mock navigator.clipboard.writeText to verify copy behavior
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    });

    render(
      <MantineProvider>
        <ReferralsContent />
      </MantineProvider>,
    );

    // wait for referral code then interact with copy button
    expect(await screen.findByText("CODE123")).toBeTruthy();

    // locate copy button by accessible name and click it
    const copyBtn = screen.getByRole("button", {
      name: REFERRALS_UI.codeCard.copyDefault,
    });
    await userEvent.click(copyBtn);

    // after clicking, expect the success label to be shown
    expect(
      await screen.findByText(REFERRALS_UI.codeCard.copySuccess),
    ).toBeTruthy();
  });

  it("renders referrals list and shows count", async () => {
    // prepare mocked referrals returned by the API
    const referrals = [
      {
        referral_id: "r1",
        referrals_referred_email: "a@x.com",
        referral_date_created: new Date().toISOString(),
      },
      {
        referral_id: "r2",
        referrals_referred_email: "b@x.com",
        referral_date_created: new Date().toISOString(),
      },
    ];

    // mock sequence: generate code, list referrals, claims
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referral_code: "CODE123" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ referrals }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ claims: [] }) });

    (globalThis as unknown as { fetch?: jest.Mock }).fetch = fetchMock;

    render(
      <MantineProvider>
        <ReferralsContent />
      </MantineProvider>,
    );

    // Progress title should reflect total referrals (e.g. "Referral Progress (2/10)")
    expect(
      await screen.findByText(
        new RegExp(`Referral Progress \\(${referrals.length}/`),
      ),
    ).toBeTruthy();

    // referral count badge/text should match referrals length
    expect(await screen.findByText(String(referrals.length))).toBeTruthy();

    // verify the list endpoint was requested
    expect(fetchMock).toHaveBeenCalled();
    expect(String(fetchMock.mock.calls[1][0])).toContain("/api/referrals/list");
  });

  it("shows progress title with (count/threshold) when not yet unlocked", async () => {
    // single referral scenario to assert progress shows the correct "(1/threshold)"
    const smallList = [
      {
        referral_id: "r1",
        referrals_referred_email: "single@x.com",
        referral_date_created: new Date().toISOString(),
      },
    ];
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referral_code: "C2" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ referrals: smallList }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ claims: [] }) });

    (globalThis as unknown as { fetch?: jest.Mock }).fetch = fetchMock;

    render(
      <MantineProvider>
        <ReferralsContent />
      </MantineProvider>,
    );

    const threshold = REFERRALS_UI.threshold;
    // wait for a progress title like "(1/10)" to appear in the UI
    await waitFor(() => {
      expect(
        screen.getByText(new RegExp(`\\(${smallList.length}/${threshold}\\)`)),
      ).toBeTruthy();
    });
  });
});
