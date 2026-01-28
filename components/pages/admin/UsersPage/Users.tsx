"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useMemo, useState, useCallback, memo } from "react";
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
  IconArrowRight,
  IconX,
} from "@tabler/icons-react";
import {
  type DataTableColumn,
  type DataTableSortStatus,
} from "mantine-datatable";
import { AdminTable } from "@/components/common/AdminTable";
import type { AdminUserPage, ApiUserPage, UserRole } from "@/utils/types";

const SearchInput = memo(
  ({ onSearch }: { onSearch: (value: string) => void }) => {
    const [value, setValue] = useState("");

    const handleSearch = () => {
      onSearch(value);
    };

    const handleClear = () => {
      setValue("");
      onSearch("");
    };

    return (
      <TextInput
        placeholder="Search users..."
        w="100%"
        aria-label="Search users"
        leftSection={<IconSearch size={16} />}
        rightSectionWidth={value ? 70 : 42}
        rightSection={
          value ? (
            <Group gap={4}>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="gray.5"
                onClick={handleClear}
                aria-label="Clear search"
                title="Clear search"
              >
                <IconX size={16} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="indigo"
                onClick={handleSearch}
                aria-label="Submit search"
                title="Submit search"
              >
                <IconArrowRight size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <ActionIcon
              size="sm"
              variant="transparent"
              c="gray.5"
              onClick={handleSearch}
              aria-label="Submit search"
              title="Submit search"
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          )
        }
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
        style={{ width: 300 }}
      />
    );
  },
);

SearchInput.displayName = "SearchInput";

export default function Users() {
  const [users, setUsers] = useState<AdminUserPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [search, setSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<AdminUserPage>
  >({
    columnAccessor: "full_name",
    direction: "asc",
  });

  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<AdminUserPage | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserPage | null>(null);
  const [editRole, setEditRole] = useState<UserRole | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const loadSessionRole = async () => {
      try {
        const res = await fetch("/api/session", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as {
          role?: string | null;
          user?: { id?: string | null };
          user_id?: string | null;
        };
        const role = String(data?.role ?? "").toLowerCase() as UserRole;
        if (role) setCurrentUserRole(role);
        const id = data?.user?.id ?? data?.user_id ?? null;
        if (id) setCurrentUserId(id);
      } catch {
        // no-op for debug display
      }
    };
    loadSessionRole();
  }, []);

  useEffect(() => {
    if (!loading) setIsSearching(false);
  }, [loading]);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const sortMap: Record<string, string> = {
          full_name: "full_name",
          email: "users_email",
          role: "users_role",
          created_at: "users_created_at",
        };
        const sortField =
          sortMap[sortStatus.columnAccessor as string] ?? "users_created_at";

        const params = new URLSearchParams({
          q: search.trim(),
          page: String(page),
          pageSize: String(pageSize),
          sort: sortField,
          direction: sortStatus.direction,
        });

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setLoadError("Failed to load users.");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as {
          data?: ApiUserPage[];
          count?: number;
        };
        const mapped = (json.data ?? []).map((u) => {
          const kyc = Array.isArray(u.user_kyc_table)
            ? u.user_kyc_table[0]
            : u.user_kyc_table;
          const first = (kyc?.user_kyc_first_name ?? "").trim();
          const last = (kyc?.user_kyc_last_name ?? "").trim();
          const fullName = `${first} ${last}`.trim() || u.users_email;
          return {
            id: u.users_id,
            full_name: fullName,
            email: u.users_email,
            role: u.users_role,
            created_at: new Date(u.users_created_at).toISOString().slice(0, 10),
          } as AdminUserPage;
        });
        setUsers(mapped);
        setTotalRecords(json.count ?? mapped.length);
      } catch {
        setLoadError("Failed to load users.");
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, [page, pageSize, search, sortStatus]);

  const openView = (u: AdminUserPage) => {
    setViewUser(u);
    setViewOpen(true);
  };

  const openEdit = (u: AdminUserPage) => {
    setEditUser(u);
    setEditRole(u.role);
    setEditError(null);
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    if (!editUser || !editRole) {
      setEditError("Please select a role.");
      return;
    }
    if (!currentUserId) {
      setEditError("Missing current user id (session not loaded).");
      return;
    }
    setIsSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users_role: editRole,
          actor_user_id: currentUserId,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEditError(json?.error ?? "Failed to update role.");
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === editUser.id ? { ...u, role: editRole } : u)),
      );
      setGlobalSuccess(`Role updated for ${editUser.full_name}`);
      setEditOpen(false);
      setEditUser(null);
      setEditRole(null);
    } catch {
      setEditError("Failed to update role.");
    } finally {
      setIsSaving(false);
    }
  };

  const openTransfer = () => {
    setTransferOpen(true);
  };

  const handleTransferConfirm = async () => {
    if (!editUser || !currentUserId) return;
    setIsTransferring(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          users_role: "owner",
          actor_user_id: currentUserId,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEditError(json?.error ?? "Failed to transfer ownership.");
        return;
      }

      // update local list
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === editUser.id) return { ...u, role: "owner" };
          if (u.id === currentUserId) return { ...u, role: "admin" };
          return u;
        }),
      );

      setCurrentUserRole("admin");
      setGlobalSuccess(`Ownership transferred to ${editUser.full_name}`);
      setTransferOpen(false);
      setEditOpen(false);
      setEditUser(null);
      setEditRole(null);
    } catch {
      setEditError("Failed to transfer ownership.");
    } finally {
      setIsTransferring(false);
    }
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy(null);
    setSortStatus({ columnAccessor: "full_name", direction: "asc" });
    setPage(1);
  };

  const hasFilters = search || sortBy;

  const filteredUsers = useMemo(() => users, [users]);

  const roleBadgeColor = (role: UserRole) => {
    if (role === "owner") return "violet.9";
    if (role === "admin") return "blue.9";
    if (role === "approver") return "orange.9";
    return "gray.8";
  };

  const roleRank: Record<UserRole, number> = {
    owner: 4,
    admin: 3,
    approver: 2,
    user: 1,
  };

  const isEditingBlocked =
    !!editUser &&
    !!currentUserRole &&
    roleRank[editUser.role] > roleRank[currentUserRole];

  const isSameRoleBlocked =
    !!editUser && !!currentUserRole && editUser.role === currentUserRole;

  const isRoleEditHidden = isEditingBlocked || isSameRoleBlocked;

  const roleOptions =
    currentUserRole === "admin"
      ? [
          { value: "approver", label: "Approver" },
          { value: "user", label: "User" },
        ]
      : [
          { value: "owner", label: "Owner" },
          { value: "admin", label: "Admin" },
          { value: "approver", label: "Approver" },
          { value: "user", label: "User" },
        ];

  const tableColumns: DataTableColumn<AdminUserPage>[] = useMemo(
    () => [
      {
        accessor: "full_name",
        title: "Full Name",
        width: 200,
        sortable: true,
        render: ({ full_name }: AdminUserPage) => (
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
        render: ({ email }: AdminUserPage) => (
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
        render: ({ role }: AdminUserPage) => (
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
        render: ({ created_at }: AdminUserPage) => (
          <Text size="sm">{created_at}</Text>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 100,
        textAlign: "right" as const,
        render: (user: AdminUserPage) => (
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

  const handleSortByChange = (value: string | null) => {
    setSortBy(value);
    if (!value) {
      setSortStatus({ columnAccessor: "full_name", direction: "asc" });
      setPage(1);
      return;
    }
    if (value === "name_asc")
      setSortStatus({ columnAccessor: "full_name", direction: "asc" });
    if (value === "name_desc")
      setSortStatus({ columnAccessor: "full_name", direction: "desc" });
    if (value === "role_asc")
      setSortStatus({ columnAccessor: "role", direction: "asc" });
    setPage(1);
  };

  const handleSearchSubmit = useCallback(
    (val: string) => {
      if (val === search && page === 1) return;
      setIsSearching(true);
      setSearch(val);
      setPage(1);
    },
    [search, page],
  );

  return (
    <Stack align="center" gap="lg" w="100%">
      {loadError && (
        <Alert
          variant="light"
          color="red"
          title="Error"
          withCloseButton
          onClose={() => setLoadError(null)}
          w="100%"
        >
          {loadError}
        </Alert>
      )}
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
            <SearchInput onSearch={handleSearchSubmit} />
            <Select
              placeholder="Sort By"
              data={[
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "name_desc", label: "Name (Z-A)" },
                { value: "role_asc", label: "Role (A-Z)" },
              ]}
              value={sortBy}
              onChange={handleSortByChange}
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
          <AdminTable<AdminUserPage>
            records={isSearching ? [] : filteredUsers}
            fetching={loading || isSearching}
            totalRecords={totalRecords}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={(p) => setPage(p)}
            recordsPerPageOptions={[10, 20, 50]}
            onRecordsPerPageChange={setPageSize}
            columns={tableColumns}
            sortStatus={sortStatus}
            onSortStatusChange={(s) => {
              setSortStatus(s);
              setPage(1);
            }}
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

          {isEditingBlocked && (
            <Alert variant="light" color="orange" title="Not allowed">
              You cannot edit a user with a higher role than yours.
            </Alert>
          )}
          {isSameRoleBlocked && (
            <Alert variant="light" color="orange" title="Not allowed">
              You cannot edit a user with the same role as yours.
            </Alert>
          )}

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

          {!isRoleEditHidden && (
            <Select
              label="Role"
              placeholder="Select role"
              data={roleOptions}
              value={editRole}
              onChange={(v) => setEditRole((v as UserRole) ?? null)}
              disabled={isSaving}
            />
          )}

          <Group justify="flex-end" mt="sm">
            {currentUserRole === "owner" && (
              <Button
                variant="outline"
                color="red"
                onClick={openTransfer}
                disabled={isSaving || isTransferring || isEditingBlocked}
              >
                Transfer Ownership
              </Button>
            )}
            <Group ml="auto">
              <Button
                variant="default"
                onClick={() => setEditOpen(false)}
                disabled={isSaving || isTransferring}
              >
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleEditSave}
                loading={isSaving}
                disabled={isRoleEditHidden}
              >
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
            <Button
              variant="default"
              onClick={() => setTransferOpen(false)}
              disabled={isTransferring}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleTransferConfirm}
              loading={isTransferring}
            >
              Confirm Transfer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
