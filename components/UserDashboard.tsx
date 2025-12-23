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
  IconCreditCardOff,
  IconSearch,
  IconCopy,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";
import { notifications } from "@mantine/notifications";
import type { RawRow, LocationObj } from "@/utils/types/types";

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
  auto_renew: boolean;
  stats: {
    stored: number;
    pending: number;
    released: number;
  };
  raw?: RawRow;
};

const addMonths = (iso?: string | null, months = 0): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

const mapDataToRows = (data: RawRow[]): Row[] =>
  data.map((r) => {
    const planObj = r.mailroom_plan_table ?? null;
    const planName = planObj?.mailroom_plan_name ?? null;
    const planMonths =
      typeof planObj?.mailroom_plan_price === "number"
        ? Number(planObj.mailroom_plan_price)
        : null;

    const locObj = r.mailroom_location_table ?? null;
    const locationName = locObj?.mailroom_location_name ?? null;
    const created = r.mailroom_registration_created_at ?? null;

    // subscription overrides expiry/auto_renew when available
    const subscription = r.subscription_table ?? null;
    const expiryFromSub = subscription?.subscription_expires_at ?? null;
    const autoRenew =
      typeof subscription?.subscription_auto_renew === "boolean"
        ? subscription!.subscription_auto_renew
        : true;

    const expiry =
      expiryFromSub ??
      (planMonths ? addMonths(created, Number(planMonths)) : null);

    let computedStatus: string | null = null;
    if (expiry) {
      const ed = new Date(expiry);
      const diff = ed.getTime() - Date.now();
      if (diff <= 0) {
        computedStatus = autoRenew ? "ACTIVE" : "INACTIVE";
      } else if (diff <= 7 * 24 * 60 * 60 * 1000) {
        computedStatus = autoRenew ? "ACTIVE" : "EXPIRING";
      } else {
        computedStatus = "ACTIVE";
      }
    } else {
      computedStatus = r.mailroom_registration_status ? "ACTIVE" : "INACTIVE";
    }

    let stored = 0;
    let pending = 0;
    let released = 0;

    const items = Array.isArray(r.mailbox_item_table)
      ? r.mailbox_item_table
      : [];
    const seen = new Set<string | undefined>();
    items.forEach((p) => {
      const id = p.mailbox_item_id;
      if (id && seen.has(id)) return;
      if (id) seen.add(id);

      const s = String(p.mailbox_item_status ?? "").toUpperCase();

      if (s === "RELEASED") {
        released += 1;
      }

      if (s.includes("REQUEST")) {
        pending += 1;
      }

      if (!["RELEASED", "RETRIEVED", "DISPOSED"].includes(s)) {
        stored += 1;
      }
    });

    // subscriber name from users_table.user_kyc_table if present (readonly KYC)
    const userObj = r.users_table ?? null;
    const kyc = userObj?.user_kyc_table ?? null;
    const first = kyc?.user_kyc_first_name ?? null;
    const last = kyc?.user_kyc_last_name ?? null;
    const name =
      first || last
        ? `${first ? String(first) : ""}${first && last ? " " : ""}${last ? String(last) : ""}`
        : (locationName ??
          `Mailroom #${String(r.mailroom_registration_id ?? "").slice(0, 8)}`);

    return {
      id: String(r.mailroom_registration_id ?? ""),
      mailroom_code: r.mailroom_registration_code ?? null,
      name,
      email: userObj?.users_email ?? null,
      plan: planName,
      location: locationName,
      created_at: created,
      expiry_at: expiry,
      mailroom_status: computedStatus,
      auto_renew: autoRenew ?? true,
      stats: { stored, pending, released },
      raw: r,
    };
  });

export default function UserDashboard({
  initialData,
}: {
  initialData?: RawRow[] | null;
}) {
  const { session } = useSession();
  const [page, setPage] = useState<number>(1);
  const perPage = 2;
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  const [search, setSearch] = useState("");
  const [filters] = useState({
    plan: null as string | null,
    location: null as string | null,
    mailroomStatus: null as string | null,
  });

  const [firstName, setFirstName] = useState<string | null>(null);

  const fetcher = async (url: string): Promise<RawRow[]> => {
    const res = await fetch(url, { method: "GET", credentials: "include" });
    if (!res.ok) {
      const json = await res
        .json()
        .catch(() => ({}) as Record<string, unknown>);
      const err =
        (json as Record<string, unknown>)?.error ??
        "Failed to load registrations";
      throw new Error(String(err));
    }
    const json = (await res.json()) as Record<string, unknown>;
    const payload = (json.data as unknown) ?? json;
    let rowsArr: RawRow[] = [];
    if (Array.isArray(payload)) {
      rowsArr = payload as RawRow[];
    } else if (
      payload &&
      typeof payload === "object" &&
      Array.isArray((payload as Record<string, unknown>).data)
    ) {
      rowsArr = (payload as Record<string, unknown>)
        .data as unknown as RawRow[];
    } else {
      rowsArr = [];
    }
    return rowsArr;
  };

  const swrKey = session?.user?.id ? "/api/mailroom/registrations" : null;
  const { data: apiData, error: swrError } = useSWR<RawRow[] | undefined>(
    swrKey,
    fetcher,
    {
      revalidateOnFocus: true,
      fallbackData: initialData ?? undefined,
    },
  );

  useEffect(() => {
    setLoading(Boolean(!rows && !swrError && !apiData));
    setError(swrError ? (swrError as Error).message : null);
    if (Array.isArray(apiData)) {
      setRows(mapDataToRows(apiData));
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
            String(r.name ?? "")
              .toLowerCase()
              .includes(q) ||
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
        const sortBy = "created_at" as const;
        const dir: "asc" | "desc" = "desc";
        const va = (a as Record<string, unknown>)[sortBy] as
          | string
          | number
          | undefined;
        const vb = (b as Record<string, unknown>)[sortBy] as
          | string
          | number
          | undefined;

        // compute numeric multiplier up-front to avoid direct string comparisons in-place
        const mults: Record<"asc" | "desc", number> = { asc: 1, desc: -1 };
        const multiplier = mults[dir];

        if (va == null && vb == null) return 0;
        if (va == null) return multiplier === 1 ? -1 : 1;
        if (vb == null) return multiplier === 1 ? 1 : -1;

        const da = new Date(String(va)).getTime();
        const db = new Date(String(vb)).getTime();
        const diff = da - db;
        return diff * multiplier;
      });
  }, [rows, search, filters]);

  const refresh = (): void => {
    setRows(null);
    setError(null);
    if (swrKey) swrMutate(swrKey);
  };

  const handleCancelSubscription = async (): Promise<void> => {
    if (!selectedSubId) return;
    setCanceling(true);
    try {
      const res = await fetch(
        `/api/mailroom/registrations/${selectedSubId}/cancel`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error("Failed to cancel subscription");
      notifications.show({
        title: "Subscription Canceled",
        message: "Your plan will not renew after the current period.",
        color: "orange",
      });
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

  const getFullAddressFromRaw = (
    raw: RawRow | null | undefined,
  ): string | null => {
    if (!raw) return null;
    const loc = (raw.mailroom_location_table as LocationObj | undefined) ?? {};
    if (typeof loc.formatted_address === "string")
      return String(loc.formatted_address);
    const parts: string[] = [];
    const name =
      (loc.mailroom_location_name as string | undefined) ??
      ((raw as Record<string, unknown>)["location_name"] as
        | string
        | undefined) ??
      null;
    if (name) parts.push(String(name));
    const street =
      (loc.address_line as string | undefined) ??
      (loc.line1 as string | undefined) ??
      null;
    if (street) parts.push(String(street));
    const city = (loc.mailroom_location_city as string | undefined) ?? null;
    const province =
      (loc.mailroom_location_region as string | undefined) ?? null;
    const postal = (loc.mailroom_location_zip as string | undefined) ?? null;
    const tail = [city, province, postal].filter(Boolean).join(", ");
    if (tail) parts.push(tail);
    const out = parts.filter(Boolean).join(", ").trim();
    return out || null;
  };

  const copyFullShippingAddress = async (row: Row): Promise<void> => {
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
        message: (e as Error).message ?? String(e),
        color: "red",
      });
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadKyc = async (): Promise<void> => {
      if (!session?.user?.id) return;
      try {
        const res = await fetch(
          `/api/user/kyc?userId=${encodeURIComponent(session.user.id)}`,
          { method: "GET", credentials: "include" },
        );
        if (!res.ok) return;
        const json = await res.json();
        let payload = json?.data ?? json;
        if (payload && typeof payload === "object" && "kyc" in payload) {
          payload = (payload as Record<string, unknown>).kyc as unknown;
        }
        if (Array.isArray(payload) && payload.length > 0) payload = payload[0];

        const first =
          (payload &&
            (payload as Record<string, unknown>)?.user_kyc_first_name) ??
          (payload && (payload as Record<string, unknown>)?.first_name) ??
          (payload && (payload as Record<string, unknown>)?.firstName) ??
          null;
        if (mounted) setFirstName(first ? String(first) : null);
      } catch {
        /* ignore errors */
      }
    };

    void loadKyc();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

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
        <Text c="red" fw={700}>
          Error
        </Text>
        <Text c="dimmed">{error}</Text>
        <Button mt="md" onClick={refresh}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Title order={2} c="dark.8">
            Hello, {firstName ?? "User"}
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

      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper
          p="md"
          radius="md"
          withBorder
          shadow="xs"
          bg={rows && rows.length > 0 ? "blue.0" : undefined}
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
                {rows ? rows.reduce((s, r) => s + r.stats.stored, 0) : 0}
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
                {rows ? rows.reduce((s, r) => s + r.stats.pending, 0) : 0}
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
                {rows ? rows.reduce((s, r) => s + r.stats.released, 0) : 0}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      <Divider label="Your Active Subscriptions" labelPosition="center" />

      {(() => {
        const list = filtered;
        const total = list.length;
        const start = (page - 1) * perPage;
        const pageItems = list.slice(start, start + perPage);
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
                      <Group gap="xs" align="center">
                        <ThemeIcon color="violet" variant="light">
                          <IconMapPin size={16} />
                        </ThemeIcon>
                        <Text fw={600} size="sm">
                          {row.location ?? "Unknown Location"}
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
                              {row.mailroom_code ?? "PENDING"}
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

                  <Group mt="md" grow>
                    <Button
                      component={Link}
                      href={`/mailroom/${row.id}`}
                      radius="md"
                      rightSection={<IconChevronRight size={16} />}
                    >
                      Manage Mailbox
                    </Button>
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
