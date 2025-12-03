import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  TextInput,
  Tooltip,
  ActionIcon,
  ScrollArea,
  ThemeIcon,
  SimpleGrid,
  RingProgress,
  Center,
  Popover,
  Select,
} from "@mantine/core";
import {
  IconRefresh,
  IconEye,
  IconSearch,
  IconFilter,
  IconDownload,
  IconInbox,
  IconSortAscending,
  IconSortDescending,
  IconBox,
  IconTruckDelivery,
  IconAlertCircle,
  IconChevronRight, // Added Chevron
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

type RawRow = any;
type Row = {
  id: string;
  mailroom_code: string | null;
  name: string;
  email: string | null;
  plan: string | null;
  location: string | null;
  created_at?: string | null;
  expiry_at?: string | null;
  mailroom_status?: string | null;
  // NEW: Add stats to the Row type
  stats: {
    stored: number;
    pending: number;
    released: number;
  };
  raw?: RawRow;
};

const addMonths = (iso?: string | null, months = 0) => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

// 1. Update the mapping function to calculate stats per row
const mapDataToRows = (data: RawRow[]): Row[] => {
  return data.map((r: any) => {
    const planName = r.mailroom_plans?.name ?? r.plan_name ?? null;
    const userName = r.full_name ?? null;
    const locationName = r.mailroom_locations?.name ?? r.location_name ?? null;
    const created = r.created_at ?? null;
    const expiry = r.months ? addMonths(created, Number(r.months)) : null;
    const now = new Date();
    let computedStatus: string | null = null;

    if (expiry) {
      const ed = new Date(expiry);
      const diff = ed.getTime() - now.getTime();
      if (diff <= 0) computedStatus = "INACTIVE";
      else if (diff <= 7 * 24 * 60 * 60 * 1000) computedStatus = "EXPIRING";
      else computedStatus = "ACTIVE";
    } else {
      computedStatus = r.status ?? r.mailroom_status ?? "ACTIVE";
    }
    const mailroom_status = computedStatus;

    // NEW: Calculate stats for this specific registration
    let stored = 0;
    let pending = 0;
    let released = 0;

    if (Array.isArray(r.packages)) {
      const uniqueIds = new Set();
      r.packages.forEach((p: any) => {
        if (uniqueIds.has(p.id)) return;
        uniqueIds.add(p.id);
        if (p.status === "STORED") stored++;
        else if (p.status === "RELEASED") released++;
        else if (p.status?.includes("REQUEST")) pending++;
      });
    }

    const name =
      userName ??
      planName ??
      r.package_name ??
      r.title ??
      `${locationName ?? "Mailroom Service"} #${r.id?.slice(0, 8)}`;

    return {
      id: r.id,
      mailroom_code: r.mailroom_code ?? null,
      name,
      email: r.email ?? null,
      plan: planName,
      location: locationName,
      created_at: created,
      expiry_at: expiry,
      mailroom_status,
      // NEW: Attach stats
      stats: { stored, pending, released },
      raw: r,
    };
  });
};

export default function UserDashboard() {
  const { session } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    plan: null as string | null,
    location: null as string | null,
    mailroomStatus: null as string | null,
  });

  const filterOptions = useMemo(() => {
    if (!rows) return { plans: [], locations: [] };
    const plans = Array.from(
      new Set(rows.map((r) => r.plan).filter(Boolean))
    ) as string[];
    const locations = Array.from(
      new Set(rows.map((r) => r.location).filter(Boolean))
    ) as string[];
    return { plans, locations };
  }, [rows]);

  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      mailroom_code: true,
      name: true,
      // NEW: Add activity column, enabled by default
      activity: true,
      email: true,
      plan: true,
      location: true,
      created_at: true,
      expiry_at: true,
      mailroom_status: true,
      view: true,
    }
  );

  // sorting
  const [sortBy, setSortBy] = useState<string | null>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // 2. Create a reusable fetch function
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/mailroom/registrations", {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json?.error || "Failed to load registrations");
        setRows([]);
        return;
      }
      const json = await res.json();
      const data: RawRow[] = Array.isArray(json?.data ?? json)
        ? json.data ?? json
        : [];

      // Use the helper function
      const mapped = mapDataToRows(data);
      setRows(mapped);
    } catch (err: any) {
      console.error("load err", err);
      setError("Failed to load registrations.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id, fetchData]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          const found =
            String(r.name).toLowerCase().includes(q) ||
            String(r.email ?? "")
              .toLowerCase()
              .includes(q) ||
            String(r.mailroom_code ?? "")
              .toLowerCase()
              .includes(q) ||
            String(r.plan ?? "")
              .toLowerCase()
              .includes(q) ||
            String(r.location ?? "")
              .toLowerCase()
              .includes(q);
          if (!found) return false;
        }
        if (filters.plan && r.plan !== filters.plan) return false;
        if (filters.location && r.location !== filters.location) return false;
        if (
          filters.mailroomStatus &&
          r.mailroom_status !== filters.mailroomStatus
        )
          return false;
        return true;
      })
      .sort((a, b) => {
        if (!sortBy) return 0;
        const va = (a as any)[sortBy];
        const vb = (b as any)[sortBy];
        if (va == null && vb == null) return 0;
        if (va == null) return sortDir === "asc" ? -1 : 1;
        if (vb == null) return sortDir === "asc" ? 1 : -1;
        if (sortBy === "created_at" || sortBy === "expiry_at") {
          const da = new Date(va).getTime();
          const db = new Date(vb).getTime();
          return sortDir === "asc" ? da - db : db - da;
        }
        const sa = String(va).toLowerCase();
        const sb = String(vb).toLowerCase();
        return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
  }, [rows, search, filters, sortBy, sortDir]);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const refresh = () => {
    setRows(null);
    setError(null);
    fetchData();
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? (
      <IconSortAscending size={14} />
    ) : (
      <IconSortDescending size={14} />
    );
  };

  const ThSortable = ({ col, label }: { col: string; label: string }) => (
    <Table.Th
      style={{
        cursor: "pointer",
        whiteSpace: "nowrap",
        textTransform: "uppercase", // Uppercase headers
        fontSize: "11px", // Smaller font
        fontWeight: 700,
        color: "var(--mantine-color-dimmed)",
      }}
      onClick={() => toggleSort(col)}
    >
      <Group gap={4}>
        {label}
        <SortIcon col={col} />
      </Group>
    </Table.Th>
  );

  const stats = useMemo(() => {
    if (!rows) return { stored: 0, requests: 0, released: 0 };

    let stored = 0;
    let requests = 0;
    let released = 0;

    rows.forEach((row) => {
      const packages = row.raw?.packages;

      if (Array.isArray(packages)) {
        const uniqueIds = new Set();

        packages.forEach((p: any) => {
          if (uniqueIds.has(p.id)) return;
          uniqueIds.add(p.id);

          if (p.status === "STORED") stored++;
          else if (p.status === "RELEASED") released++;
          else if (p.status?.includes("REQUEST")) requests++;
        });
      }
    });

    return { stored, requests, released };
  }, [rows]);

  const activePackages = stats.stored;
  const pendingRequests = stats.requests;
  const readyForPickup = stats.released;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} c="dark.8">
            Mailroom Service List
          </Title>
          <Text c="dimmed" size="sm">
            Manage your mailroom subscriptions and packages
          </Text>
        </Box>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 3 }} mb="lg">
        <Paper withBorder p="md" radius="md">
          <Group>
            <RingProgress
              size={80}
              roundCaps
              thickness={8}
              sections={[{ value: 100, color: "blue" }]}
              label={
                <Center>
                  <IconBox style={{ width: 20, height: 20 }} stroke={1.5} />
                </Center>
              }
            />
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                In Storage
              </Text>
              <Text fw={700} size="xl">
                {activePackages}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size={80} radius="100%" variant="light" color="teal">
              <IconTruckDelivery size={40} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Ready for Pickup
              </Text>
              <Text fw={700} size="xl">
                {readyForPickup}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size={80} radius="100%" variant="light" color="orange">
              <IconAlertCircle size={40} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Pending Requests
              </Text>
              <Text fw={700} size="xl">
                {pendingRequests}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search by name, code, email..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Group gap="xs">
            <Tooltip label="Refresh List">
              <ActionIcon variant="light" size="lg" onClick={refresh}>
                <IconRefresh size={18} />
              </ActionIcon>
            </Tooltip>

            <Popover width={300} position="bottom-end" withArrow shadow="md">
              <Popover.Target>
                <Tooltip label="Filter List">
                  <ActionIcon
                    variant={
                      Object.values(filters).some(Boolean) ? "filled" : "light"
                    }
                    size="lg"
                  >
                    <IconFilter size={18} />
                  </ActionIcon>
                </Tooltip>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="sm">
                  <Text size="sm" fw={600}>
                    Filter Registrations
                  </Text>

                  <Select
                    label="Plan"
                    placeholder="Any Plan"
                    data={filterOptions.plans}
                    value={filters.plan}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, plan: val }))
                    }
                    clearable
                    size="xs"
                  />

                  <Select
                    label="Location"
                    placeholder="Any Location"
                    data={filterOptions.locations}
                    value={filters.location}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, location: val }))
                    }
                    clearable
                    size="xs"
                  />

                  <Select
                    label="Status"
                    placeholder="Any Status"
                    data={["ACTIVE", "EXPIRING", "INACTIVE"]}
                    value={filters.mailroomStatus}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, mailroomStatus: val }))
                    }
                    clearable
                    size="xs"
                  />

                  <Button
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={() =>
                      setFilters({
                        plan: null,
                        location: null,
                        mailroomStatus: null,
                      })
                    }
                    disabled={
                      !filters.plan &&
                      !filters.location &&
                      !filters.mailroomStatus
                    }
                  >
                    Clear Filters
                  </Button>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          </Group>
        </Group>

        <ScrollArea>
          <Table verticalSpacing="md" highlightOnHover withTableBorder={false}>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                {visibleColumns.mailroom_code && (
                  <ThSortable col="mailroom_code" label="Code" />
                )}
                {visibleColumns.name && <ThSortable col="name" label="Name" />}

                {visibleColumns.activity && (
                  <Table.Th
                    style={{
                      textTransform: "uppercase",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--mantine-color-dimmed)",
                    }}
                  >
                    Activity
                  </Table.Th>
                )}

                {visibleColumns.email && (
                  <ThSortable col="email" label="Email" />
                )}
                {visibleColumns.plan && <ThSortable col="plan" label="Plan" />}
                {visibleColumns.location && (
                  <ThSortable col="location" label="Location" />
                )}
                {visibleColumns.created_at && (
                  <ThSortable col="created_at" label="Created" />
                )}
                {visibleColumns.expiry_at && (
                  <ThSortable col="expiry_at" label="Expiry" />
                )}
                {visibleColumns.mailroom_status && (
                  <Table.Th
                    style={{
                      textTransform: "uppercase",
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--mantine-color-dimmed)",
                    }}
                  >
                    Status
                  </Table.Th>
                )}
                {visibleColumns.view && (
                  <Table.Th style={{ width: 100 }}></Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {loading || rows === null ? (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Stack align="center" py="xl">
                      <Loader size="sm" />
                      <Text size="sm" c="dimmed">
                        Loading registrations...
                      </Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : error ? (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Stack align="center" py="xl">
                      <Text c="red">{error}</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : filtered.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={10}>
                    <Stack align="center" py="xl">
                      <ThemeIcon
                        size={48}
                        radius="xl"
                        color="gray"
                        variant="light"
                      >
                        <IconInbox size={24} />
                      </ThemeIcon>
                      <Text c="dimmed">No registrations found</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : (
                filtered.map((r) => (
                  <Table.Tr key={r.id}>
                    {visibleColumns.mailroom_code && (
                      <Table.Td>
                        {r.mailroom_code ? (
                          <Badge
                            variant="light"
                            color="violet"
                            size="md"
                            radius="sm"
                            style={{ fontFamily: "monospace" }}
                          >
                            {r.mailroom_code}
                          </Badge>
                        ) : (
                          <Text c="dimmed" size="sm">
                            —
                          </Text>
                        )}
                      </Table.Td>
                    )}
                    {visibleColumns.name && (
                      <Table.Td>
                        {/* CHANGED: Removed Avatar, just showing name */}
                        <Text fw={600} size="sm">
                          {r.name}
                        </Text>
                      </Table.Td>
                    )}

                    {visibleColumns.activity && (
                      <Table.Td>
                        <Group gap={8}>
                          {r.stats.stored > 0 && (
                            <Tooltip
                              label={`${r.stats.stored} Items in Storage`}
                            >
                              {/* CHANGED: Increased size, changed variant to light, fixed icon size */}
                              <Badge
                                size="md"
                                variant="light"
                                color="blue"
                                leftSection={
                                  <IconBox size={16} style={{ marginTop: 4 }} />
                                }
                              >
                                {r.stats.stored}
                              </Badge>
                            </Tooltip>
                          )}
                          {r.stats.pending > 0 && (
                            <Tooltip
                              label={`${r.stats.pending} Pending Requests`}
                            >
                              <Badge
                                size="md"
                                variant="light"
                                color="orange"
                                leftSection={
                                  <IconAlertCircle
                                    size={16}
                                    style={{ marginTop: 4 }}
                                  />
                                }
                              >
                                {r.stats.pending}
                              </Badge>
                            </Tooltip>
                          )}
                          {r.stats.stored === 0 && r.stats.pending === 0 && (
                            <Text size="xs" c="dimmed">
                              —
                            </Text>
                          )}
                        </Group>
                      </Table.Td>
                    )}

                    {visibleColumns.email && (
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {r.email ?? "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.plan && (
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {r.plan ?? "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.location && (
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {r.location ?? "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.created_at && (
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString()
                            : "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.expiry_at && (
                      <Table.Td>
                        <Text size="xs" c="dimmed">
                          {r.expiry_at
                            ? new Date(r.expiry_at).toLocaleDateString()
                            : "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.mailroom_status && (
                      <Table.Td>
                        {r.mailroom_status ? (
                          (() => {
                            const s = String(r.mailroom_status).toUpperCase();
                            const color =
                              s === "ACTIVE"
                                ? "green"
                                : s === "EXPIRING"
                                ? "yellow"
                                : "gray";
                            return (
                              <Badge
                                color={color}
                                variant="light"
                                size="sm"
                                radius="sm"
                              >
                                {s}
                              </Badge>
                            );
                          })()
                        ) : (
                          <Text c="dimmed">—</Text>
                        )}
                      </Table.Td>
                    )}
                    {visibleColumns.view && (
                      <Table.Td>
                        <Button
                          component={Link}
                          href={`/mailroom/${r.id}`}
                          variant="default"
                          size="xs"
                          radius="md"
                          fullWidth
                          rightSection={<IconChevronRight size={14} />}
                        >
                          Manage
                        </Button>
                      </Table.Td>
                    )}
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}
