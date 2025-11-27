import React, { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Group,
  Loader,
  Space,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconRefresh, IconSettings, IconEye } from "@tabler/icons-react";
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
  locker_status?: string | null;
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
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [filters, setFilters] = useState({
    plan: null as string | null,
    location: null as string | null,
    mailroomStatus: null as string | null,
    lockerStatus: null as string | null,
  });
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(
    {
      name: true,
      plan: true,
      location: true,
      created_at: true,
      expiry_at: true,
      mailroom_status: true,
      locker_status: true,
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
          const locker_status = r.locker_status ?? null;
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
            locker_status,
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

  const plans = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.plan && s.add(r.plan));
    return Array.from(s);
  }, [rows]);

  const locations = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.location && s.add(r.location));
    return Array.from(s);
  }, [rows]);

  const mailroomStatuses = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.mailroom_status && s.add(r.mailroom_status));
    return Array.from(s);
  }, [rows]);

  const lockerStatuses = useMemo(() => {
    const s = new Set<string>();
    (rows ?? []).forEach((r) => r.locker_status && s.add(r.locker_status));
    return Array.from(s);
  }, [rows]);

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
        if (filters.lockerStatus && r.locker_status !== filters.lockerStatus)
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
          const locker_status = r.locker_status ?? null;
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
            locker_status,
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

  return (
    <Stack gap="lg">
      {/* Header */}
      <Box>
        <Text weight={700} size="xl">
          Mailroom Service List
        </Text>
      </Box>

      {/* Search + Filters + Actions */}
      <Group align="apart" align="center" spacing="sm">
        <Group gap="sm" style={{ flex: 1 }}>
          <TextInput
            placeholder="Search by name, plan or location..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 280 }}
          />
          <Tooltip label="Advanced filters">
            <Button
              variant="outline"
              leftSection={<IconSettings size={16} />}
              onClick={() => setAdvancedOpen(true)}
            >
              Advanced Filter
            </Button>
          </Tooltip>
          <Space w="sm" />
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="default"
            onClick={refresh}
          >
            Refresh
          </Button>
        </Group>
        <Button variant="outline">Export</Button>
      </Group>

      <Divider />

      {/* Table */}
      <Box
        style={{
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.06)",
          background: "white",
          overflow: "hidden",
        }}
      >
        <Table verticalSpacing="sm" highlightOnHover>
          <thead>
            <tr>
              {visibleColumns.name && <th>Name</th>}
              {visibleColumns.plan && (
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("plan")}
                >
                  Plan{" "}
                  {sortBy === "plan" ? (sortDir === "asc" ? "▲" : "▼") : null}
                </th>
              )}
              {visibleColumns.location && (
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("location")}
                >
                  Location{" "}
                  {sortBy === "location"
                    ? sortDir === "asc"
                      ? "▲"
                      : "▼"
                    : null}
                </th>
              )}
              {visibleColumns.created_at && (
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("created_at")}
                >
                  Date Created{" "}
                  {sortBy === "created_at"
                    ? sortDir === "asc"
                      ? "▲"
                      : "▼"
                    : null}
                </th>
              )}
              {visibleColumns.expiry_at && (
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("expiry_at")}
                >
                  Date Expiry{" "}
                  {sortBy === "expiry_at"
                    ? sortDir === "asc"
                      ? "▲"
                      : "▼"
                    : null}
                </th>
              )}
              {visibleColumns.mailroom_status && <th>Mailroom Status</th>}
              {visibleColumns.locker_status && (
                <th
                  style={{ cursor: "pointer" }}
                  onClick={() => toggleSort("locker_status")}
                >
                  Locker Status{" "}
                  {sortBy === "locker_status"
                    ? sortDir === "asc"
                      ? "▲"
                      : "▼"
                    : null}
                </th>
              )}
              {visibleColumns.view && <th>View</th>}
            </tr>
          </thead>

          <tbody>
            {loading || rows === null ? (
              <tr>
                <td colSpan={8}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Loader />
                  </Box>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text color="red">{error}</Text>
                  </Box>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text color="dimmed">No results</Text>
                  </Box>
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  {visibleColumns.name && <td>{r.name}</td>}
                  {visibleColumns.plan && <td>{r.plan ?? "—"}</td>}
                  {visibleColumns.location && <td>{r.location ?? "—"}</td>}
                  {visibleColumns.created_at && (
                    <td>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  )}
                  {visibleColumns.expiry_at && (
                    <td>
                      {r.expiry_at
                        ? new Date(r.expiry_at).toLocaleDateString()
                        : "—"}
                    </td>
                  )}
                  {visibleColumns.mailroom_status && (
                    <td>
                      {r.mailroom_status ? (
                        (() => {
                          const s = String(r.mailroom_status).toUpperCase();
                          const color =
                            s === "ACTIVE"
                              ? "green"
                              : s === "EXPIRING"
                              ? "yellow"
                              : "gray";
                          return <Badge color={color}>{s}</Badge>;
                        })()
                      ) : (
                        <Text color="dimmed">—</Text>
                      )}
                    </td>
                  )}
                  {visibleColumns.locker_status && (
                    <td>
                      {r.locker_status ? (
                        <Badge color="gray">{r.locker_status}</Badge>
                      ) : (
                        <Text color="dimmed">—</Text>
                      )}
                    </td>
                  )}
                  {visibleColumns.view && (
                    <td>
                      <Group gap="xs">
                        <Link
                          href={`/mailroom/${r.id}`}
                          style={{ textDecoration: "none" }}
                        >
                          <Button
                            size="xs"
                            variant="subtle"
                            leftSection={<IconEye size={14} />}
                          >
                            View
                          </Button>
                        </Link>
                      </Group>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Box>
    </Stack>
  );
}
