// Summary:
// - Verifies MailroomPackageView loading, error, and normal states
// - Mocks heavy child components (MainContent, Sidebar, Loading, Error) to keep tests focused
// - Asserts handleRefresh triggers a registration fetch and updates displayed src id
// - Mocks fetch for scans usage and registration fetch endpoints
// - Ensures component integrates with MantineProvider and layout wrapper
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MailroomPackageView from "@/components/pages/customer/MailroomPage/MailroomPackageView";
import { MantineProvider } from "@mantine/core";

jest.mock("@/components/Layout/PrivateMainLayout", () => {
  const MockLayout = ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "private-layout" }, children);
  MockLayout.displayName = "PrivateMainLayout";
  return MockLayout;
});

// Minimal placeholders for heavy child components to observe props and interactions
jest.mock(
  "@/components/pages/customer/MailroomPage/components/MailroomMainContent",
  () => {
    const MockMain = (props: {
      src: unknown;
      handleRefresh: () => Promise<void>;
      scanMap?: Record<string, string>;
      scans?: unknown[];
    }) =>
      React.createElement(
        "div",
        { "data-testid": "main-content" },
        React.createElement(
          "span",
          { "data-testid": "src-id" },
          String((props.src as Record<string, unknown>)?.id ?? "no-id"),
        ),
        React.createElement(
          "button",
          {
            type: "button",
            onClick: () => {
              void props.handleRefresh();
            },
          },
          "Refresh",
        ),
      );
    MockMain.displayName = "MailroomMainContent";
    return MockMain;
  },
);

jest.mock(
  "@/components/pages/customer/MailroomPage/components/MailroomSidebar",
  () => {
    const MockSidebar = (props: { fullNameValue?: string | null }) =>
      React.createElement(
        "aside",
        { "data-testid": "sidebar" },
        props.fullNameValue ?? "no-name",
      );
    MockSidebar.displayName = "MailroomSidebar";
    return MockSidebar;
  },
);

jest.mock(
  "@/components/pages/customer/MailroomPage/components/MailroomLoading",
  () => {
    const MockLoading = () =>
      React.createElement("div", { "data-testid": "loading" }, "loading");
    MockLoading.displayName = "MailroomLoading";
    return MockLoading;
  },
);

jest.mock(
  "@/components/pages/customer/MailroomPage/components/MailroomError",
  () => {
    const MockError = (props: { error?: unknown }) =>
      React.createElement(
        "div",
        { "data-testid": "error" },
        String(props.error ?? "error"),
      );
    MockError.displayName = "MailroomError";
    return MockError;
  },
);

// simple fetch capture
let fetchCalls: { url: string; init?: RequestInit }[] = [];
const originalFetch = global.fetch;

beforeEach(() => {
  fetchCalls = [];
  global.fetch = jest.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      fetchCalls.push({ url, init });

      const makeResponse = (body: unknown, ok = true, status = 200) =>
        ({
          ok,
          status,
          json: async () => body,
          text: async () =>
            typeof body === "string" ? body : JSON.stringify(body),
          clone: () => ({
            text: async () =>
              typeof body === "string" ? body : JSON.stringify(body),
          }),
        }) as unknown as Response;

      // scans usage check
      if (url.includes("/api/user/scans")) {
        return makeResponse({
          usage: { used_mb: 50, limit_mb: 100, percentage: 50 },
          scans: [],
        });
      }

      // registration fetch used by handleRefresh -> return updated payload
      if (url.includes("/api/mailroom/registrations/")) {
        const parts = url.split("/");
        const id = parts[parts.length - 1] ?? "reg-unknown";
        return makeResponse({
          data: { id: `fresh-${id}`, users_table: [], mailroom_plan_table: [] },
        });
      }

      return makeResponse({}, false, 404);
    },
  ) as unknown as typeof fetch;
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

const sampleItem = {
  id: "reg-1",
  // mailroom_plan_table is expected to be an object (PlanObj) with string keys
  mailroom_plan_table: {
    mailroom_plan_can_digitize: true,
    mailroom_plan_name: "Basic",
  },
  lockers: [{ id: "L1", locker_code: "L-1" }],
  packages: [],
};

describe("MailroomPackageView (user)", () => {
  it("renders loading state", () => {
    render(
      <MantineProvider>
        <MailroomPackageView item={null} loading error={null} />
      </MantineProvider>,
    );
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders error state", () => {
    render(
      <MantineProvider>
        <MailroomPackageView item={null} loading={false} error="fail" />
      </MantineProvider>,
    );
    expect(screen.getByTestId("error")).toHaveTextContent("fail");
  });

  it("renders main content and performs handleRefresh which fetches registration", async () => {
    render(
      <MantineProvider>
        <MailroomPackageView
          item={sampleItem}
          loading={false}
          error={null}
          onRefreshAction={async () => {}}
        />
      </MantineProvider>,
    );

    // initial src id rendered from mocked MailroomMainContent
    expect(await screen.findByTestId("src-id")).toHaveTextContent("reg-1");

    // click Refresh button inside mocked main content which calls handleRefresh
    const btn = screen.getByRole("button", { name: "Refresh" });
    await userEvent.click(btn);

    // wait for registration fetch to be called and for component to update src id
    await waitFor(() => {
      expect(
        fetchCalls.some((c) => c.url.includes("/api/mailroom/registrations/")),
      ).toBe(true);
    });

    // after refresh, mocked registration returns id prefixed with fresh- -> main content should update
    await waitFor(() => {
      expect(screen.getByTestId("src-id")).toHaveTextContent("fresh-reg-1");
    });
  });
});
