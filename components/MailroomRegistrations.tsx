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
  phone_number?: string;
  created_at: string;
  months: number;
  locker_qty: number;
  location_id: string;
  plan_id: string;
  mailroom_status: boolean;
  location_name?: string;
  plan_name?: string;
};

// Add Plan Interface
type Plan = {
  id: string;
  name: string;
  months: number;
};

type Locker = {
  id: string;
  locker_code: string;
  is_available: boolean;
  location_id?: string;
};

type AssignedLocker = {
  id: string;
  registration_id: string;
  locker_id: string;
  status?: "Empty" | "Normal" | "Near Full" | "Full";
};

export default function MailroomRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<
    Array<{ id: string; name: string; city?: string }>
  >([]); // ADDED: store locations
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
    return res.json().catch(() => ({}));
  };

  const { data: combinedData, isValidating } = useSWR(combinedKey, fetcher, {
    revalidateOnFocus: true,
  });

  // Sync SWR combined response into local state
  useEffect(() => {
    setLoading(!!isValidating);
    const payload = combinedData ?? {};

    // normalize registrations: map `mobile` from API to `phone_number` used by UI
    const rawRegs = Array.isArray(payload.registrations)
      ? payload.registrations
      : [];
    const normalizedRegs = rawRegs.map(
      (r: {
        mobile?: string;
        phone?: string;
        phone_number?: string;
        [key: string]: unknown;
      }) => ({
        ...r,
        phone_number: r.mobile ?? r.phone ?? r.phone_number ?? null,
        // keep backward-compatible plan/location fields if the server returned nested relations
        plan_id: r.plan_id ?? r.plan?.id ?? null,
        plan_name: r.plan_name ?? r.plan?.name ?? null,
        location_id: r.location_id ?? r.location?.id ?? null,
        location_name: r.location_name ?? r.location?.name ?? null,
      }),
    );
    setRegistrations(normalizedRegs);

    setLockers(Array.isArray(payload.lockers) ? payload.lockers : []);
    setAssignments(
      Array.isArray(payload.assignedLockers) ? payload.assignedLockers : [],
    );
    setPlans(Array.isArray(payload.plans) ? payload.plans : []);
    setLocations(Array.isArray(payload.locations) ? payload.locations : []);
  }, [combinedData, isValidating]);

  // Initial cron run and seed by revalidating SWR
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        await fetch("/api/admin/mailroom/cron", { method: "POST" });
      } catch (e) {
        console.error("Auto-sync failed", e);
      } finally {
        // revalidate all keys
        await Promise.all([swrMutate(combinedKey)]);
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
    setSelectedLockerId(currentAssignment ? currentAssignment.locker_id : null);
    openLockerModal();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
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
          await fetch(`/api/admin/mailroom/assigned-lockers/${current.id}`, {
            method: "DELETE",
          });
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
      }

      notifications.show({
        title: "Success",
        message: "Locker assignment updated",
        color: "green",
      });
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
      if (!res.ok) throw new Error("Failed to update statuses");

      notifications.show({
        title: "Success",
        message: "Subscription statuses updated successfully",
        color: "green",
      });
      await refreshAll(); // Reload the table data via SWR
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to update statuses",
        color: "red",
      });
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
      (r.mailroom_code && r.mailroom_code.toLowerCase().includes(q)); // <--- Add Search by Code

    const isActive = isRegistrationActive(r);

    // Tab Logic
    let matchesTab = true;
    if (activeTab === "active") matchesTab = isActive;
    if (activeTab === "inactive") matchesTab = !isActive;
    // if activeTab === "all", matchesTab remains true

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
      // Fix: Look up the locker from the 'lockers' state array using the ID reference
      const foundLocker = lockers.find((l) => l.id === a.locker_id);
      const code = foundLocker ? foundLocker.locker_code : "Unknown";

      return {
        code,
        assignmentId: a.id,
        status: a.status || "Unknown",
      };
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
            // NEW COLUMN: Mailroom Code
            {
              accessor: "mailroom_code",
              title: "Mailroom Code",
              width: 140,
              render: (r) =>
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
              render: (r) => (
                <Group gap="sm">
                  <Avatar color="blue" radius="xl">
                    {r.full_name.charAt(0)}
                  </Avatar>
                  <Stack gap={0}>
                    {/* Removed Badge from here */}
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
              render: (r) => {
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
              render: (r) => {
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
              render: (r) => {
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
              render: (r) => (
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
            {/* User Info Section */}
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

            {/* Locker List */}
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

            {/* Add Locker Section */}
            <Group align="flex-end" grow>
              <Select
                label="Assign New Locker"
                placeholder="Select available locker"
                searchable
                clearable
                data={lockers
                  .filter((l) => l.is_available)
                  .map((l) => ({
                    value: l.id,
                    label: l.locker_code,
                  }))}
                value={selectedLockerId}
                onChange={setSelectedLockerId}
              />
              <Button
                color="violet"
                disabled={!selectedLockerId}
                loading={submitting}
                onClick={async () => {
                  if (!selectedLockerId) return;
                  setSubmitting(true);
                  try {
                    const res = await fetch(
                      "/api/admin/mailroom/assigned-lockers",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          registration_id: selectedUser.id,
                          locker_id: selectedLockerId,
                        }),
                      },
                    );
                    if (!res.ok) throw new Error("Failed");

                    notifications.show({
                      title: "Success",
                      message: "Locker assigned",
                      color: "green",
                    });
                    setSelectedLockerId(null);
                    await refreshAll();
                  } catch {
                    notifications.show({
                      title: "Error",
                      message: "Failed to assign",
                      color: "red",
                    });
                  } finally {
                    setSubmitting(false);
                  }
                }}
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
