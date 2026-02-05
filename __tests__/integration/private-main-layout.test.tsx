import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MantineProvider } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const usePathnameMock = jest.fn();

jest.mock("next/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ push: jest.fn() }),
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

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signOut: jest.fn().mockResolvedValue(undefined) },
    from: () => ({
      select: jest.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
}));

const mockSessionState = {
  session: {
    user: { id: "user-1", email: "user@example.com" },
    role: "user" as "admin" | "approver" | "owner" | "user",
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

function renderLayout(children: React.ReactNode = "Page content") {
  return render(
    <MantineProvider>
      <PrivateMainLayout>{children}</PrivateMainLayout>
    </MantineProvider>,
  );
}

describe("PrivateMainLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    usePathnameMock.mockReturnValue("/dashboard");
    mockSessionState.session.role = "user";
  });

  it("renders children", () => {
    renderLayout(<span>Main content</span>);
    expect(screen.getByText("Main content")).toBeInTheDocument();
  });

  it("renders footer with Keep PH", () => {
    renderLayout();
    const footer = screen.getByRole("contentinfo");
    expect(footer).toBeInTheDocument();
    expect(footer).toHaveTextContent(/Keep PH/i);
  });

  describe("header visibility (showLinks)", () => {
    it("shows navigation header when pathname is not /onboarding", () => {
      usePathnameMock.mockReturnValue("/dashboard");
      renderLayout();
      expect(screen.getByRole("banner")).toBeInTheDocument();
    });

    it("hides navigation header on onboarding path", () => {
      usePathnameMock.mockReturnValue("/onboarding/step-1");
      renderLayout();
      expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    });
  });

  describe("sidebar visibility by role", () => {
    it("shows admin sidebar for admin role", () => {
      mockSessionState.session.role = "admin";
      usePathnameMock.mockReturnValue("/admin/dashboard");
      renderLayout();
      expect(document.getElementById("admin-sidebar")).toBeInTheDocument();
    });

    it("shows admin sidebar for approver role", () => {
      mockSessionState.session.role = "approver";
      usePathnameMock.mockReturnValue("/admin/approver-dashboard");
      renderLayout();
      expect(document.getElementById("admin-sidebar")).toBeInTheDocument();
    });

    it("shows admin sidebar for owner role", () => {
      mockSessionState.session.role = "owner";
      usePathnameMock.mockReturnValue("/admin/dashboard");
      renderLayout();
      expect(document.getElementById("admin-sidebar")).toBeInTheDocument();
    });

    it("does not show admin sidebar for user (customer) role", () => {
      mockSessionState.session.role = "user";
      usePathnameMock.mockReturnValue("/dashboard");
      renderLayout();
      expect(document.getElementById("admin-sidebar")).not.toBeInTheDocument();
    });
  });

  it("renders within AppShell structure", () => {
    const { container } = renderLayout("Child");
    const main = container.querySelector(".mantine-AppShell-main");
    expect(main).toBeInTheDocument();
    expect(screen.getByText("Child")).toBeInTheDocument();
  });
});
