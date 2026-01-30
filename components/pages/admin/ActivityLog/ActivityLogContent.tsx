"use client";

import "mantine-datatable/styles.layer.css";

import { useState, useEffect, useCallback } from "react";
import {
  Stack,
  Group,
  TextInput,
  Select,
  Button,
  Paper,
  Text,
  Badge,
  Popover,
  Chip,
  ActionIcon,
  Divider,
  Box,
} from "@mantine/core";
import {
  IconSearch,
  IconRefresh,
  IconUser,
  IconFilter,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import { AdminTable } from "@/components/common/AdminTable";
import { type DataTableSortStatus } from "mantine-datatable";
import { formatDate } from "@/utils/format";
import {
  type ActivityLogEntry,
  type AdminListActivityLogsResult,
} from "@/utils/types";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

const ENTITY_TYPES = [
  { label: "All Entities", value: "" },
  { label: "Mail Action Request", value: "MAIL_ACTION_REQUEST" },
  { label: "User KYC", value: "USER_KYC" },
  { label: "Payment Transaction", value: "PAYMENT_TRANSACTION" },
  { label: "Subscription", value: "SUBSCRIPTION" },
  { label: "Mailbox Item", value: "MAILBOX_ITEM" },
  { label: "Mailroom Registration", value: "MAILROOM_REGISTRATION" },
  { label: "User Address", value: "USER_ADDRESS" },
  { label: "Rewards Claim", value: "REWARDS_CLAIM" },
  { label: "Referral", value: "REFERRAL" },
  { label: "Notification", value: "NOTIFICATION" },
  { label: "Mailroom File", value: "MAILROOM_FILE" },
  { label: "Mailroom Assigned Locker", value: "MAILROOM_ASSIGNED_LOCKER" },
  { label: "User", value: "USER" },
];

const ACTIONS = [
  { label: "All Actions", value: "" },
  { label: "Create", value: "CREATE" },
  { label: "Update", value: "UPDATE" },
  { label: "Delete", value: "DELETE" },
  { label: "View", value: "VIEW" },
  { label: "Submit", value: "SUBMIT" },
  { label: "Approve", value: "APPROVE" },
  { label: "Reject", value: "REJECT" },
  { label: "Process", value: "PROCESS" },
  { label: "Complete", value: "COMPLETE" },
  { label: "Cancel", value: "CANCEL" },
  { label: "Verify", value: "VERIFY" },
  { label: "Pay", value: "PAY" },
  { label: "Refund", value: "REFUND" },
  { label: "Login", value: "LOGIN" },
  { label: "Logout", value: "LOGOUT" },
  { label: "Register", value: "REGISTER" },
  { label: "Claim", value: "CLAIM" },
  { label: "Release", value: "RELEASE" },
  { label: "Dispose", value: "DISPOSE" },
  { label: "Scan", value: "SCAN" },
  { label: "Purchase", value: "PURCHASE" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function ActivityLogContent() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Filters
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string | null>(null);
  const [action, setAction] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);

  // Sorting
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ActivityLogEntry>
  >({
    columnAccessor: "activity_created_at",
    direction: "desc",
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_list_activity_logs", {
        input_data: {
          limit: recordsPerPage,
          offset: (page - 1) * recordsPerPage,
          search: search || null,
          entity_type: entityType || null,
          action: action || null,
          date_from: dateRange[0] || null,
          date_to: dateRange[1] || null,
          sort_by: String(sortStatus.columnAccessor) || null,
          sort_direction: sortStatus.direction || null,
        },
      });

      if (error) throw error;

      if (data) {
        const result = data as unknown as AdminListActivityLogsResult;
        setLogs(result.logs || []);
        setTotalRecords(result.total_count || 0);
      }
    } catch (err) {
      const errorObj = err as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
      };
      console.error("Error fetching activity logs:", {
        message: errorObj.message,
        details: errorObj.details,
        hint: errorObj.hint,
        code: errorObj.code,
        full: err,
      });
    } finally {
      setLoading(false);
    }
  }, [page, recordsPerPage, search, entityType, action, dateRange, sortStatus]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Reset to first page when filters or sorting change
  useEffect(() => {
    setPage(1);
  }, [search, entityType, action, dateRange, sortStatus]);

  const generateDescription = (log: ActivityLogEntry) => {
    const logAction =
      log.activity_action?.toLowerCase() || "performed an action";
    const entity =
      log.activity_entity_type?.toLowerCase().replace(/_/g, " ") || "something";

    // For mailbox items (store, dispose, release, scan)
    const package_name = log.activity_details?.package_name || "";
    const package_type = log.activity_details?.package_type || "";
    const package_locker_code = log.activity_details?.package_locker_code || "";

    // For rewards
    const payment_method = log.activity_details?.payment_method || "";
    const payment_amount = log.activity_details?.payment_amount || "";

    // For KYC
    const kyc_description = log.activity_details?.kyc_description || "";

    // For subscription
    const subscription_plan_name =
      log.activity_details?.mailroom_plan_name || "";
    const subscription_location_name =
      log.activity_details?.mailroom_location_name || "";
    const subscription_locker_qty =
      log.activity_details?.mailroom_locker_qty || "";

    return (
      <Stack gap={2}>
        {/* Main action description */}
        <Text size="sm" fw={500} tt="capitalize">
          {logAction} {entity}
        </Text>

        {/* For mailbox items: show package name and type */}
        {package_name && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {package_name} {package_type ? `(${package_type})` : "(Scanned)"}
            {package_locker_code && ` - Locker: ${package_locker_code}`}
          </Text>
        )}

        {/* For rewards: show payout and payment method */}
        {payment_amount && payment_method && (
          <Text size="xs" c="dimmed" lineClamp={1} tt="uppercase">
            Amount: ₱{payment_amount} ({payment_method})
          </Text>
        )}

        {/* For KYC: show description */}
        {kyc_description && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {kyc_description}
          </Text>
        )}

        {/* For subscription: show description */}
        {subscription_plan_name && (
          <Text size="xs" c="dimmed" lineClamp={1}>
            {subscription_plan_name} - {subscription_location_name} -{" "}
            {subscription_locker_qty}
          </Text>
        )}
      </Stack>
    );
  };

  const [searchInput, setSearchInput] = useState("");
  const hasActiveFilters = entityType || action || dateRange[0] || dateRange[1];
  const activeFilterCount = [
    entityType,
    action,
    dateRange[0],
    dateRange[1],
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    setEntityType(null);
    setAction(null);
    setDateRange([null, null]);
    setSearch("");
    setSearchInput("");
  };

  const handleSearchSubmit = () => {
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleRecordsPerPageChange = (n: number) => {
    setRecordsPerPage(n);
    setPage(1);
  };

  return (
    <Box>
      <Stack gap="xs">
        <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
          <Stack gap="md">
            {/* Search Bar with Filters */}
            <Group
              gap="sm"
              role="search"
              aria-label="Activity log search and filters"
              align="center"
              wrap="nowrap"
            >
              <TextInput
                placeholder="Search by details or email..."
                aria-label="Search activity logs"
                leftSection={<IconSearch size={16} aria-hidden="true" />}
                rightSectionWidth={searchInput ? 70 : 42}
                rightSection={
                  searchInput ? (
                    <Group gap={4}>
                      <ActionIcon
                        size="sm"
                        variant="transparent"
                        c="gray.7"
                        onClick={handleClearSearch}
                        aria-label="Clear search"
                      >
                        <IconX size={16} aria-hidden="true" />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="transparent"
                        c="indigo"
                        onClick={handleSearchSubmit}
                        aria-label="Submit search"
                      >
                        <IconArrowRight size={16} aria-hidden="true" />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      c="gray.7"
                      onClick={handleSearchSubmit}
                      aria-label="Submit search"
                    >
                      <IconArrowRight size={16} aria-hidden="true" />
                    </ActionIcon>
                  )
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.currentTarget.value)}
                onKeyDown={handleSearchKeyPress}
                style={{ flex: 1 }}
              />

              <Popover width={400} position="bottom-end" shadow="md">
                <Popover.Target>
                  <Button
                    variant="filled"
                    color="#26316e"
                    leftSection={<IconFilter size={18} aria-hidden="true" />}
                    size="sm"
                    radius="md"
                    aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                    rightSection={
                      activeFilterCount > 0 ? (
                        <Badge
                          size="sm"
                          variant="filled"
                          circle
                          color="red"
                          c="white"
                          aria-hidden="true"
                        >
                          {activeFilterCount}
                        </Badge>
                      ) : null
                    }
                  >
                    Filters
                  </Button>
                </Popover.Target>
                <Popover.Dropdown>
                  <Stack
                    gap="md"
                    component="form"
                    role="form"
                    aria-label="Filter options"
                  >
                    <Group justify="space-between">
                      <Text fw={600} size="sm" component="h2">
                        Filter Activity Logs
                      </Text>
                      {hasActiveFilters && (
                        <Button
                          variant="subtle"
                          size="xs"
                          color="red"
                          onClick={clearAllFilters}
                          aria-label="Clear all filters"
                        >
                          Clear All
                        </Button>
                      )}
                    </Group>

                    <Divider />

                    <Select
                      label="Entity Type"
                      placeholder="Select entity type"
                      data={ENTITY_TYPES}
                      value={entityType}
                      onChange={setEntityType}
                      clearable
                      searchable
                      aria-label="Filter by entity type"
                    />

                    <Select
                      label="Action"
                      placeholder="Select action"
                      data={ACTIONS}
                      value={action}
                      onChange={setAction}
                      clearable
                      searchable
                      aria-label="Filter by action"
                    />

                    <Divider label="Date Range" labelPosition="center" />

                    <TextInput
                      label="From Date"
                      type="date"
                      placeholder="Pick start date"
                      value={dateRange[0] || ""}
                      onChange={(e) =>
                        setDateRange([
                          e.currentTarget.value || null,
                          dateRange[1],
                        ])
                      }
                      aria-label="Filter from date"
                    />

                    <TextInput
                      label="To Date"
                      type="date"
                      placeholder="Pick end date"
                      value={dateRange[1] || ""}
                      onChange={(e) =>
                        setDateRange([
                          dateRange[0],
                          e.currentTarget.value || null,
                        ])
                      }
                      aria-label="Filter to date"
                    />
                  </Stack>
                </Popover.Dropdown>
              </Popover>

              <ActionIcon
                variant="filled"
                color="#26316e"
                size="lg"
                radius="md"
                onClick={() => fetchLogs()}
                loading={loading}
                aria-label="Refresh activity logs"
                title="Refresh"
              >
                <IconRefresh size={18} aria-hidden="true" />
              </ActionIcon>
            </Group>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <Group
                gap="xs"
                role="status"
                aria-live="polite"
                aria-label="Active filters"
              >
                <Text size="xs" c="dimmed" fw={500}>
                  Active Filters:
                </Text>
                {entityType && (
                  <Chip
                    checked={false}
                    size="sm"
                    variant="filled"
                    color="#26316e"
                    radius="sm"
                    onClick={() => setEntityType(null)}
                    aria-label={`Remove entity type filter: ${ENTITY_TYPES.find((e) => e.value === entityType)?.label}`}
                  >
                    {ENTITY_TYPES.find((e) => e.value === entityType)?.label}
                  </Chip>
                )}
                {action && (
                  <Chip
                    checked={false}
                    size="sm"
                    variant="filled"
                    color="#26316e"
                    radius="sm"
                    onClick={() => setAction(null)}
                    aria-label={`Remove action filter: ${ACTIONS.find((a) => a.value === action)?.label}`}
                  >
                    {ACTIONS.find((a) => a.value === action)?.label}
                  </Chip>
                )}
                {dateRange[0] && (
                  <Chip
                    checked={false}
                    size="sm"
                    variant="filled"
                    color="#26316e"
                    radius="sm"
                    onClick={() => setDateRange([null, dateRange[1]])}
                    aria-label={`Remove from date filter: ${dateRange[0]}`}
                  >
                    From: {dateRange[0]}
                  </Chip>
                )}
                {dateRange[1] && (
                  <Chip
                    checked={false}
                    size="sm"
                    variant="filled"
                    color="#26316e"
                    radius="sm"
                    onClick={() => setDateRange([dateRange[0], null])}
                    aria-label={`Remove to date filter: ${dateRange[1]}`}
                  >
                    To: {dateRange[1]}
                  </Chip>
                )}
              </Group>
            )}

            {/* Table inside Paper */}
            <AdminTable<ActivityLogEntry>
              fetching={loading}
              records={logs}
              idAccessor="activity_log_id"
              totalRecords={totalRecords}
              recordsPerPage={recordsPerPage}
              recordsPerPageOptions={PAGE_SIZE_OPTIONS}
              onRecordsPerPageChange={handleRecordsPerPageChange}
              page={page}
              onPageChange={setPage}
              sortStatus={sortStatus}
              onSortStatusChange={setSortStatus}
              columns={[
                {
                  accessor: "activity_created_at",
                  title: "Timestamp",
                  width: 180,
                  sortable: true,
                  render: (log) => formatDate(log.activity_created_at),
                },
                {
                  accessor: "actor_email",
                  title: "Actor",
                  width: 250,
                  sortable: true,
                  render: (log) => (
                    <Group gap="xs">
                      <IconUser size={14} color="gray" />
                      <Stack gap={0}>
                        <Text size="sm" fw={500}>
                          {log.actor_email}
                        </Text>
                      </Stack>
                    </Group>
                  ),
                },
                {
                  accessor: "activity_entity_type",
                  title: "Entity Type",
                  width: 200,
                  sortable: true,
                  render: (log) => (
                    <Badge variant="dot" color="blue">
                      {log.activity_entity_type?.replaceAll("_", " ") || "N/A"}
                    </Badge>
                  ),
                },
                {
                  accessor: "description",
                  title: "Description",
                  render: (log) => generateDescription(log),
                },
                {
                  accessor: "activity_action",
                  title: "Action",
                  width: 120,
                  sortable: true,
                  render: (log) => (
                    <Badge variant="dot" color="blue">
                      {log.activity_action}
                    </Badge>
                  ),
                },
              ]}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
