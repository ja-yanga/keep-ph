import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppShell, MantineProvider } from "@mantine/core";
import PrivateAdminSidebar from "@/components/Layout/PrivateAdminSidebar";

const usePathnameMock = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
}));

jest.mock("@/lib/route-progress", () => ({
  startRouteProgress: jest.fn(),
}));

const mockSessionState = {
  session: {
    user: { id: "admin-1", email: "admin@example.com" },
    role: "admin" as "admin" | "approver" | "owner" | "user",
  },
  refresh: jest.fn(),
};
jest.mock("@/components/SessionProvider", () => ({
  useSession: () => mockSessionState,
}));

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

function renderSidebar(props: { opened?: boolean; onClose?: () => void } = {}) {
  const onClose = props.onClose ?? jest.fn();
  return render(
    <MantineProvider>
      <AppShell>
        <PrivateAdminSidebar opened={props.opened ?? false} onClose={onClose} />
      </AppShell>
    </MantineProvider>,
  );
}

describe("PrivateAdminSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/admin/dashboard");
    mockSessionState.session.role = "admin";
  });

  describe("admin role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "admin";
      usePathnameMock.mockReturnValue("/admin/dashboard");
    });

    it("renders sidebar with Keep PH and admin nav items", () => {
      renderSidebar();

      expect(screen.getAllByText(/Keep PH/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/KYC/i)).toBeInTheDocument();
      expect(screen.getByText(/Locations/i)).toBeInTheDocument();
      expect(screen.getByText(/Lockers/i)).toBeInTheDocument();
      expect(screen.getByText(/Mailrooms/i)).toBeInTheDocument();
      expect(screen.getByText(/Packages/i)).toBeInTheDocument();
      expect(screen.getByText(/Plans/i)).toBeInTheDocument();
      expect(screen.getByText(/Rewards/i)).toBeInTheDocument();
      expect(screen.getByText(/Stats/i)).toBeInTheDocument();
      expect(screen.getByText(/Users/i)).toBeInTheDocument();
      expect(screen.getByText(/Transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/IP Whitelist/i)).toBeInTheDocument();
      expect(screen.getByText(/Activity Logs/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
    });

    it("admin nav links have correct hrefs", () => {
      renderSidebar();

      expect(screen.getByText(/Dashboard/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/dashboard",
      );
      expect(screen.getByText(/KYC/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/kyc",
      );
      expect(screen.getByText(/Locations/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/locations",
      );
      expect(screen.getByText(/Lockers/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/lockers",
      );
      expect(screen.getByText(/Mailrooms/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/mailrooms",
      );
      expect(screen.getByText(/Packages/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/packages",
      );
      expect(screen.getByText(/Plans/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/plans",
      );
      expect(screen.getByText(/Rewards/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/rewards",
      );
      expect(screen.getByText(/Stats/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/stats",
      );
      expect(screen.getByText(/Users/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/users",
      );
      expect(screen.getByText(/Transactions/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/transactions",
      );
      expect(screen.getByText(/IP Whitelist/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/ip-whitelist",
      );
      expect(screen.getByText(/Activity Logs/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/activity-logs",
      );
      expect(screen.getByText(/Error Logs/i).closest("a")).toHaveAttribute(
        "href",
        "/admin/error-logs",
      );
    });

    it("Keep PH home link points to /admin/dashboard for admin", () => {
      renderSidebar();
      const homeLinks = screen.getAllByRole("link", {
        name: /Keep PH - Home/i,
      });
      expect(
        homeLinks.some((el) => el.getAttribute("href") === "/admin/dashboard"),
      ).toBe(true);
    });

    it("calls onClose when a nav link is clicked", async () => {
      const onCloseMock = jest.fn();
      renderSidebar({ onClose: onCloseMock });

      const kycLink = screen.getByText(/KYC/i).closest("a");
      expect(kycLink).toBeInTheDocument();
      await userEvent.click(kycLink!);
      expect(onCloseMock).toHaveBeenCalled();
    });

    it("renders desktop sidebar with id admin-sidebar", () => {
      renderSidebar();
      expect(document.getElementById("admin-sidebar")).toBeInTheDocument();
    });
  });

  describe("approver role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "approver";
      usePathnameMock.mockReturnValue("/admin/approver-dashboard");
    });

    it("renders sidebar with approver nav items only", () => {
      renderSidebar();

      expect(screen.getAllByText(/Keep PH/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/KYC/i)).toBeInTheDocument();
      expect(screen.getByText(/Packages/i)).toBeInTheDocument();
      expect(screen.getByText(/Rewards/i)).toBeInTheDocument();
      // Admin-only items should not be present for approver
      expect(screen.queryByText(/Locations/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Lockers/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Stats/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Users/i)).not.toBeInTheDocument();
    });

    it("approver dashboard link points to /admin/approver-dashboard", () => {
      renderSidebar();
      const dashboardLinks = screen.getAllByText(/Dashboard/i);
      const dashboardAnchor = dashboardLinks[0].closest("a");
      expect(dashboardAnchor).toHaveAttribute(
        "href",
        "/admin/approver-dashboard",
      );
    });
  });

  describe("owner role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "owner";
      usePathnameMock.mockReturnValue("/admin/dashboard");
    });

    it("renders sidebar with full admin nav items", () => {
      renderSidebar();

      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/KYC/i)).toBeInTheDocument();
      expect(screen.getByText(/Error Logs/i)).toBeInTheDocument();
      expect(
        screen
          .getAllByRole("link", { name: /Keep PH - Home/i })
          .some((el) => el.getAttribute("href") === "/admin/dashboard"),
      ).toBe(true);
    });
  });

  describe("user (customer) role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "user";
    });

    it("returns null and renders nothing for customer", () => {
      renderSidebar();

      expect(screen.queryByText(/Keep PH/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
      expect(document.getElementById("admin-sidebar")).not.toBeInTheDocument();
    });
  });

  describe("onboarding path", () => {
    beforeEach(() => {
      mockSessionState.session.role = "admin";
      usePathnameMock.mockReturnValue("/onboarding/step-1");
    });

    it("hides nav links when pathname starts with /onboarding", () => {
      renderSidebar();

      expect(screen.getAllByText(/Keep PH/i).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/KYC/i)).not.toBeInTheDocument();
    });
  });
});
