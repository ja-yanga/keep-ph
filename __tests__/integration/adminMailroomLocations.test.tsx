import React from "react";
import {
  render,
  screen,
  waitFor,
  within,
  cleanup,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MantineProvider } from "@mantine/core";
import { SWRConfig } from "swr";

jest.mock("@mantine/hooks", () => {
  const actual = jest.requireActual("@mantine/hooks");
  return {
    ...actual,
    useMediaQuery: () => false,
  };
});

jest.mock("../../components/common/AdminTable", () => {
  type RecordType = Record<string, unknown>;
  type Column = {
    render?: (r: RecordType) => React.ReactNode;
    accessor?: string;
    title?: string;
  };

  const AdminTable = (props: {
    records?: RecordType[];
    columns?: Column[];
    noRecordsText?: string;
  }) => {
    const { records = [], columns = [], noRecordsText = "No records" } = props;

    const getCellContent = (r: RecordType, c: Column) => {
      if (typeof c.render === "function") return c.render(r);
      if (c.accessor) return r[c.accessor] as React.ReactNode;
      return null;
    };

    return (
      <table role="table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i}>{c.title ?? c.accessor ?? ""}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={Math.max(columns.length, 1)}>{noRecordsText}</td>
            </tr>
          ) : (
            records.map((r: RecordType) => (
              <tr key={String(r.id ?? JSON.stringify(r))}>
                {columns.map((c, i) => (
                  <td key={i}>{getCellContent(r, c)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  };

  return { AdminTable };
});

class ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
Object.defineProperty(global, "ResizeObserver", {
  value: ResizeObserver,
  configurable: true,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
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
});

import MailroomLocations from "@/components/MailroomLocations";

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        shouldRetryOnError: false,
      }}
    >
      <MantineProvider>{ui}</MantineProvider>
    </SWRConfig>,
  );

type Location = {
  id: string;
  name: string;
  code?: string | null;
  region?: string | null;
  city?: string | null;
  barangay?: string | null;
  zip?: string | null;
  total_lockers?: number | null;
  is_hidden?: boolean;
  max_locker_limit?: number | null;
};

let serverData: Location[] = [];

const getFilteredData = (key: string) => {
  try {
    const url = new URL(key, "http://localhost");
    const search = (url.searchParams.get("search") || "").toLowerCase();
    if (!search) return serverData;
    return serverData.filter((l) => l.name.toLowerCase().includes(search));
  } catch {
    return serverData;
  }
};

jest.mock("swr", () => {
  const actual = jest.requireActual("swr");

  const useSWR = (key: string | null) => {
    const getSnapshot = () => {
      if (!key || typeof key !== "string") {
        return { data: [], pagination: { totalCount: 0 } };
      }
      const data = getFilteredData(key);
      return { data, pagination: { totalCount: data.length } };
    };

    const [data, setData] = React.useState(getSnapshot);

    React.useEffect(() => {
      setData(getSnapshot());
    }, [key]);

    const mutate = () => {
      setData(getSnapshot());
      return Promise.resolve();
    };

    return {
      data,
      error: undefined,
      isLoading: false,
      isValidating: false,
      mutate,
    };
  };

  return {
    __esModule: true,
    ...actual,
    default: useSWR,
  };
});

describe("MailroomLocations integration", () => {
  let originalFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    serverData = [];
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (originalFetch) globalThis.fetch = originalFetch;
    cleanup();
  });

  it("renders locations and shows hidden badge", async () => {
    const loc: Location = {
      id: "l1",
      name: "Allen Test Location",
      code: "ATL",
      region: "NCR",
      city: "Makati",
      barangay: "Bel-Air",
      zip: "1227",
      total_lockers: 10,
      is_hidden: true,
      max_locker_limit: 11,
    };
    serverData = [loc];

    renderWithProviders(<MailroomLocations />);

    expect(await screen.findByText(/Allen Test Location/i)).toBeInTheDocument();
    expect(screen.getByText(/Hidden from customers/i)).toBeInTheDocument();
    expect(screen.getByText(/11/i)).toBeInTheDocument();
  });

  it("filters locations via search input", async () => {
    serverData = [
      {
        id: "l1",
        name: "Main Office",
        code: "MKT",
        region: "NCR",
        city: "Makati",
        barangay: "Bel-Air",
        zip: "1227",
        total_lockers: 10,
        is_hidden: false,
        max_locker_limit: 0,
      },
      {
        id: "l2",
        name: "Branch",
        code: "BRN",
        region: "CAL",
        city: "Cebu",
        barangay: "Lahug",
        zip: "6000",
        total_lockers: 5,
        is_hidden: false,
        max_locker_limit: 3,
      },
    ];

    const user = userEvent.setup();
    renderWithProviders(<MailroomLocations />);

    await screen.findByText(/Main Office/i);

    const input = screen.getByPlaceholderText(
      /Search locations by name or code/i,
    ) as HTMLInputElement;

    await user.type(input, "Branch{enter}");
    await waitFor(() => {
      expect(screen.getByText(/Branch/i)).toBeInTheDocument();
    });

    await user.clear(input);
    await user.type(input, "NoMatch{enter}");
    expect(await screen.findByText(/No locations found/i)).toBeInTheDocument();
  });

  it("opens View modal and displays details", async () => {
    serverData = [
      {
        id: "l1",
        name: "Main Office",
        code: "MKT",
        region: "NCR",
        city: "Makati",
        barangay: "Bel-Air",
        zip: "1227",
        total_lockers: 10,
        is_hidden: true,
        max_locker_limit: 11,
      },
    ];

    const user = userEvent.setup();
    renderWithProviders(<MailroomLocations />);

    await screen.findByText(/Main Office/i);

    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    const actionButtons = within(dataRow).getAllByRole("button");
    await user.click(actionButtons[0]);

    const modal = await screen.findByRole("dialog");
    expect(within(modal).getByText(/Location Details/i)).toBeInTheDocument();
    expect(within(modal).getByText(/Hidden/i)).toBeInTheDocument();
    expect(
      within(modal).getByText(/Max Lockers Per User/i),
    ).toBeInTheDocument();
    expect(within(modal).getByText(/11/i)).toBeInTheDocument();
  });

  it("creates and edits a location", async () => {
    const base: Location = {
      id: "l1",
      name: "Main Office",
      code: "MKT",
      region: "NCR",
      city: "Makati",
      barangay: "Bel-Air",
      zip: "1227",
      total_lockers: 10,
      is_hidden: false,
      max_locker_limit: 0,
    };

    serverData = [base];

    global.fetch = jest.fn((url: RequestInfo, opts?: RequestInit) => {
      const method = opts?.method ? String(opts.method).toUpperCase() : "GET";

      if (method === "POST") {
        serverData = [
          ...serverData,
          {
            ...base,
            id: "l2",
            name: "Created",
            is_hidden: true,
            max_locker_limit: 5,
          },
        ];
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: "Location created",
            data: serverData[serverData.length - 1],
          }),
        } as unknown as Response);
      }

      if (method === "PATCH") {
        serverData = serverData.map((l) =>
          l.id === "l1"
            ? { ...l, name: "Updated", is_hidden: true, max_locker_limit: 7 }
            : l,
        );
        return Promise.resolve({
          ok: true,
          json: async () => ({
            message: "Location updated",
            data: serverData[0],
          }),
        } as unknown as Response);
      }

      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: serverData,
          pagination: { totalCount: serverData.length },
        }),
      } as unknown as Response);
    }) as unknown as typeof global.fetch;

    const user = userEvent.setup();
    renderWithProviders(<MailroomLocations />);

    await screen.findByText(/Main Office/i);

    // button has aria-label "Create new mailroom location"
    await user.click(
      screen.getByRole("button", { name: /Create new mailroom location/i }),
    );

    const createModal = await screen.findByRole("dialog");
    await user.type(within(createModal).getByLabelText(/Name/i), "Created");
    await user.type(
      within(createModal).getByLabelText(/Location Code/i),
      "CRT",
    );
    await user.type(within(createModal).getByLabelText(/Region/i), "NCR");
    await user.type(within(createModal).getByLabelText(/City/i), "Makati");
    await user.type(
      within(createModal).getByLabelText(/Barangay/i),
      "Created Barangay",
    );
    await user.type(within(createModal).getByLabelText(/Zip/i), "0000");

    const lockersInput = within(createModal).getByLabelText(/Total Lockers/i);
    await user.clear(lockersInput);
    await user.type(lockersInput, "2");

    const maxPerUserInput =
      within(createModal).getByLabelText(/Max Lockers Per User/i);
    await user.clear(maxPerUserInput);
    await user.type(maxPerUserInput, "5");

    await user.click(
      within(createModal).getByLabelText(/Hide from customers/i),
    );
    await user.click(
      within(createModal).getByRole("button", { name: /Create/i }),
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Created/i).length).toBeGreaterThanOrEqual(1);
    });

    const rows = screen.getAllByRole("row");
    const dataRow = rows[1];
    const buttons = within(dataRow).getAllByRole("button");
    await user.click(buttons[1]);

    const editModal = await screen.findByRole("dialog");
    await user.click(within(editModal).getByRole("button", { name: /Save/i }));

    await waitFor(() => {
      expect(screen.getAllByText(/Updated/i).length).toBeGreaterThanOrEqual(1);
    });
  }, 20000);

  it("opens filters popover and applies with no changes", async () => {
    serverData = [
      {
        id: "l1",
        name: "Main Office",
        code: "MKT",
        region: "NCR",
        city: "Makati",
        barangay: "Bel-Air",
        zip: "1227",
        total_lockers: 10,
        is_hidden: false,
        max_locker_limit: 0,
      },
    ];

    const user = userEvent.setup();
    renderWithProviders(<MailroomLocations />);

    await screen.findByText(/Main Office/i);

    // open filters (aria-label "Open filters")
    await user.click(screen.getByRole("button", { name: /Open filters/i }));
    // assert filter popover opened by checking for the filter form / input
    const pop = await screen.findByRole("form", { name: /Location filters/i });
    expect(
      within(pop).getByLabelText(/Filter by region/i, {
        selector: "input",
      }),
    ).toBeInTheDocument();
    // close popover by clicking target again
    await user.click(screen.getByRole("button", { name: /Open filters/i }));
    expect(screen.getByText(/Main Office/i)).toBeInTheDocument();
  });
});
