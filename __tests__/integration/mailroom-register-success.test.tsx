import React from "react";
import { render, waitFor } from "@testing-library/react";
import MailroomRegisterSuccessPage from "@/app/(private)/mailroom/register/success/page";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

jest.setTimeout(20000);

const pushMock = jest.fn();

// Mock next/navigation hooks used by the success page.
// useSearchParams provides the order query param the page reads to poll the API.
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("order=reg_user-1_123"),
  usePathname: () => "/",
}));

/**
 * Integration test: Mailroom register success page
 *
 * Purpose:
 * - Verify the success page polls the backend (lookup-by-order) and redirects
 *   the user to the dashboard when the registration is marked as paid.
 *
 * Setup notes:
 * - We push the order query into history so the component reads the correct order id.
 * - fetch is mocked to return an immediate "paid" result via json().data.
 * - The page is rendered inside MantineProvider + SWRConfig to match app context.
 */
describe("Mailroom register success page", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure the component reads the intended order id from window.location.search
    window.history.pushState(
      {},
      "",
      "/mailroom/register/success?order=reg_user-1_123",
    );

    // Mock lookup-by-order to return a paid registration immediately.
    // Component expects the response shape at json().data.
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { mailroom_registration_status: true, paid: true },
      }),
    } as unknown as Response);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("polls and redirects to dashboard when registration is paid", async () => {
    // Render the success page with providers so Mantine hooks work.
    render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <MantineProvider>
          <MailroomRegisterSuccessPage />
        </MantineProvider>
      </SWRConfig>,
    );

    // Wait until the component triggers router.push("/dashboard").
    await waitFor(
      () => {
        const flatCalls = pushMock.mock.calls.flat();
        expect(flatCalls).toContain("/dashboard");
      },
      { timeout: 10000 },
    );
  });
});
