"use client";

import React, { useEffect, useMemo, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
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
  TextInput,
  Title,
  ThemeIcon,
  SimpleGrid,
  Card,
  Divider,
  ActionIcon,
  Modal,
} from "@mantine/core";
import {
  IconBox,
  IconTruckDelivery,
  IconAlertCircle,
  IconMapPin,
  IconChevronRight,
  IconPackage,
  IconSortAscending,
  IconSortDescending,
  IconCreditCardOff, // ADDED
  IconSearch,
  IconCopy, // added
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { notifications } from "@mantine/notifications"; // ADDED

type RawRow = {
  id?: string;
  mailroom_code?: string;
  full_name?: string;
  email?: string;
  mailroom_plans?:
    | { name?: string; months?: number }
    | Array<{ name?: string; months?: number }>;
  plan_name?: string;
  months?: number;
  mailroom_locations?: { name?: string } | Array<{ name?: string }>;
  location_name?: string;
  created_at?: string;
  mailroom_status?: string;
  auto_renew?: boolean;
  packages?: unknown[];
  [key: string]: unknown;
};
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
  auto_renew: boolean; // ADDED
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
  return data.map((r: RawRow) => {
    const planName = r.mailroom_plans?.name ?? r.plan_name ?? null;
    const planMonths = r.mailroom_plans?.months ?? r.months ?? null;
    const userName = r.full_name ?? null;
    const locationName = r.mailroom_locations?.name ?? r.location_name ?? null;
    const created = r.created_at ?? null;

    // 1. Extract auto_renew first so we can use it in logic
    // Default to true if null/undefined
    const autoRenew = r.auto_renew !== false;

    const expiry = planMonths ? addMonths(created, Number(planMonths)) : null;

    const now = new Date();
    let computedStatus: string | null = null;

    if (expiry) {
      const ed = new Date(expiry);
      const diff = ed.getTime() - now.getTime();

      if (diff <= 0) {
        // Date has passed
        if (autoRenew) {
          // If auto-renew is ON, we keep it ACTIVE (grace period / pending renewal)
          computedStatus = "ACTIVE";
        } else {
          // Only show INACTIVE if they explicitly canceled
          computedStatus = "INACTIVE";
        }
      } else if (diff <= 7 * 24 * 60 * 60 * 1000) {
        // Less than 7 days left
        if (autoRenew) {
          // If auto-renew is ON, it's not really "expiring", it's just renewing.
          computedStatus = "ACTIVE";
        } else {
          // Warn them only if it will actually expire
          computedStatus = "EXPIRING";
        }
      } else {
        computedStatus = "ACTIVE";
      }
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
      r.packages.forEach(
        (p: { id?: string; status?: string; [key: string]: unknown }) => {
          if (uniqueIds.has(p.id)) return;
          uniqueIds.add(p.id);

          const s = (p.status ?? "").toUpperCase();

          // Count as released if fully released/retrieved
          if (s === "RELEASED") {
            released++;
          }

          // Count pending requests separately for any REQUEST_* statuses
          if (s.includes("REQUEST")) {
            pending++;
          }

          // Items are considered "in storage" unless final statuses (released/retrieved/disposed).
          // This ensures REQUEST_TO_* still count as items in storage.
          if (!["RELEASED", "RETRIEVED", "DISPOSED"].includes(s)) {
            stored++;
          }
        },
      );
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
      auto_renew: autoRenew, // Use the variable we created
      // NEW: Attach stats
      stats: { stored, pending, released },
      raw: r,
    };
  });
};

export default function UserDashboard({
  initialData,
}: {
  initialData?: RawRow[] | null;
}) {
  const { session } = useSession();
  // pagination for registrations
  const [page, setPage] = useState<number>(1);
  const perPage = 2;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ADDED: Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  // UI state
  const [search, setSearch] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
  const [filters, setFilters] = useState({
    plan: null as string | null,
    location: null as string | null,
    mailroomStatus: null as string | null,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
  const filterOptions = useMemo(() => {
    if (!rows) return { plans: [], locations: [] };
    const plans = Array.from(
      new Set(rows.map((r) => r.plan).filter(Boolean)),
    ) as string[];
    const locations = Array.from(
      new Set(rows.map((r) => r.location).filter(Boolean)),
    ) as string[];
    return { plans, locations };
  }, [rows]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
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
    },
  );

  // sorting
  const [sortBy, setSortBy] = useState<string | null>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // 2. SWR fetcher for registrations (keeps same endpoint and credentials)
  const fetcher = async (url: string) => {
    const res = await fetch(url, { method: "GET", credentials: "include" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      const err = json?.error || "Failed to load registrations";
      throw new Error(err);
    }
    const json = await res.json();
    const data: RawRow[] = Array.isArray(json?.data ?? json)
      ? (json.data ?? json)
      : [];
    return data;
  };

  // SWR key depends on session readiness
  const swrKey = session?.user?.id ? "/api/mailroom/registrations" : null;
  const { data: apiData, error: swrError } = useSWR<RawRow[] | undefined>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: true,
      fallbackData: initialData ?? undefined, // hydrate from server
    },
  );

  // map API data into rows and keep as local state for UI / optimistic updates
  useEffect(() => {
    setLoading(Boolean(!rows && !swrError && !apiData));
    setError(swrError ? (swrError as Error).message : null);
    if (Array.isArray(apiData)) {
      const mapped = mapDataToRows(apiData);
      setRows(mapped);
    }
    setLoading(false);
  }, [apiData, swrError]);

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
        const va = (a as Record<string, unknown>)[sortBy];
        const vb = (b as Record<string, unknown>)[sortBy];
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
    if (swrKey) swrMutate(swrKey);
  };

  // ADDED: Handle Cancel Subscription
  const handleCancelSubscription = async () => {
    if (!selectedSubId) return;
    setCanceling(true);
    try {
      const res = await fetch(
        `/api/mailroom/registrations/${selectedSubId}/cancel`,
        {
          method: "PATCH",
        },
      );

      if (!res.ok) throw new Error("Failed to cancel subscription");

      notifications.show({
        title: "Subscription Canceled",
        message: "Your plan will not renew after the current period.",
        color: "orange",
      });

      // Update local state
      setRows((prev) =>
        prev
          ? prev.map((r) =>
              r.id === selectedSubId ? { ...r, auto_renew: false } : r,
            )
          : null,
      );
      setCancelModalOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setCanceling(false);
    }
  };

  // build a best-effort full shipping address from the API row.raw
  const getFullAddressFromRaw = (
    raw:
      | {
          mailroom_locations?: {
            formatted_address?: string;
            name?: string;
            line1?: string;
            city?: string;
            region?: string;
            postal?: string;
          };
          location?: {
            formatted_address?: string;
            name?: string;
            line1?: string;
            city?: string;
            region?: string;
            postal?: string;
          };
          [key: string]: unknown;
        }
      | null
      | undefined,
  ): string | null => {
    if (!raw) return null;
    const loc = raw.mailroom_locations ?? raw.location ?? {};
    // prefer a preformatted address if available
    if (loc?.formatted_address) return String(loc.formatted_address);

    const parts: string[] = [];
    const name = loc?.name ?? raw.location_name ?? null;
    if (name) parts.push(String(name));

    const street =
      loc?.address_line ||
      loc?.street ||
      loc?.line1 ||
      loc?.line ||
      loc?.address;
    if (street) parts.push(String(street));

    const city = loc?.city || loc?.town || null;
    const province = loc?.province || loc?.state || null;
    const postal = loc?.postal_code || loc?.postal || loc?.zip || null;
    const country = loc?.country || null;
    const tail = [city, province, postal, country].filter(Boolean).join(", ");
    if (tail) parts.push(tail);

    const out = parts.filter(Boolean).join(", ").trim();
    return out || null;
  };

  // copy full shipping address to clipboard (mailroom code + full address)
  const copyFullShippingAddress = async (row: Row) => {
    const code = row.mailroom_code ?? null;
    const full = getFullAddressFromRaw(row.raw) ?? row.location ?? null;
    const txt = `${code ? `${code} ` : ""}${full ?? ""}`.trim();
    if (!txt) {
      notifications.show({
        title: "Nothing to copy",
        message: "No full address available",
        color: "yellow",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      notifications.show({
        title: "Copied",
        message: "Full shipping address copied to clipboard",
        color: "teal",
      });
    } catch (e: unknown) {
      console.error("copy failed", e);
      notifications.show({
        title: "Copy failed",
        message: e?.message ?? String(e),
        color: "red",
      });
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return null;
    return sortDir === "asc" ? (
      <IconSortAscending size={14} />
    ) : (
      <IconSortDescending size={14} />
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
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

  // Calculate global stats
  const stats = useMemo(() => {
    if (!rows) return { stored: 0, requests: 0, released: 0 };
    let stored = 0;
    let requests = 0;
    let released = 0;
    rows.forEach((row) => {
      stored += row.stats.stored;
      requests += row.stats.pending;
      released += row.stats.released;
    });
    return { stored, requests, released };
  }, [rows]);

  if (loading) {
    return (
      <Stack align="center" py="xl">
        <Loader size="md" />
        <Text c="dimmed">Loading your dashboard...</Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack align="center" py="xl">
        <IconAlertCircle size={40} color="red" />
        <Text c="red">{error}</Text>
        <Button onClick={refresh} variant="subtle">
          Try Again
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      {/* 1. Welcome Section */}
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} c="dark.8">
            Hello, {session?.user?.name || "User"}
          </Title>
          <Text c="dimmed">Here is what&apos;s happening with your mail.</Text>
        </Box>
        <Group gap="sm" align="center">
          <TextInput
            placeholder="Search mailrooms"
            value={search}
            onChange={(e) => {
              setSearch(e.currentTarget.value);
              setPage(1);
            }}
            leftSection={<IconSearch size={16} />}
            size="md"
            __clearable
            style={{ maxWidth: 420, minWidth: 240 }}
          />
          <Button component={Link} href="/mailroom/register" variant="outline">
            Add New Mailroom
          </Button>
        </Group>
      </Group>

      {/* 2. High Level Stats (Simplified) */}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper
          p="md"
          radius="md"
          withBorder
          shadow="xs"
          bg={stats.stored > 0 ? "blue.0" : undefined}
        >
          <Group>
            <ThemeIcon size="xl" radius="md" color="blue" variant="filled">
              <IconBox size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Items in Storage
              </Text>
              <Text fw={700} size="xl" c="blue.9">
                {stats.stored}
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder shadow="xs">
          <Group>
            <ThemeIcon size="xl" radius="md" color="orange" variant="light">
              <IconAlertCircle size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Pending Requests
              </Text>
              <Text fw={700} size="xl">
                {stats.requests}
              </Text>
            </div>
          </Group>
        </Paper>
        <Paper p="md" radius="md" withBorder shadow="xs">
          <Group>
            <ThemeIcon size="xl" radius="md" color="teal" variant="light">
              <IconTruckDelivery size={24} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Total Released
              </Text>
              <Text fw={700} size="xl">
                {stats.released}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Divider label="Your Active Subscriptions" labelPosition="center" />

      {/* 3. Subscription Cards (Replaces the Table) */}
      {(() => {
        const total = filtered.length;
        const start = (page - 1) * perPage;
        const pageItems = filtered.slice(start, start + perPage);
        return (
          <>
            <SimpleGrid cols={{ base: 1, md: 2 }}>
              {pageItems.map((row) => (
                <Card
                  key={row.id}
                  shadow="sm"
                  padding="lg"
                  radius="md"
                  withBorder
                >
                  <Card.Section withBorder inheritPadding py="xs" bg="gray.0">
                    <Group justify="space-between">
                      {/* CHANGED: Added copy icon beside location (full shipping address) */}
                      <Group gap="xs" align="center">
                        <ThemeIcon color="violet" variant="light">
                          <IconMapPin size={16} />
                        </ThemeIcon>
                        <Text fw={600} size="sm">
                          {row.location || "Unknown Location"}
                        </Text>
                        <ActionIcon
                          variant="light"
                          onClick={() => copyFullShippingAddress(row)}
                          title="Copy full shipping address"
                        >
                          <IconCopy size={16} />
                        </ActionIcon>
                      </Group>
                      <Badge
                        // CHANGED: Update colors to handle INACTIVE/EXPIRING
                        color={(() => {
                          if (row.mailroom_status === "ACTIVE") return "green";
                          if (row.mailroom_status === "EXPIRING")
                            return "yellow";
                          return "red";
                        })()}
                        variant="dot"
                      >
                        {row.mailroom_status}
                      </Badge>
                    </Group>
                  </Card.Section>

                  <Stack mt="md" gap="sm">
                    <Group justify="space-between" align="flex-start">
                      <Box>
                        <Group align="center" gap="xs">
                          <div>
                            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                              Mailroom Code
                            </Text>
                            <Text
                              size="xl"
                              fw={800}
                              ff="monospace"
                              c="violet.9"
                            >
                              {row.mailroom_code || "PENDING"}
                            </Text>
                          </div>
                        </Group>

                        <Text size="xs" c="dimmed" mt={6}>
                          {row.location ?? "Address not set"}
                        </Text>
                      </Box>
                      <Box ta="right">
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          Plan
                        </Text>
                        <Text fw={600}>{row.plan}</Text>
                      </Box>
                    </Group>

                    {/* ADDED: Subscriber Details */}
                    <Box>
                      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                        Subscriber
                      </Text>
                      <Text fw={600} size="sm" lh={1.2}>
                        {row.name}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {row.email}
                      </Text>
                    </Box>

                    <Divider my="xs" variant="dashed" />

                    <Group grow>
                      <Box>
                        <Group gap={6} mb={4}>
                          <IconPackage size={14} color="gray" />
                          <Text size="xs" c="dimmed">
                            Current Inventory
                          </Text>
                        </Group>
                        <Text fw={700} size="lg">
                          {row.stats.stored}{" "}
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 400,
                              color: "#868e96",
                            }}
                          >
                            items
                          </span>
                        </Text>
                      </Box>
                      <Box style={{ textAlign: "right" }}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                          {row.auto_renew ? "Renews On" : "Expires On"}
                        </Text>
                        <Text
                          fw={500}
                          size="sm"
                          c={row.auto_renew ? "dark" : "red"}
                        >
                          {row.expiry_at
                            ? new Date(row.expiry_at).toLocaleDateString()
                            : "N/A"}
                        </Text>
                      </Box>
                    </Group>

                    {/* show released count and pending requests per mailroom */}
                    <Group mt="sm" style={{ gap: 8 }}>
                      <Badge color="teal" variant="light">
                        Released: {row.stats.released}
                      </Badge>
                      <Badge
                        color={row.stats.pending > 0 ? "orange" : "gray"}
                        variant={row.stats.pending > 0 ? "filled" : "light"}
                      >
                        {row.stats.pending} request
                        {row.stats.pending !== 1 ? "s" : ""}
                      </Badge>
                    </Group>
                  </Stack>

                  {/* CHANGED: Added Group for buttons */}
                  <Group mt="md" grow>
                    <Button
                      component={Link}
                      href={`/mailroom/${row.id}`}
                      radius="md"
                      rightSection={<IconChevronRight size={16} />}
                    >
                      Manage Mailbox
                    </Button>
                    {/* ADDED: Cancel Button */}
                    {row.auto_renew && row.mailroom_status === "ACTIVE" && (
                      <Button
                        variant="light"
                        color="red"
                        radius="md"
                        onClick={() => {
                          setSelectedSubId(row.id);
                          setCancelModalOpen(true);
                        }}
                      >
                        Cancel Renewal
                      </Button>
                    )}
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
            {total > perPage && (
              <Group
                justify="space-between"
                mt="md"
                align="center"
                style={{ width: "100%" }}
              >
                <Text size="sm" c="dimmed">
                  Showing {Math.min(start + 1, total)}–
                  {Math.min(start + pageItems.length, total)} of {total}
                </Text>
                <Group>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={start + perPage >= total}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </Group>
              </Group>
            )}
          </>
        );
      })()}

      {/* ADDED: Cancel Confirmation Modal */}
      <Modal
        opened={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Subscription Renewal?"
        centered
      >
        <Stack>
          <Text size="sm">
            Are you sure you want to cancel the auto-renewal for this mailroom?
          </Text>
          <Paper withBorder p="sm" bg="gray.0">
            <Group gap="sm">
              <IconCreditCardOff size={20} color="gray" />
              <Text size="xs" c="dimmed">
                You will retain access to your mailroom and packages until the
                current period expires. After that, the account will become
                inactive.
              </Text>
            </Group>
          </Paper>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setCancelModalOpen(false)}
              disabled={canceling}
            >
              Keep Subscription
            </Button>
            <Button
              color="red"
              onClick={handleCancelSubscription}
              loading={canceling}
            >
              Cancel Renewal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
