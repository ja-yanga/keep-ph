import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import RewardClaimModal from "@/components/pages/customer/ReferralsPage/RewardClaimModal";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { notifications } from "@mantine/notifications";

// Mock notifications so tests can assert notifications calls without showing UI
jest.mock("@mantine/notifications", () => ({
  notifications: { show: jest.fn() },
}));

/*
  Integration tests for RewardClaimModal:
  - Verifies successful submission calls API and triggers callbacks.
  - Verifies handling of 409 conflict response.
  - Verifies client-side validation shows an alert for invalid input.

  Tests render the component inside MantineProvider to satisfy UI components.
*/
describe("RewardClaimModal", () => {
  // simple spies passed to the component to verify side-effects
  const onClose = jest.fn();
  const onSuccess = jest.fn();
  const userId = "user-1";

  // preserve original fetch between tests so global fetch can be restored
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    jest.clearAllMocks(); // reset spies/mocks before each test
  });

  afterEach(() => {
    // restore original fetch to avoid cross-test interference
    if (originalFetch) globalThis.fetch = originalFetch;
  });

  // helper to render the modal with required props; tests call this to mount the component
  function renderModal(
    props?: Partial<React.ComponentProps<typeof RewardClaimModal>>,
  ) {
    return render(
      <MantineProvider>
        <RewardClaimModal
          opened
          onCloseAction={onClose}
          userId={userId}
          onSuccessAction={onSuccess}
          {...props}
        />
      </MantineProvider>,
    );
  }

  it("submits valid mobile and calls API, onSuccess and onClose on success", async () => {
    // mock successful POST response from reward claim endpoint
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, claim: { id: "c1" } }),
      status: 200,
    } as unknown as Response);

    renderModal();

    // enter a valid mobile number (format expected by the component)
    const textbox = screen.getByRole("textbox");
    await userEvent.type(textbox, "09123456789");

    // submit the form: the component renders a single submit button
    const submitBtn = document.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    await userEvent.click(submitBtn);

    // assert the POST call was made to the correct endpoint with expected payload
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith(
        API_ENDPOINTS.rewards.claim,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            userId,
            paymentMethod: "GCASH",
            accountDetails: "09123456789",
          }),
        }),
      ),
    );

    // expect component callbacks and notification to be invoked on success
    await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalled();
  });

  it("handles 409 response by calling onSuccess and onClose", async () => {
    // simulate server returning 409 conflict (e.g. claim already pending)
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "already pending" }),
    } as unknown as Response);

    renderModal();

    // enter mobile and submit
    await userEvent.type(screen.getByRole("textbox"), "09123456789");
    await userEvent.click(
      document.querySelector('button[type="submit"]') as HTMLButtonElement,
    );

    // for 409 the component is expected to show a notification and still call onSuccess/onClose
    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows validation alert for invalid mobile input", async () => {
    renderModal();

    // provide invalid mobile (too short) and submit
    await userEvent.type(screen.getByRole("textbox"), "09123");
    await userEvent.click(
      document.querySelector('button[type="submit"]') as HTMLButtonElement,
    );

    // component should render a client-side validation alert (role="alert")
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
  });
});
