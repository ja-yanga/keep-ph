"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  TextInput,
  Tooltip,
  Box,
  Text,
  Select,
  Alert,
  Modal,
  Title,
  SimpleGrid,
  ThemeIcon,
} from "@mantine/core";
import {
  IconEdit,
  IconRefresh,
  IconSearch,
  IconCheck,
  IconUser,
  IconMail,
  IconId,
  IconCalendar,
} from "@tabler/icons-react";
import {
  type DataTableColumn,
  type DataTableSortStatus,
} from "mantine-datatable";
import { AdminTable } from "@/components/common/AdminTable";

type UserRole = "owner" | "admin" | "approver" | "user";

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  created_at: string;
};

const DUMMY_USERS: AdminUser[] = [
  {
    id: "1",
    full_name: "Jane Owner",
    email: "owner@example.com",
    role: "owner",
    created_at: "2026-01-10",
  },
  {
    id: "2",
    full_name: "Alex Admin",
    email: "admin@example.com",
    role: "admin",
    created_at: "2026-01-12",
  },
  {
    id: "3",
    full_name: "Kim Approver",
    email: "approver@example.com",
    role: "approver",
    created_at: "2026-01-18",
  },
  {
    id: "4",
    full_name: "John Customer",
    email: "user1@example.com",
    role: "user",
    created_at: "2026-01-20",
  },
];

export default function Users() {
  const [users] = useState<AdminUser[]>(DUMMY_USERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<AdminUser>>({
    columnAccessor: "full_name",
    direction: "asc",
  });

  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<AdminUser | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);

  useEffect(() => {
    const loadSessionRole = async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { role?: string | null };
        const role = String(data?.role ?? "").toLowerCase() as UserRole;
        if (role) setCurrentUserRole(role);
      } catch {
        // no-op for debug display
      }
    };
    loadSessionRole();
  }, []);

  const openView = (u: AdminUser) => {
    setViewUser(u);
    setViewOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSave = () => {
    if (!editUser || !editRole) {
      setEditError("Please select a role.");
      return;
    }
    setGlobalSuccess(`Role updated (dummy) for ${editUser.full_name}`);
    setEditOpen(false);
    setEditUser(null);
    setEditRole(null);
  };

  const openTransfer = () => {
    setTransferOpen(true);
  };

  const handleTransferConfirm = () => {
    if (!editUser) return;
    setGlobalSuccess(`Ownership transferred (dummy) to ${editUser.full_name}`);
    setTransferOpen(false);
    setEditOpen(false);
    setEditUser(null);
    setEditRole(null);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy(null);
  };

  const hasFilters = search || sortBy;

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users.filter((u) => {
      if (!q) return true;
      return (
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      const { columnAccessor, direction } = sortStatus;
      const valA = a[columnAccessor as keyof AdminUser] as string;
      const valB = b[columnAccessor as keyof AdminUser] as string;
      if (valA === valB) return 0;
      const result = valA < valB ? -1 : 1;
      return direction === "asc" ? result : -result;
    });
  }, [users, search, sortStatus]);

  const paginatedUsers = useMemo(() => {
    return filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  }, [filteredUsers, page, pageSize]);

  const roleBadgeColor = (role: UserRole) => {
    if (role === "owner") return "violet.9";
    if (role === "admin") return "blue.9";
    if (role === "approver") return "orange.9";
    return "gray.8";
  };

  const tableColumns: DataTableColumn<AdminUser>[] = useMemo(
    () => [
      {
        accessor: "full_name",
        title: "Full Name",
        width: 200,
        sortable: true,
        render: ({ full_name }: AdminUser) => (
          <Text fw={500} truncate>
            {full_name}
          </Text>
        ),
      },
      {
        accessor: "email",
        title: "Email",
        width: 220,
        sortable: true,
        render: ({ email }: AdminUser) => (
          <Text size="sm" truncate>
            {email}
          </Text>
        ),
      },
      {
        accessor: "role",
        title: "Role",
        width: 140,
        sortable: true,
        render: ({ role }: AdminUser) => (
          <Badge color={roleBadgeColor(role)} variant="filled" size="md">
            {role}
          </Badge>
        ),
      },
      {
        accessor: "created_at",
        title: "Created",
        width: 140,
        sortable: true,
        render: ({ created_at }: AdminUser) => (
          <Text size="sm">{created_at}</Text>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 100,
        textAlign: "right" as const,
        render: (user: AdminUser) => (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Tooltip label="View Details">
              <ActionIcon
                variant="subtle"
                color="gray.7"
                onClick={() => openView(user)}
                aria-label={`View details for ${user.full_name}`}
              >
                <IconUser size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Edit role">
              <ActionIcon
                variant="subtle"
                color="blue.8"
                onClick={() => openEdit(user)}
                aria-label={`Edit role for ${user.full_name}`}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [],
  );

  return (
    <Stack align="center" gap="lg" w="100%">
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
          w="100%"
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
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
            <Select
              placeholder="Sort By"
              data={[
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "name_desc", label: "Name (Z-A)" },
                { value: "role_asc", label: "Role (A-Z)" },
              ]}
              value={sortBy}
              onChange={setSortBy}
              clearable
              style={{ width: 180 }}
            />
            {hasFilters && (
              <Button
                variant="subtle"
                color="red.8"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Group>
          <Tooltip label="Refresh list">
            <Button
              variant="filled"
              leftSection={<IconRefresh size={16} />}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 400);
              }}
              color="#1e3a8a"
              aria-label="Refresh users list"
            >
              Refresh
            </Button>
          </Tooltip>
        </Group>

        <Box
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "400px",
          }}
        >
          <AdminTable<AdminUser>
            records={paginatedUsers}
            fetching={loading}
            totalRecords={filteredUsers.length}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={(p) => setPage(p)}
            recordsPerPageOptions={[10, 20, 50]}
            onRecordsPerPageChange={setPageSize}
            columns={tableColumns}
            sortStatus={sortStatus}
            onSortStatusChange={setSortStatus}
            noRecordsText="No users found"
          />
        </Box>
      </Paper>

      {/* View modal (MailroomPlans styling) */}
      <Modal
        opened={viewOpen}
        onClose={() => setViewOpen(false)}
        title="User Details"
        centered
        size="lg"
      >
        {viewUser && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                  Full Name
                </Text>
                <Title order={3}>{viewUser.full_name}</Title>
              </Box>
              <Badge
                size="lg"
                variant="filled"
                color={roleBadgeColor(viewUser.role)}
              >
                {viewUser.role}
              </Badge>
            </Group>

            <SimpleGrid cols={2}>
              <Paper
                withBorder
                p="md"
                radius="md"
                bg="var(--mantine-color-gray-0)"
              >
                <Stack gap="xs">
                  <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                    Email
                  </Text>
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="blue" size="sm">
                      <IconMail size={14} />
                    </ThemeIcon>
                    <Text size="sm">{viewUser.email}</Text>
                  </Group>
                </Stack>
              </Paper>

              <Paper
                withBorder
                p="md"
                radius="md"
                bg="var(--mantine-color-gray-0)"
              >
                <Stack gap="xs">
                  <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                    Created
                  </Text>
                  <Group gap="xs">
                    <ThemeIcon variant="light" color="gray" size="sm">
                      <IconCalendar size={14} />
                    </ThemeIcon>
                    <Text size="sm">{viewUser.created_at}</Text>
                  </Group>
                </Stack>
              </Paper>
            </SimpleGrid>

            <Paper withBorder p="md" radius="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">
                Identifiers
              </Text>
              <Stack gap="xs">
                <Group>
                  <ThemeIcon variant="light" color="violet" size="sm">
                    <IconId size={14} />
                  </ThemeIcon>
                  <Text size="sm">User ID: {viewUser.id}</Text>
                </Group>
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit Role modal (MailroomPlans styling) */}
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Role"
        centered
        size="lg"
      >
        <Stack gap="md">
          {editError && (
            <Alert
              variant="filled"
              color="red"
              title="Error"
              icon={<IconCheck size={16} />}
              withCloseButton
              onClose={() => setEditError(null)}
            >
              {editError}
            </Alert>
          )}

          <Paper withBorder p="md" radius="md" bg="var(--mantine-color-gray-0)">
            <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
              Debug: Current User Role
            </Text>
            <Badge
              mt="xs"
              variant="filled"
              color={roleBadgeColor(currentUserRole ?? "user")}
            >
              {currentUserRole ?? "unknown"}
            </Badge>
          </Paper>

          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                Full Name
              </Text>
              <Title order={3}>{editUser?.full_name ?? "—"}</Title>
            </Box>
            <Badge
              size="lg"
              variant="filled"
              color={roleBadgeColor(editUser?.role ?? "user")}
            >
              {editUser?.role ?? "User"}
            </Badge>
          </Group>

          <SimpleGrid cols={2}>
            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Stack gap="xs">
                <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                  Email
                </Text>
                <Group gap="xs">
                  <ThemeIcon variant="light" color="blue" size="sm">
                    <IconMail size={14} />
                  </ThemeIcon>
                  <Text size="sm">{editUser?.email ?? "—"}</Text>
                </Group>
              </Stack>
            </Paper>

            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Stack gap="xs">
                <Text size="xs" c="#2D3748" tt="uppercase" fw={700}>
                  Created
                </Text>
                <Group gap="xs">
                  <ThemeIcon variant="light" color="gray" size="sm">
                    <IconCalendar size={14} />
                  </ThemeIcon>
                  <Text size="sm">{editUser?.created_at ?? "—"}</Text>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>

          <Paper withBorder p="md" radius="md">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">
              Identifiers
            </Text>
            <Stack gap="xs">
              <Group>
                <ThemeIcon variant="light" color="violet" size="sm">
                  <IconId size={14} />
                </ThemeIcon>
                <Text size="sm">User ID: {editUser?.id ?? "—"}</Text>
              </Group>
            </Stack>
          </Paper>

          <Select
            label="Role"
            placeholder="Select role"
            data={[
              { value: "owner", label: "Owner" },
              { value: "admin", label: "Admin" },
              { value: "approver", label: "Approver" },
              { value: "user", label: "User" },
            ]}
            value={editRole}
            onChange={(v) => setEditRole((v as UserRole) ?? null)}
          />

          <Group justify="flex-end" mt="sm">
            {currentUserRole === "owner" && (
              <Button variant="outline" color="red" onClick={openTransfer}>
                Transfer Ownership
              </Button>
            )}
            <Group ml="auto">
              <Button variant="default" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button color="blue" onClick={handleEditSave}>
                Save Changes
              </Button>
            </Group>
          </Group>
        </Stack>
      </Modal>

      {/* Transfer Ownership confirmation */}
      <Modal
        opened={transferOpen}
        onClose={() => setTransferOpen(false)}
        title="Confirm Transfer Ownership"
        centered
        size="lg"
      >
        <Stack gap="md">
          <Alert variant="light" color="red" title="This action is sensitive">
            You are about to transfer ownership to this user. Your role will be
            downgraded to admin.
          </Alert>

          <Paper withBorder p="md" radius="md">
            <Text size="sm">
              New Owner: <b>{editUser?.full_name ?? "—"}</b>
            </Text>
            <Text size="sm" c="dimmed">
              {editUser?.email ?? "—"}
            </Text>
          </Paper>

          <Group justify="flex-end">
            <Button variant="default" onClick={() => setTransferOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleTransferConfirm}>
              Confirm Transfer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
