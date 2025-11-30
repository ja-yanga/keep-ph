import React, { useEffect, useMemo, useState } from "react";
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
} from "@mantine/core";
import {
  IconRefresh,
  IconSettings,
  IconEye,
  IconSearch,
  IconFilter,
  IconDownload,
  IconInbox,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import Link from "next/link";
import { useSession } from "@/components/SessionProvider";

type RawRow = any;
type Row = {
  id: string;
  name: string;
  plan: string | null;
  location: string | null;
  created_at?: string | null;
  expiry_at?: string | null;
  mailroom_status?: string | null;
  raw?: RawRow;
};

const addMonths = (iso?: string | null, months = 0) => {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
};

export default function MailroomList() {
  const { session } = useSession();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [search, setSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState({
    plan: null as string | null,
    location: null as string | null,
    mailroomStatus: null as string | null,
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      name: true,
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

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mailroom/registrations", {
          method: "GET",
          credentials: "include",
        });
        if (!mounted) return;
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

        const mapped: Row[] = data.map((r: any) => {
          const planName = r.mailroom_plans?.name ?? r.plan_name ?? null;
          const userName = r.full_name ?? null;
          const locationName =
            r.mailroom_locations?.name ?? r.location_name ?? null;
          const created = r.created_at ?? null;
          const expiry = r.months ? addMonths(created, Number(r.months)) : null;
          const now = new Date();
          let computedStatus: string | null = null;
          if (expiry) {
            const ed = new Date(expiry);
            const diff = ed.getTime() - now.getTime();
            if (diff <= 0) computedStatus = "INACTIVE";
            else if (diff <= 7 * 24 * 60 * 60 * 1000)
              computedStatus = "EXPIRING";
            else computedStatus = "ACTIVE";
          } else {
            computedStatus = r.status ?? r.mailroom_status ?? "ACTIVE";
          }
          const mailroom_status = computedStatus;

          const name =
            userName ??
            planName ??
            r.package_name ??
            r.title ??
            `${locationName ?? "Mailroom Service"} #${r.id?.slice(0, 8)}`;
          return {
            id: r.id,
            name,
            plan: planName,
            location: locationName,
            created_at: created,
            expiry_at: expiry,
            mailroom_status,
            raw: r,
          };
        });

        setRows(mapped);
      } catch (err: any) {
        console.error("load err", err);
        setError("Failed to load registrations.");
        setRows([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => {
        if (search) {
          const q = search.toLowerCase();
          const found =
            String(r.name).toLowerCase().includes(q) ||
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
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/mailroom/registrations", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          setError("Failed to reload");
          setRows([]);
          return;
        }
        const json = await res.json();
        const data: RawRow[] = Array.isArray(json?.data ?? json)
          ? json.data ?? json
          : [];
        const mapped: Row[] = data.map((r: any) => {
          const planName = r.mailroom_plans?.name ?? r.plan_name ?? null;
          const userName = r.full_name ?? null;
          const locationName =
            r.mailroom_locations?.name ?? r.location_name ?? null;
          const created = r.created_at ?? null;
          const expiry = r.months ? addMonths(created, Number(r.months)) : null;
          const now = new Date();
          let computedStatus: string | null = null;
          if (expiry) {
            const ed = new Date(expiry);
            const diff = ed.getTime() - now.getTime();
            if (diff <= 0) computedStatus = "INACTIVE";
            else if (diff <= 7 * 24 * 60 * 60 * 1000)
              computedStatus = "EXPIRING";
            else computedStatus = "ACTIVE";
          } else {
            computedStatus = r.status ?? r.mailroom_status ?? "ACTIVE";
          }
          const mailroom_status = computedStatus;

          const name =
            userName ??
            planName ??
            r.package_name ??
            r.title ??
            `${locationName ?? "Mailroom Service"} #${r.id?.slice(0, 8)}`;
          return {
            id: r.id,
            name,
            plan: planName,
            location: locationName,
            created_at: created,
            expiry_at: expiry,
            mailroom_status,
            raw: r,
          };
        });
        setRows(mapped);
      } catch (err) {
        console.error("refresh err", err);
        setError("Failed to reload");
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
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
      style={{ cursor: "pointer", whiteSpace: "nowrap" }}
      onClick={() => toggleSort(col)}
    >
      <Group gap={4}>
        {label}
        <SortIcon col={col} />
      </Group>
    </Table.Th>
  );

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

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search by name, plan or location..."
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
            <Tooltip label="Advanced Filters">
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => setAdvancedOpen(true)}
                disabled
              >
                <IconFilter size={18} />
              </ActionIcon>
            </Tooltip>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="outline"
              size="sm"
              disabled
            >
              Export
            </Button>
          </Group>
        </Group>

        <ScrollArea>
          <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                {visibleColumns.name && <ThSortable col="name" label="Name" />}
                {visibleColumns.plan && <ThSortable col="plan" label="Plan" />}
                {visibleColumns.location && (
                  <ThSortable col="location" label="Location" />
                )}
                {visibleColumns.created_at && (
                  <ThSortable col="created_at" label="Date Created" />
                )}
                {visibleColumns.expiry_at && (
                  <ThSortable col="expiry_at" label="Date Expiry" />
                )}
                {visibleColumns.mailroom_status && (
                  <Table.Th>Mailroom Status</Table.Th>
                )}
                {visibleColumns.view && (
                  <Table.Th style={{ width: 80 }}>Action</Table.Th>
                )}
              </Table.Tr>
            </Table.Thead>

            <Table.Tbody>
              {loading || rows === null ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
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
                  <Table.Td colSpan={7}>
                    <Stack align="center" py="xl">
                      <Text c="red">{error}</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              ) : filtered.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
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
                    {visibleColumns.name && (
                      <Table.Td>
                        <Text fw={500} size="sm">
                          {r.name}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.plan && (
                      <Table.Td>
                        <Text size="sm">{r.plan ?? "—"}</Text>
                      </Table.Td>
                    )}
                    {visibleColumns.location && (
                      <Table.Td>
                        <Text size="sm">{r.location ?? "—"}</Text>
                      </Table.Td>
                    )}
                    {visibleColumns.created_at && (
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {r.created_at
                            ? new Date(r.created_at).toLocaleDateString()
                            : "—"}
                        </Text>
                      </Table.Td>
                    )}
                    {visibleColumns.expiry_at && (
                      <Table.Td>
                        <Text size="sm" c="dimmed">
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
                              <Badge color={color} variant="light">
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
                        <Tooltip label="View Details">
                          <Link href={`/mailroom/${r.id}`}>
                            <ActionIcon variant="subtle" color="blue">
                              <IconEye size={18} />
                            </ActionIcon>
                          </Link>
                        </Tooltip>
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
