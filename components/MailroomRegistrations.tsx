"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  TextInput,
  Text,
  Tooltip,
  Avatar,
  Divider,
  Grid,
  Table,
  Tabs,
} from "@mantine/core";
import {
  IconSearch,
  IconKey,
  IconMail,
  IconMapPin,
  IconCalendar,
  IconInfoCircle,
  IconPhone,
  IconRefresh,
  IconUsers,
  IconUserCheck,
  IconUserOff,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";

type Registration = {
  id: string;
  mailroom_code: string | null;
  full_name: string;
  email: string;
  phone_number?: string | null;
  created_at: string;
  months: number;
  locker_qty: number;
  location_id: string | null;
  plan_id: string | null;
  mailroom_status: boolean;
  location_name?: string | null;
  plan_name?: string | null;
};

type Plan = {
  id: string;
  name: string;
  price?: number;
};

type Locker = {
  id: string;
  locker_code: string;
  is_available: boolean;
  location_id?: string | null;
};

type AssignedLocker = {
  id: string;
  registration_id: string;
  locker_id: string;
  status?: "Empty" | "Normal" | "Near Full" | "Full" | string;
};

type Location = {
  id: string;
  name: string;
  region?: string | null;
  city?: string | null;
  barangay?: string | null;
  zip?: string | null;
  total_lockers?: number;
};

export default function MailroomRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [assignments, setAssignments] = useState<AssignedLocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [lockerModalOpen, { open: openLockerModal, close: closeLockerModal }] =
    useDisclosure(false);
  const [selectedUser, setSelectedUser] = useState<Registration | null>(null);
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  // NEW: Tab State
  const [activeTab, setActiveTab] = useState<string | null>("all");

  // --- SWR keys & fetcher ---
  const combinedKey = "/api/admin/mailroom/registrations";
  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Failed to fetch ${url}`);
    }
    return res.json().catch(() => ({}) as Record<string, unknown>);
  };

  const { data: combinedData, isValidating } = useSWR<
    Record<string, unknown> | undefined
  >(combinedKey, fetcher, { revalidateOnFocus: true, dedupingInterval: 2000 });

  // small helpers
  const toStr = (v: unknown): string => (v == null ? "" : String(v));
  const toNullableStr = (v: unknown): string | null =>
    v == null ? null : String(v);
  const toBool = (v: unknown): boolean => Boolean(v);
  const toNum = (v: unknown): number =>
    v == null ? 0 : Number(v as number | string);

  // Sync SWR combined response into local state
  useEffect(() => {
    setLoading(!!isValidating);
    const payload = combinedData ?? ({} as Record<string, unknown>);

    let rawRegs: unknown[] = [];
    if (Array.isArray(payload.registrations)) {
      rawRegs = payload.registrations as unknown[];
    }

    const normalizedRegs: Registration[] = (
      rawRegs as Record<string, unknown>[]
    ).map((r) => {
      const row = r ?? ({} as Record<string, unknown>);
      const mobile =
        row.mobile ?? row.phone ?? row.phone_number ?? (null as string | null);

      let planId: unknown = null;
      if (row.plan_id != null) planId = row.plan_id;
      else if ((row.plan as Record<string, unknown>)?.id != null)
        planId = (row.plan as Record<string, unknown>).id;

      let planName: unknown = null;
      if (row.plan_name != null) planName = row.plan_name;
      else if ((row.plan as Record<string, unknown>)?.name != null)
        planName = (row.plan as Record<string, unknown>).name;

      let locationId: unknown = null;
      if (row.location_id != null) locationId = row.location_id;
      else if ((row.location as Record<string, unknown>)?.id != null)
        locationId = (row.location as Record<string, unknown>).id;

      const createdAt = toStr(
        row.created_at ?? row.mailroom_registration_created_at,
      );

      const out: Registration = {
        id: String(row.id ?? row.mailroom_registration_id ?? ""),
        mailroom_code: toNullableStr(
          row.mailroom_code ?? row.mailroom_registration_code,
        ),
        full_name: toStr(
          row.full_name ??
            ((row.kyc as Record<string, unknown>)?.user_kyc_first_name
              ? `${String((row.kyc as Record<string, unknown>).user_kyc_first_name ?? "")} ${String((row.kyc as Record<string, unknown>).user_kyc_last_name ?? "")}`
              : (row.email ??
                (row.user as Record<string, unknown>)?.users_email ??
                "")),
        ),
        email: toStr(
          (row.user as Record<string, unknown>)?.users_email ?? row.email ?? "",
        ),
        phone_number: mobile == null ? null : String(mobile),
        created_at: createdAt,
        months: toNum((row.months ?? 0) as unknown),
        locker_qty: Number(row.locker_qty ?? row.mailbox_count ?? 0),
        location_id: locationId == null ? null : String(locationId),
        plan_id: planId == null ? null : String(planId),
        mailroom_status: toBool(
          row.mailroom_status ?? row.mailroom_registration_status ?? true,
        ),
        location_name: toNullableStr(
          row.location_name ?? (row.location as Record<string, unknown>)?.name,
        ),
        plan_name: planName == null ? undefined : String(planName),
      };

      return out;
    });

    setRegistrations(normalizedRegs);

    // lockes mapping
    const rawLockers = Array.isArray(payload.lockers) ? payload.lockers : [];
    const normalizedLockers: Locker[] = (
      rawLockers as Record<string, unknown>[]
    ).map((l) => {
      const row = l ?? ({} as Record<string, unknown>);
      let locationId: string | undefined = undefined;
      if (row.location_id != null) locationId = String(row.location_id);
      else if (row.mailroom_location_id != null)
        locationId = String(row.mailroom_location_id);

      return {
        id: String(row.id ?? row.location_locker_id ?? ""),
        locker_code: String(row.locker_code ?? row.location_locker_code ?? ""),
        is_available: Boolean(
          row.is_available ?? row.location_locker_is_available ?? true,
        ),
        location_id: locationId,
      };
    });
    setLockers(normalizedLockers);

    // assignments mapping
    const rawAssign = Array.isArray(payload.assignedLockers)
      ? payload.assignedLockers
      : [];
    const normalizedAssign: AssignedLocker[] = (
      rawAssign as Record<string, unknown>[]
    ).map((a) => {
      const row = a ?? ({} as Record<string, unknown>);
      return {
        id: String(row.id ?? row.mailroom_assigned_locker_id ?? ""),
        registration_id: String(
          row.registration_id ?? row.mailroom_registration_id ?? "",
        ),
        locker_id: String(row.locker_id ?? row.location_locker_id ?? ""),
        status: (row.status ?? row.mailroom_assigned_locker_status) as
          | AssignedLocker["status"]
          | string,
      };
    });
    setAssignments(normalizedAssign);

    // plans mapping
    const rawPlans = Array.isArray(payload.plans) ? payload.plans : [];
    const normalizedPlans: Plan[] = (rawPlans as Record<string, unknown>[]).map(
      (p) => {
        const row = p ?? ({} as Record<string, unknown>);
        let price: number | undefined = undefined;
        if (row.price != null) {
          price = Number(row.price ?? row.mailroom_plan_price ?? 0);
        }
        return {
          id: String(row.id ?? row.mailroom_plan_id ?? ""),
          name: String(row.name ?? row.mailroom_plan_name ?? ""),
          price,
        };
      },
    );
    setPlans(normalizedPlans);

    // locations mapping
    const rawLocations = Array.isArray(payload.locations)
      ? payload.locations
      : [];
    const normalizedLocations: Location[] = (
      rawLocations as Record<string, unknown>[]
    ).map((loc) => {
      const row = loc ?? ({} as Record<string, unknown>);
      const region =
        row.region != null
          ? (row.region as string)
          : ((row.mailroom_location_region as string | null) ?? null);
      const city =
        row.city != null
          ? (row.city as string)
          : ((row.mailroom_location_city as string | null) ?? null);
      const barangay =
        row.barangay != null
          ? (row.barangay as string)
          : ((row.mailroom_location_barangay as string | null) ?? null);
      const zip =
        row.zip != null
          ? (row.zip as string)
          : ((row.mailroom_location_zip as string | null) ?? null);
      const totalLockers = Number(
        row.total_lockers ?? row.mailroom_location_total_lockers ?? 0,
      );

      return {
        id: String(row.id ?? row.mailroom_location_id ?? ""),
        name: String(row.name ?? row.mailroom_location_name ?? ""),
        region,
        city,
        barangay,
        zip,
        total_lockers: totalLockers,
      };
    });
    setLocations(normalizedLocations);
  }, [combinedData, isValidating]);

  // Initial cron run and seed by revalidating SWR
  useEffect(() => {
    const initRan = { current: false } as { current: boolean };
    if (initRan.current) return;
    initRan.current = true;
    const init = async () => {
      setLoading(true);
      try {
        // cron disabled
      } finally {
        // avoid forced mutate to prevent extra fetchs; rely on SWR's initial fetch/deduping
        setLoading(false);
      }
    };
    void init();
  }, []);

  // convenience refresh function used after mutations (only refresh combined key)
  const refreshAll = async () => {
    setLoading(true);
    try {
      await swrMutate(combinedKey);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when tab changes
  useEffect(() => {
    setPage(1);
  }, [activeTab, search]);

  const handleOpenLockerModal = (user: Registration) => {
    setSelectedUser(user);
    const currentAssignment = assignments.find(
      (a) => a.registration_id === user.id,
    );
    if (currentAssignment) {
      setSelectedLockerId(currentAssignment.locker_id);
    } else {
      setSelectedLockerId(null);
    }
    openLockerModal();
  };

   
  const handleSaveAssignment = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    try {
      if (!selectedLockerId) {
        // Unassign
        const current = assignments.find(
          (a) => a.registration_id === selectedUser.id,
        );
        if (current) {
          const res = await fetch(
            `/api/admin/mailroom/assigned-lockers/${current.id}`,
            { method: "DELETE" },
          );
          if (!res.ok) throw new Error("Failed to unassign locker");
          // optimistic local update
          setAssignments((prev) => prev.filter((a) => a.id !== current.id));
          setLockers((prev) =>
            prev.map((l) =>
              l.id === current.locker_id ? { ...l, is_available: true } : l,
            ),
          );
        }
      } else {
        // Assign
        const res = await fetch("/api/admin/mailroom/assigned-lockers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            registration_id: selectedUser.id,
            locker_id: selectedLockerId,
          }),
        });
        if (!res.ok) throw new Error("Failed to assign locker");

        const payload = await res
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        const created = (payload.data ?? payload) as Record<string, unknown>;

        const newAssignment: AssignedLocker = {
          id: String(
            created.id ??
              created.mailroom_assigned_locker_id ??
              Math.random().toString(36).slice(2),
          ),
          registration_id: selectedUser.id,
          locker_id: selectedLockerId,
          status: String(
            created.status ??
              created.mailroom_assigned_locker_status ??
              "Empty",
          ),
        };

        // optimistic local update
        setAssignments((prev) => [...prev, newAssignment]);
        setLockers((prev) =>
          prev.map((l) =>
            l.id === selectedLockerId ? { ...l, is_available: false } : l,
          ),
        );
        setSelectedLockerId(null);
      }

      notifications.show({
        title: "Success",
        message: "Locker assignment updated",
        color: "green",
      });

      // close and revalidate (keeps UI consistent if server returned other fields)
      closeLockerModal();
      await refreshAll();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to update assignment",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Add this function to handle the manual trigger
  const handleRefreshStatus = async () => {
    setRefreshingStatus(true);
    try {
      const res = await fetch("/api/admin/mailroom/cron", { method: "POST" });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to run cron");
      }
      await refreshAll();
      notifications.show({
        title: "Success",
        message: "Subscription statuses updated",
        color: "green",
      });
    } catch (error) {
      console.error(error);
      const msg =
        error instanceof Error ? error.message : "Failed to update statuses";
      notifications.show({ title: "Error", message: msg, color: "red" });
    } finally {
      setRefreshingStatus(false);
    }
  };

  // Helper to determine active status
  const isRegistrationActive = (r: Registration) => {
    if (r.mailroom_status !== null && r.mailroom_status !== undefined) {
      return r.mailroom_status;
    }
    const expiresAt = dayjs(r.created_at).add(r.months, "month");
    return !dayjs().isAfter(expiresAt);
  };

  // Filter logic
  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase();
    const matchesSearch =
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      (r.mailroom_code && r.mailroom_code.toLowerCase().includes(q));

    const isActive = isRegistrationActive(r);

    // Tab Logic
    let matchesTab = true;
    if (activeTab === "active") matchesTab = isActive;
    if (activeTab === "inactive") matchesTab = !isActive;

    return matchesSearch && matchesTab;
  });

  const paginatedRegistrations = filteredRegistrations.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  // Helper to get ALL assigned locker codes for a user
  const getAssignedLockers = (regId: string) => {
    const userAssignments = assignments.filter(
      (a) => a.registration_id === regId,
    );

    return userAssignments.map((a) => {
      const foundLocker = lockers.find((l) => l.id === a.locker_id);
      let code = "Unknown";
      if (foundLocker) code = foundLocker.locker_code;
      let status = "Empty";
      if (a.status) status = a.status;
      return { code, assignmentId: a.id, status };
    });
  };

  // Helper to get plan name
  const getPlanName = (r: Registration) => {
    if (r.plan_name) return r.plan_name;
    const foundPlan = plans.find((p) => p.id === r.plan_id);
    return foundPlan ? foundPlan.name : `${r.months} Month Plan`;
  };

  return (
    <Stack align="center">
      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <Group>
            <TextInput
              placeholder="Search users..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 300 }}
            />
            <Tooltip label="Force check for expired subscriptions">
              <Button
                variant="light"
                color="orange"
                onClick={handleRefreshStatus}
                loading={refreshingStatus}
                leftSection={<IconRefresh size={16} />}
              >
                Sync Statuses
              </Button>
            </Tooltip>
          </Group>
          <Badge size="lg" variant="light">
            {registrations.length} Registered Users
          </Badge>
        </Group>

        {/* NEW: Tabs Component */}
        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<IconUsers size={16} />}>
              All Users
            </Tabs.Tab>
            <Tabs.Tab value="active" leftSection={<IconUserCheck size={16} />}>
              Active
            </Tabs.Tab>
            <Tabs.Tab value="inactive" leftSection={<IconUserOff size={16} />}>
              Inactive
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginatedRegistrations}
          fetching={loading}
          minHeight={200}
          totalRecords={filteredRegistrations.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={setPage}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={setPageSize}
          columns={[
            {
              accessor: "mailroom_code",
              title: "Mailroom Code",
              width: 140,
              render: (r: Registration) =>
                r.mailroom_code ? (
                  <Badge
                    size="md"
                    variant="light"
                    color="violet"
                    radius="sm"
                    style={{ textTransform: "none", fontSize: "13px" }}
                  >
                    {r.mailroom_code}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed" fs="italic">
                    Pending
                  </Text>
                ),
            },
            {
              accessor: "full_name",
              title: "User Details",
              width: 250,
              render: (r: Registration) => (
                <Group gap="sm">
                  <Avatar color="blue" radius="xl">
                    {r.full_name.charAt(0)}
                  </Avatar>
                  <Stack gap={0}>
                    <Text size="sm" fw={500}>
                      {r.full_name}
                    </Text>
                    <Group gap={4}>
                      <IconMail size={12} color="gray" />
                      <Text size="xs" c="dimmed">
                        {r.email}
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              ),
            },
            {
              accessor: "status",
              title: "Status",
              width: 120,
              render: (r: Registration) => {
                const isActive = isRegistrationActive(r);
                return (
                  <Badge color={isActive ? "green" : "red"} variant="light">
                    {isActive ? "Active" : "Inactive"}
                  </Badge>
                );
              },
            },
            {
              accessor: "subscription",
              title: "Subscription",
              width: 200,
              render: (r: Registration) => {
                const expiresAt = dayjs(r.created_at).add(r.months, "month");
                const isExpired = dayjs().isAfter(expiresAt);

                return (
                  <Stack gap={2}>
                    <Text size="sm" fw={500}>
                      {getPlanName(r)}
                    </Text>
                    <Group gap={4}>
                      <IconCalendar
                        size={14}
                        color={isExpired ? "red" : "gray"}
                      />
                      <Text size="xs" c={isExpired ? "red" : "dimmed"}>
                        Expires: {expiresAt.format("MMM D, YYYY")}
                      </Text>
                    </Group>
                  </Stack>
                );
              },
            },
            {
              accessor: "location",
              title: "Location",
              render: (r: Registration) => {
                const found = locations.find((l) => l.id === r.location_id);
                const name = r.location_name || found?.name || "Main Branch";
                return (
                  <Group gap={4}>
                    <IconMapPin size={14} color="gray" />
                    <Text size="sm">{name}</Text>
                  </Group>
                );
              },
            },
            {
              accessor: "actions",
              title: "Actions",
              width: 160,
              textAlign: "right",
              render: (r: Registration) => (
                <Group gap="xs" justify="flex-end">
                  <Button
                    size="compact-xs"
                    variant="light"
                    color="blue"
                    leftSection={<IconInfoCircle size={14} />}
                    onClick={() => handleOpenLockerModal(r)}
                  >
                    View Details
                  </Button>
                </Group>
              ),
            },
          ]}
          noRecordsText="No registrations found"
        />
      </Paper>

      {/* Locker Management Modal */}
      <Modal
        opened={lockerModalOpen}
        onClose={closeLockerModal}
        title={
          <Group>
            <IconInfoCircle size={20} />
            <Text fw={600}>Registration Details</Text>
          </Group>
        }
        size="lg"
        centered
      >
        {selectedUser && (
          <Stack gap="md">
            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Grid>
                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Contact Information
                  </Text>
                  <Text fw={500} size="lg" mt={4}>
                    {selectedUser.full_name}
                  </Text>

                  <Stack gap={4} mt="xs">
                    <Group gap={8}>
                      <IconMail size={16} color="gray" />
                      <Text size="sm">{selectedUser.email}</Text>
                    </Group>
                    {selectedUser.phone_number ? (
                      <Group gap={8}>
                        <IconPhone size={16} color="gray" />
                        <Text size="sm">{selectedUser.phone_number}</Text>
                      </Group>
                    ) : (
                      <Text size="sm" c="dimmed" fs="italic">
                        No phone number provided
                      </Text>
                    )}
                  </Stack>
                </Grid.Col>

                <Grid.Col span={6}>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Plan Details
                  </Text>
                  <Stack gap={4} mt="xs">
                    <Text size="sm">
                      <Text span fw={500}>
                        Duration:
                      </Text>{" "}
                      {selectedUser.months} Months
                    </Text>
                    <Text size="sm">
                      <Text span fw={500}>
                        Locker Qty:
                      </Text>{" "}
                      {selectedUser.locker_qty}
                    </Text>

                    {(() => {
                      const foundLoc = locations.find(
                        (l) => l.id === selectedUser.location_id,
                      );
                      return (
                        <div>
                          <Text size="sm">
                            <Text span fw={500}>
                              Location:
                            </Text>{" "}
                            {foundLoc?.name ??
                              selectedUser.location_name ??
                              "Main Branch"}
                          </Text>
                          {foundLoc && (
                            <Text size="xs" c="dimmed" mt={4}>
                              {foundLoc.barangay
                                ? `${foundLoc.barangay}, `
                                : ""}
                              {foundLoc.city}
                              {foundLoc.region ? ` • ${foundLoc.region}` : ""}
                              {foundLoc.zip ? ` • ${foundLoc.zip}` : ""}
                            </Text>
                          )}
                        </div>
                      );
                    })()}
                  </Stack>
                </Grid.Col>
              </Grid>
            </Paper>

            <Divider label="Locker Management" labelPosition="center" />

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Assigned Lockers:
              </Text>
              {getAssignedLockers(selectedUser.id).length > 0 ? (
                <Table withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Locker Code</Table.Th>
                      <Table.Th>Capacity Status</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {getAssignedLockers(selectedUser.id).map((l) => (
                      <Table.Tr key={l.assignmentId}>
                        <Table.Td>
                          <Badge
                            variant="filled"
                            color="blue"
                            leftSection={<IconKey size={12} />}
                          >
                            {l.code}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={(() => {
                              if (l.status === "Full") return "red";
                              if (l.status === "Near Full") return "orange";
                              if (l.status === "Empty") return "gray";
                              return "blue";
                            })()}
                          >
                            {l.status}
                          </Badge>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              ) : (
                <Paper p="sm" withBorder bg="var(--mantine-color-gray-0)">
                  <Text size="sm" c="dimmed" ta="center">
                    No lockers assigned yet.
                  </Text>
                </Paper>
              )}
            </Stack>

            <Group align="flex-end" grow>
              <Select
                label="Assign New Locker"
                placeholder="Select available locker"
                searchable
                clearable
                data={lockers
                  .filter((l) => l.is_available)
                  .map((l) => ({ value: l.id, label: l.locker_code }))}
                value={selectedLockerId}
                onChange={setSelectedLockerId}
              />
              <Button
                color="violet"
                disabled={!selectedLockerId}
                loading={submitting}
                onClick={handleSaveAssignment}
                style={{ maxWidth: 120 }}
              >
                Add
              </Button>
            </Group>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={closeLockerModal}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
