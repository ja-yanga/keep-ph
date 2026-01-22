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
  Skeleton,
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
import dynamic from "next/dynamic";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";
import dayjs from "dayjs";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";

const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <Stack gap="md" p="xl">
        <Skeleton height={40} />
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </Stack>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;

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
  is_active?: boolean;
  location_name?: string | null;
  plan_name?: string | null;
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
  const isMobile = useMediaQuery("(max-width: 768px)");

  // Tab state (must always be a valid tab value to keep ARIA correct)
  const [activeTab, setActiveTab] = useState<string>("all");

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

  const { data: combinedData, isLoading: isSWRLoading } = useSWR<
    Record<string, unknown> | undefined
  >(combinedKey, fetcher, { revalidateOnFocus: true, dedupingInterval: 2000 });

  // Sync SWR combined response into local state
  useEffect(() => {
    if (combinedData) {
      setRegistrations((combinedData.registrations as Registration[]) || []);
      setLockers((combinedData.lockers as Locker[]) || []);
      setAssignments((combinedData.assignedLockers as AssignedLocker[]) || []);
      setLocations((combinedData.locations as Location[]) || []);
    }
    setLoading(isSWRLoading);
  }, [combinedData, isSWRLoading]);

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

  const matchesSearch = (r: Registration, q: string) =>
    r.full_name.toLowerCase().includes(q) ||
    r.email.toLowerCase().includes(q) ||
    (r.mailroom_code && r.mailroom_code.toLowerCase().includes(q));

  // Filter logic (memoized to reduce main-thread work)
  const filteredRegistrations = React.useMemo(() => {
    const q = search.toLowerCase();
    const tab = (activeTab as "all" | "active" | "inactive") ?? "all";
    return registrations.filter((r) => {
      if (!matchesSearch(r, q)) return false;
      if (tab === "active") return !!r.is_active;
      if (tab === "inactive") return !r.is_active;
      return true;
    });
  }, [registrations, search, activeTab]);

  const paginatedRegistrations = React.useMemo(() => {
    return filteredRegistrations.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredRegistrations, page, pageSize]);

  // Memoize DataTable columns to prevent forced reflows caused by re-renders
  const tableColumns: DataTableColumn<Registration>[] = React.useMemo(
    () => [
      {
        accessor: "mailroom_code",
        title: "Mailroom Code",
        width: 140,
        render: (r: Registration) =>
          r.mailroom_code ? (
            <Badge
              size="md"
              variant="filled"
              color="violet.9"
              radius="sm"
              styles={{ root: { textTransform: "none", fontSize: "13px" } }}
            >
              {r.mailroom_code}
            </Badge>
          ) : (
            <Text size="sm" c="#4A5568" fs="italic">
              Pending
            </Text>
          ),
      },
      {
        accessor: "full_name",
        title: "User Details",
        render: (r: Registration) => (
          <Group gap="sm" wrap="nowrap">
            <Avatar color="blue" radius="xl" size="sm">
              {r.full_name.charAt(0)}
            </Avatar>
            <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={500} truncate>
                {r.full_name}
              </Text>
              <Group gap={4} wrap="nowrap">
                <IconMail size={12} style={{ flexShrink: 0 }} color="gray" />
                <Text size="xs" c="#4A5568" truncate>
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
        render: (r: Registration) => (
          <Badge color={r.is_active ? "green.9" : "red.9"} variant="filled">
            {r.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessor: "subscription",
        title: "Subscription",
        width: 200,
        render: (r: Registration) => {
          const expiresAt = dayjs(r.created_at).add(r.months, "month");
          const isExpired = dayjs().isAfter(expiresAt);

          const planName = r.plan_name || `${r.months} Month Plan`;

          return (
            <Stack gap={2}>
              <Text size="sm" fw={500} truncate>
                {planName}
              </Text>
              <Group gap={4} wrap="nowrap">
                <IconCalendar
                  size={14}
                  style={{ flexShrink: 0 }}
                  color={isExpired ? "red" : "gray"}
                />
                <Text size="xs" c={isExpired ? "red" : "#4A5568"}>
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
        width: 200,
        render: (r: Registration) => {
          const name = r.location_name || "Main Branch";
          return (
            <Group gap={4} wrap="nowrap">
              <IconMapPin size={14} style={{ flexShrink: 0 }} color="gray" />
              <Text size="sm" truncate>
                {name}
              </Text>
            </Group>
          );
        },
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 120,
        textAlign: "right" as const,
        render: (r: Registration) => (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Button
              size="compact-xs"
              variant="filled"
              color="blue.9"
              leftSection={<IconInfoCircle size={14} aria-hidden="true" />}
              onClick={() => handleOpenLockerModal(r)}
            >
              View Details
            </Button>
          </Group>
        ),
      },
    ],
    [],
  );

  // Helper to get ALL assigned locker codes for a user (memoized for current user)
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

  return (
    <Stack align="center" gap="lg" w="100%">
      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
        {isMobile ? (
          <Stack mb="md">
            <TextInput
              placeholder="Search users..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Group grow>
              <Tooltip label="Force check for expired subscriptions">
                <Button
                  variant="filled"
                  color="orange.9"
                  onClick={handleRefreshStatus}
                  loading={refreshingStatus}
                  leftSection={<IconRefresh size={16} />}
                >
                  Sync Statuses
                </Button>
              </Tooltip>
            </Group>
          </Stack>
        ) : (
          <Group
            justify="space-between"
            mb="md"
            gap="xs"
            align="center"
            wrap="nowrap"
          >
            <Group style={{ flex: 1 }} gap="xs" wrap="nowrap">
              <TextInput
                placeholder="Search users..."
                leftSection={<IconSearch size={16} />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Tooltip label="Force check for expired subscriptions">
                <Button
                  variant="filled"
                  color="orange.9"
                  onClick={handleRefreshStatus}
                  loading={refreshingStatus}
                  leftSection={<IconRefresh size={16} />}
                >
                  Sync Statuses
                </Button>
              </Tooltip>
            </Group>
            <Badge
              size="lg"
              variant="filled"
              color="violet.9"
              style={{ flexShrink: 0 }}
            >
              {registrations.length} Registered Users
            </Badge>
          </Group>
        )}

        {/* NEW: Tabs Component */}
        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value || "all")}
          mb="md"
          aria-label="User filter tabs"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="all"
              leftSection={<IconUsers size={16} aria-hidden="true" />}
            >
              All Users
            </Tabs.Tab>
            <Tabs.Tab
              value="active"
              leftSection={<IconUserCheck size={16} aria-hidden="true" />}
            >
              Active
            </Tabs.Tab>
            <Tabs.Tab
              value="inactive"
              leftSection={<IconUserOff size={16} aria-hidden="true" />}
            >
              Inactive
            </Tabs.Tab>
          </Tabs.List>
          {(["all", "active", "inactive"] as const).map((tab) => (
            <Tabs.Panel key={tab} value={tab}>
              {tab === activeTab && (
                <div
                  style={{
                    marginTop: "1rem",
                    contentVisibility: "auto",
                    containIntrinsicSize: "400px",
                  }}
                >
                  <DataTable<Registration>
                    aria-label="Registrations list"
                    withTableBorder={false}
                    borderRadius="lg"
                    striped
                    verticalSpacing="md"
                    highlightOnHover
                    records={paginatedRegistrations}
                    fetching={loading}
                    minHeight={minTableHeight(pageSize)}
                    totalRecords={filteredRegistrations.length}
                    recordsPerPage={pageSize}
                    page={page}
                    onPageChange={setPage}
                    recordsPerPageOptions={[10, 20, 50]}
                    onRecordsPerPageChange={setPageSize}
                    columns={tableColumns}
                    noRecordsText="No registrations found"
                  />
                </div>
              )}
            </Tabs.Panel>
          ))}
        </Tabs>
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
                  <Text size="xs" c="#4A5568" tt="uppercase" fw={700}>
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
                      <Text size="sm" c="#4A5568" fs="italic">
                        No phone number provided
                      </Text>
                    )}
                  </Stack>
                </Grid.Col>

                <Grid.Col span={6}>
                  <Text size="xs" c="#4A5568" tt="uppercase" fw={700}>
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
                            <Text size="xs" c="#4A5568" mt={4}>
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
                            variant="filled"
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
                  <Text size="sm" c="#4A5568" ta="center">
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

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
