import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Progress,
  Divider,
  ActionIcon,
  Tooltip,
  Container,
  Modal,
} from "@mantine/core";
import {
  IconBox,
  IconTruckDelivery,
  IconAlertCircle,
  IconMapPin,
  IconCalendar,
  IconChevronRight,
  IconCreditCard,
  IconPackage,
  IconSortAscending,
  IconSortDescending,
  IconCreditCardOff, // ADDED
  IconSearch,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { notifications } from "@mantine/notifications"; // ADDED

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
  return data.map((r: any) => {
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
      auto_renew: autoRenew, // Use the variable we created
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

  // ADDED: Cancel Modal State
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

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
      ? json.data ?? json
      : [];
    return data;
  };

  // SWR key depends on session readiness
  const swrKey = session?.user?.id ? "/api/mailroom/registrations" : null;
  const {
    data: apiData,
    error: swrError,
    isValidating,
  } = useSWR<RawRow[] | undefined>(swrKey, fetcher, {
    revalidateOnFocus: true,
  });

  // map API data into rows and keep as local state for UI / optimistic updates
  useEffect(() => {
    setLoading(Boolean(!rows && !swrError && !apiData));
    setError(swrError ? (swrError as Error).message : null);
    if (Array.isArray(apiData)) {
      const mapped = mapDataToRows(apiData);
      setRows(mapped);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        }
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
              r.id === selectedSubId ? { ...r, auto_renew: false } : r
            )
          : null
      );
      setCancelModalOpen(false);
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    } finally {
      setCanceling(false);
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

  // Empty State
  if (rows && rows.length === 0) {
    return (
      <Container size="sm">
        <Paper p="xl" radius="md" withBorder ta="center">
          <ThemeIcon size={60} radius="xl" color="blue" variant="light" mb="md">
            <IconBox size={30} />
          </ThemeIcon>
          <Title order={3} mb="xs">
            No Mailroom Services Yet
          </Title>
          <Text c="dimmed" mb="xl">
            You haven't registered for a mailroom service yet. Get your own
            address today!
          </Text>
          <Button component={Link} href="/mailroom/register" size="md">
            Register New Service
          </Button>
        </Paper>
      </Container>
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
          <Text c="dimmed">Here is what's happening with your mail.</Text>
        </Box>
        <Group gap="sm" align="center">
          <TextInput
            placeholder="Search mailrooms"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
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
      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {filtered.map((row) => (
          <Card key={row.id} shadow="sm" padding="lg" radius="md" withBorder>
            <Card.Section withBorder inheritPadding py="xs" bg="gray.0">
              <Group justify="space-between">
                {/* CHANGED: Added quotes around "xs" */}
                <Group gap="xs">
                  <ThemeIcon color="violet" variant="light">
                    <IconMapPin size={16} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    {row.location || "Unknown Location"}
                  </Text>
                </Group>
                <Badge
                  // CHANGED: Update colors to handle INACTIVE/EXPIRING
                  color={
                    row.mailroom_status === "ACTIVE"
                      ? "green"
                      : row.mailroom_status === "EXPIRING"
                      ? "yellow"
                      : "red"
                  }
                  variant="dot"
                >
                  {row.mailroom_status}
                </Badge>
              </Group>
            </Card.Section>

            <Stack mt="md" gap="sm">
              <Group justify="space-between" align="flex-start">
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Mailroom Code
                  </Text>
                  <Text size="xl" fw={800} ff="monospace" c="violet.9">
                    {row.mailroom_code || "PENDING"}
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
                  <Text fw={500} size="sm" c={row.auto_renew ? "dark" : "red"}>
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
