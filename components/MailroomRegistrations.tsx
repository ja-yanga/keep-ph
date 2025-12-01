"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import {
  ActionIcon,
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
} from "@mantine/core";
import {
  IconSearch,
  IconLock,
  IconKey,
  IconMail,
  IconMapPin,
  IconCalendar,
  IconTrash,
  IconInfoCircle,
  IconPhone,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";
import { useDisclosure } from "@mantine/hooks";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  created_at: string;
  // New fields from schema
  months: number;
  locker_qty: number;
  location_id: string;
  plan_id: string;
  // Optional joined fields if your API returns them, otherwise we fetch separately
  location_name?: string;
  plan_name?: string;
}

// Add Plan Interface
interface Plan {
  id: string;
  name: string;
  months: number;
}

interface Locker {
  id: string;
  locker_code: string;
  is_available: boolean;
}

interface AssignedLocker {
  id: string;
  registration_id: string;
  locker_id: string;
  locker?: Locker;
}

export default function MailroomRegistrations() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]); // Add plans state
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch plans as well
      const [regRes, lockerRes, assignRes, planRes] = await Promise.all([
        fetch("/api/admin/mailroom/registrations"),
        fetch("/api/admin/mailroom/lockers"),
        fetch("/api/admin/mailroom/assigned-lockers"),
        fetch("/api/admin/mailroom/plans"),
      ]);

      if (regRes.ok) {
        const data = await regRes.json();
        setRegistrations(Array.isArray(data.data) ? data.data : data);
      }
      if (lockerRes.ok) {
        const data = await lockerRes.json();
        setLockers(data);
      }
      if (assignRes.ok) {
        const data = await assignRes.json();
        setAssignments(data.data || data);
      }
      if (planRes.ok) {
        const data = await planRes.json();
        setPlans(data.data || data);
      }
    } catch (error) {
      console.error("Failed to fetch data", error);
      notifications.show({
        title: "Error",
        message: "Failed to load registrations",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLockerModal = (user: Registration) => {
    setSelectedUser(user);
    const currentAssignment = assignments.find(
      (a) => a.registration_id === user.id
    );
    setSelectedLockerId(currentAssignment ? currentAssignment.locker_id : null);
    openLockerModal();
  };

  const handleSaveAssignment = async () => {
    if (!selectedUser) return;
    setSubmitting(true);

    try {
      if (!selectedLockerId) {
        // Unassign
        const current = assignments.find(
          (a) => a.registration_id === selectedUser.id
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
      fetchData();
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

  // Filter logic
  const filteredRegistrations = registrations.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  });

  const paginatedRegistrations = filteredRegistrations.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  // Helper to get ALL assigned locker codes for a user
  const getAssignedLockers = (regId: string) => {
    const userAssignments = assignments.filter(
      (a) => a.registration_id === regId
    );

    return userAssignments.map((a) => {
      if (a.locker?.locker_code)
        return { code: a.locker.locker_code, assignmentId: a.id };
      const foundLocker = lockers.find((l) => l.id === a.locker_id);
      return {
        code: foundLocker ? foundLocker.locker_code : "Unknown",
        assignmentId: a.id,
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
          <TextInput
            placeholder="Search users..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 300 }}
          />
          <Badge size="lg" variant="light">
            {registrations.length} Registered Users
          </Badge>
        </Group>

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
              accessor: "full_name",
              title: "User Details",
              width: 250,
              render: (r) => (
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
              render: (r) => (
                <Group gap={4}>
                  <IconMapPin size={14} color="gray" />
                  {/* Note: You might need to fetch location name or map ID to name */}
                  <Text size="sm">{r.location_name || "Main Branch"}</Text>
                </Group>
              ),
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
                    <Text size="sm">
                      <Text span fw={500}>
                        Location:
                      </Text>{" "}
                      {selectedUser.location_name || "Main Branch"}
                    </Text>
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
                      }
                    );
                    if (!res.ok) throw new Error("Failed");

                    notifications.show({
                      title: "Success",
                      message: "Locker assigned",
                      color: "green",
                    });
                    setSelectedLockerId(null);
                    fetchData();
                  } catch (e) {
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
