import "@testing-library/jest-dom";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import PrivateNavigationHeader from "@/components/Layout/PrivateNavigationHeader";

const pushMock = jest.fn();
const usePathnameMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => usePathnameMock(),
}));

jest.mock("@/lib/route-progress", () => ({
  startRouteProgress: jest.fn(),
}));

jest.mock("@/components/Notifications", () => ({
  __esModule: true,
  default: () =>
    React.createElement(
      "button",
      { "aria-label": "Notifications", type: "button" },
      "Notifications",
    ),
}));

const authSignOutMock = jest.fn().mockResolvedValue(undefined);
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: authSignOutMock },
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

// Mutable so we can switch role per describe block
const mockSessionState = {
  session: {
    user: { id: "user-1", email: "user@example.com" },
    role: "user" as "user" | "admin",
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

describe("PrivateNavigationHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/dashboard");
    mockSessionState.session.role = "user";
    (global.fetch as unknown) = jest.fn().mockResolvedValue({ ok: true });
  });

  describe("admin role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "admin";
      usePathnameMock.mockReturnValue("/admin/dashboard");
    });

    it("renders Keep PH, account link, and logout", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );

      expect(screen.getAllByText(/Keep PH/i).length).toBeGreaterThan(0);
      expect(
        screen.getByRole("link", { name: /view account settings/i }),
      ).toHaveAttribute("href", "/account");
      expect(
        screen.getByRole("button", { name: /sign out of your account/i }),
      ).toBeInTheDocument();
    });

    it("renders burger with toggle sidebar aria-label for admin", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );
      expect(
        screen.getByRole("button", { name: /toggle sidebar/i }),
      ).toBeInTheDocument();
    });

    it("does not show Notifications for admin", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );
      expect(screen.queryByLabelText(/notifications/i)).toBeNull();
    });

    it("calls toggle when admin burger is clicked", async () => {
      const toggleMock = jest.fn();
      render(
        <MantineProvider>
          <PrivateNavigationHeader opened={false} toggle={toggleMock} />
        </MantineProvider>,
      );
      const burger = screen.getByRole("button", { name: /toggle sidebar/i });
      await userEvent.click(burger);
      expect(toggleMock).toHaveBeenCalled();
    });

    it("Keep PH link points to /admin/dashboard for admin", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );
      const homeLinks = screen.getAllByRole("link", {
        name: /Keep PH - Home/i,
      });
      expect(
        homeLinks.some((el) => el.getAttribute("href") === "/admin/dashboard"),
      ).toBe(true);
    });
  });

  describe("user (customer) role", () => {
    beforeEach(() => {
      mockSessionState.session.role = "user";
      usePathnameMock.mockReturnValue("/dashboard");
    });

    it("renders Keep PH, customer nav links, Notifications, account, and logout", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );

      expect(screen.getAllByText(/Keep PH/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/Register Mail Service/i)).toBeInTheDocument();
      expect(screen.getByText(/Referrals/i)).toBeInTheDocument();
      expect(screen.getByText(/Storage/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /view account settings/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign out of your account/i }),
      ).toBeInTheDocument();
    });

    it("customer nav links have correct hrefs", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );

      expect(screen.getByText(/Dashboard/i).closest("a")).toHaveAttribute(
        "href",
        "/dashboard",
      );
      expect(
        screen.getByText(/Register Mail Service/i).closest("a"),
      ).toHaveAttribute("href", "/mailroom/register");
      expect(screen.getByText(/Referrals/i).closest("a")).toHaveAttribute(
        "href",
        "/referrals",
      );
      expect(screen.getByText(/Storage/i).closest("a")).toHaveAttribute(
        "href",
        "/storage",
      );
    });

    it("logout calls signout API, supabase.auth.signOut, and redirects to /signin", async () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );

      const logoutBtn = screen.getByRole("button", {
        name: /sign out of your account/i,
      });
      await userEvent.click(logoutBtn);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/auth/signout",
          expect.objectContaining({ method: "POST" }),
        );
      });
      expect(authSignOutMock).toHaveBeenCalled();
      await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/signin"));
    });

    it("renders burger with toggle navigation aria-label for customer", () => {
      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );
      expect(
        screen.getByRole("button", { name: /toggle navigation/i }),
      ).toBeInTheDocument();
    });
  });

  describe("onboarding path", () => {
    it("hides logo and nav when pathname starts with /onboarding", () => {
      mockSessionState.session.role = "user";
      usePathnameMock.mockReturnValue("/onboarding/step-1");

      render(
        <MantineProvider>
          <PrivateNavigationHeader />
        </MantineProvider>,
      );

      expect(screen.queryAllByText(/Keep PH/i).length).toBe(0);
      expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /view account settings/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /sign out of your account/i }),
      ).toBeInTheDocument();
    });
  });
});
