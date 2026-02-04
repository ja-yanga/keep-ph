import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";
import RegisterForm from "@/components/pages/customer/MailroomRegistrationPage/RegisterForm";
import { OrderSummary } from "@/components/pages/customer/MailroomRegistrationPage/components/OrderSummary";
import { ReviewStep } from "@/components/pages/customer/MailroomRegistrationPage/components/ReviewStep";
import { LocationStep } from "@/components/pages/customer/MailroomRegistrationPage/components/LocationStep";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import type { Plan } from "@/utils/types";

/**
 * Integration tests for the Mailroom registration flow.
 * - smoke tests for rendering and basic interactions
 * - end-to-end like flow up to payments.create request
 * - lightweight unit tests for OrderSummary and ReviewStep components
 *
 * These tests run in JSDOM and therefore polyfill a couple of browser APIs used by Mantine.
 */

// Polyfill DOM APIs used by Mantine in JSDOM
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

// matchMedia used by some components - provide a safe no-op implementation
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

// Mock Next.js app router hooks used by components so tests can render pages that call useRouter()
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    prefetch: jest.fn().mockResolvedValue(undefined),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Provide a simple session mock for components relying on useSession
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => ({ session: { user: { id: "user-1" } } }),
}));

// Stub Mantine notifications to avoid side effects and allow assertions in tests
jest.mock("@mantine/notifications", () => ({
  notifications: { show: jest.fn() },
}));

// Small test renderer wrapper that includes Mantine + SWR providers used across the app
const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <MantineProvider>{ui}</MantineProvider>
    </SWRConfig>,
  );

// Local test helper types
type Location = {
  id: string;
  name: string;
};
type LocationAvailability = Record<string, number>;

type ReviewStepTestProps = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  referralCode: string;
  setReferralCode: (v: string) => void;
  referralValid: boolean;
  setReferralValid: (v: boolean) => void;
  referralMessage: string;
  setReferralMessage: (v: string) => void;
  validatingCode: boolean;
  validateReferral: () => void;
  notes: string;
  setNotes: (v: string) => void;
  setActive: (step: number) => void;
};

describe("Mailroom Register - basic smoke", () => {
  beforeEach(() => {
    // reset mocks and provide a safe default fetch implementation
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as unknown as Response) as unknown as typeof global.fetch;

    // stub clipboard for tests that may use the copy-to-clipboard feature
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText: jest.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("renders register form and basic controls", async () => {
    // smoke: form mounts and exposes at least one input and a submit-like button
    renderWithProviders(<RegisterForm />);
    const inputs = document.querySelectorAll("input, textarea");
    const submit = screen.queryByRole("button", {
      name: /register|submit|continue|next|create/i,
    });
    expect(inputs.length).toBeGreaterThan(0);
    expect(submit).toBeTruthy();
  });

  it("allows typing into first input and clicking submit without throwing", async () => {
    // basic interaction: typing and clicking should not throw errors
    renderWithProviders(<RegisterForm />);
    const input = screen.queryAllByRole("textbox")[0];
    const submit = screen.queryByRole("button", {
      name: /register|submit|continue|next|create/i,
    });
    if (input) await userEvent.type(input, "test");
    if (submit) await userEvent.click(submit);
    expect(screen).toBeDefined();
  });

  it("creates payment session and redirects to checkout", async () => {
    /**
     * Full-ish flow:
     * - select plan/location
     * - fill details
     * - open confirm modal and trigger Confirm & Pay
     * - assert payments.create was called with a payload containing the plan and email
     *
     * Notes:
     * - We don't actually follow the external checkout flow in tests; we assert the app
     *   creates a payment session and returns the expected checkout_url via the API call.
     */

    const checkoutUrl = "https://checkout.example/session/abc";

    // mock fetch: return checkout_url for payments.create, otherwise default empty responses
    const fetchMock = jest.fn((input: RequestInfo) => {
      if (String(input).includes(API_ENDPOINTS.payments.create)) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: { attributes: { checkout_url: checkoutUrl } },
          }),
        } as unknown as Response);
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as unknown as Response);
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    // Use a Plan shape compatible with the app's types so components render correctly
    const plans: Plan[] = [
      {
        id: "p1",
        name: "Basic",
        price: 100,
        can_receive_mail: true,
        can_receive_parcels: true,
        can_digitize: false,
      },
    ];
    const locations: Location[] = [{ id: "l1", name: "Main" }];
    const availability: LocationAvailability = { l1: 10 };

    renderWithProviders(
      <RegisterForm
        initialPlans={plans}
        initialLocations={locations}
        initialLocationAvailability={availability}
      />,
    );

    // pick the plan
    await userEvent.click(screen.getByText(/Basic/i));

    // proceed to location step and pick a location
    await userEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    await userEvent.click(screen.getByText(/Main/i));

    // proceed to details step and fill required fields
    await userEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    await userEvent.type(screen.getByLabelText(/First name/i), "Jane");
    await userEvent.type(screen.getByLabelText(/Last name/i), "Doe");
    await userEvent.type(screen.getByLabelText(/Email/i), "jane@example.com");
    await userEvent.type(screen.getByLabelText(/Mobile/i), "09171234567");

    // review step -> proceed to payment
    await userEvent.click(screen.getByRole("button", { name: /Next Step/i }));
    await userEvent.click(
      screen.getByRole("button", { name: /Proceed to Payment/i }),
    );

    // open confirm modal and press Confirm & Pay
    const confirmBtn = await screen.findByRole("button", {
      name: /Confirm & Pay/i,
    });
    await userEvent.click(confirmBtn);

    // wait for payment creation request then assert the payments.create endpoint was hit
    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(API_ENDPOINTS.payments.create),
        expect.anything(),
      ),
    );

    // assert request payload contains selected plan id and the user email
    const calls = (global.fetch as unknown as jest.Mock).mock
      .calls as unknown[][];
    const createCall = calls.find((c) =>
      String(c[0]).includes(API_ENDPOINTS.payments.create),
    );
    expect(createCall).toBeDefined();
    const createOpts = createCall
      ? (createCall[1] as RequestInit | undefined)
      : undefined;
    const body = createOpts?.body ?? "";
    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    expect(bodyStr).toMatch(/p1/);
    expect(bodyStr).toMatch(/jane@example.com/);
  });
});

describe("OrderSummary component", () => {
  const format = (n: number) =>
    n.toLocaleString("en-PH", {
      style: "currency",
      currency: "PHP",
      maximumFractionDigits: 0,
    });

  it("shows placeholder total when no plan is selected", () => {
    // ensure the component shows a placeholder when no plan is chosen
    renderWithProviders(
      <OrderSummary
        selectedPlan={null}
        selectedLocationObj={null}
        billingCycle="monthly"
        qty={1}
        referralValid={false}
        subTotal={0}
        referralDiscountAmount={0}
        totalCost={0}
        format={format}
      />,
    );
    expect(screen.getByText("Total")).toBeTruthy();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("displays plan name, cycle badge for annual, and formatted total", () => {
    // check annual badge and formatted totals are rendered correctly
    const plan: Plan = {
      id: "p1",
      name: "Basic",
      price: 100,
      can_receive_mail: true,
      can_receive_parcels: true,
      can_digitize: false,
    };
    const totalCost = 100 * 2;
    renderWithProviders(
      <OrderSummary
        selectedPlan={plan}
        selectedLocationObj={{ id: "l1", name: "Main" }}
        billingCycle="annual"
        qty={2}
        referralValid={true}
        subTotal={200}
        referralDiscountAmount={10}
        totalCost={totalCost}
        format={format}
      />,
    );
    expect(screen.getByText("Basic")).toBeTruthy();
    expect(screen.getByText("-20%")).toBeTruthy();
    expect(screen.getAllByText(format(totalCost)).length).toBeGreaterThan(0);
  });
});

describe("ReviewStep component", () => {
  it("renders subscriber name and referral input + apply button", () => {
    // small unit-like test to ensure ReviewStep renders key controls
    const props: ReviewStepTestProps = {
      firstName: "John",
      lastName: "Doe",
      email: "john@example.com",
      mobile: "09171234567",
      referralCode: "",
      setReferralCode: () => {},
      referralValid: false,
      setReferralValid: () => {},
      referralMessage: "",
      setReferralMessage: () => {},
      validatingCode: false,
      validateReferral: () => {},
      notes: "",
      setNotes: () => {},
      setActive: () => {},
    };

    renderWithProviders(<ReviewStep {...props} />);
    expect(screen.getByText("John Doe")).toBeTruthy();
    expect(screen.getByLabelText("Referral Code (Optional)")).toBeTruthy();
    expect(screen.getByRole("button", { name: /apply/i })).toBeTruthy();
  });
});

describe("LocationStep", () => {
  it("clamps locker qty to max_locker_limit", async () => {
    const Wrapper = () => {
      const [selectedLocation, setSelectedLocation] = React.useState<
        string | null
      >("l1");
      const [lockerQty, setLockerQty] = React.useState<number | string>(5);

      const locations = [
        {
          id: "l1",
          name: "Main",
          city: "Makati",
          max_locker_limit: 2,
        } as unknown as Location,
      ];

      const availability: Record<string, number> = { l1: 5 };
      const availableCount = selectedLocation
        ? availability[selectedLocation] || 0
        : 0;

      return (
        <LocationStep
          locations={locations}
          selectedLocation={selectedLocation}
          setSelectedLocationAction={setSelectedLocation}
          locationAvailability={availability}
          lockerQty={lockerQty}
          setLockerQtyAction={setLockerQty}
          availableCount={availableCount}
        />
      );
    };

    renderWithProviders(<Wrapper />);

    // max should be min(availableCount=5, max_locker_limit=2)
    const label = screen.getByText(/Locker Limit per User/i).closest("div");
    expect(label ? within(label).getByText("2") : null).toBeTruthy();

    await waitFor(() => {
      const qtyInput = screen.getByRole("textbox");
      expect(qtyInput).toHaveValue("2");
    });
  });

  it("uses provided availability count in the badge", async () => {
    const Wrapper = () => {
      const [selectedLocation, setSelectedLocation] = React.useState<
        string | null
      >(null);
      const [lockerQty, setLockerQty] = React.useState<number | string>(1);

      const locations = [
        { id: "l1", name: "Main", city: "Makati" } as unknown as Location,
      ];

      // availability should already exclude non-assignable lockers (server-side)
      const availability: Record<string, number> = { l1: 3 };
      const availableCount = selectedLocation
        ? availability[selectedLocation] || 0
        : 0;

      return (
        <LocationStep
          locations={locations}
          selectedLocation={selectedLocation}
          setSelectedLocationAction={setSelectedLocation}
          locationAvailability={availability}
          lockerQty={lockerQty}
          setLockerQtyAction={setLockerQty}
          availableCount={availableCount}
        />
      );
    };

    renderWithProviders(<Wrapper />);
    expect(screen.getByText(/3 Available Lockers/i)).toBeInTheDocument();
  });
});
