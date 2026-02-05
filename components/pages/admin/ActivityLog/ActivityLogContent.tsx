"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import {
  Stack,
  Group,
  TextInput,
  Button,
  Paper,
  Text,
  Badge,
  Popover,
  Chip,
  ActionIcon,
  Box,
  VisuallyHidden,
  Flex,
  Alert,
} from "@mantine/core";
import {
  IconSearch,
  IconRefresh,
  IconFilter,
  IconX,
  IconArrowRight,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { AdminTable } from "@/components/common/AdminTable";
import { type DataTableSortStatus } from "mantine-datatable";
import { formatDate } from "@/utils/format";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { type ActivityLogEntry } from "@/utils/types";
import { LogDescription, LogActor } from "./ActivityLogCells";
import { ACTIONS, ENTITY_TYPES } from "@/utils/constants";

const LogDetailsModal = dynamic(() => import("./LogDetailsModal"), {
  ssr: false,
});

const FilterPopoverContent = dynamic(() => import("./FilterPopoverContent"), {
  ssr: false,
});

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const SearchSection = memo(
  ({
    searchInput,
    setSearchInput,
    handleClearSearch,
    handleSearchSubmit,
    handleSearchKeyPress,
    isLoading,
  }: {
    searchInput: string;
    setSearchInput: (v: string) => void;
    handleClearSearch: () => void;
    handleSearchSubmit: () => void;
    handleSearchKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    isLoading: boolean;
  }) => (
    <TextInput
      placeholder="Search..."
      aria-label="Search activity logs"
      data-testid="search-input"
      disabled={isLoading}
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
              title="Clear search"
              data-testid="clear-search-button"
            >
              <IconX size={16} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              disabled={isLoading}
              size="sm"
              variant="transparent"
              c="indigo"
              onClick={handleSearchSubmit}
              aria-label="Submit search"
              title="Submit search"
              data-testid="submit-search-button"
            >
              <IconArrowRight size={16} aria-hidden="true" color="#26316e" />
            </ActionIcon>
          </Group>
        ) : (
          <ActionIcon
            size="sm"
            variant="transparent"
            c="gray.7"
            onClick={handleSearchSubmit}
            aria-label="Submit search"
            title="Submit search"
            data-testid="submit-search-button"
          >
            <IconArrowRight size={16} aria-hidden="true" />
          </ActionIcon>
        )
      }
      value={searchInput}
      onChange={(e) => setSearchInput(e.currentTarget.value)}
      onKeyDown={handleSearchKeyPress}
      style={{ flex: "1 1 300px" }}
    />
  ),
);

SearchSection.displayName = "SearchSection";

const ActiveFiltersDisplay = memo(
  ({
    hasActiveFilters,
    entityType,
    action,
    dateRange,
    setEntityType,
    setAction,
    setDateRange,
  }: {
    hasActiveFilters: boolean;
    entityType: string | null;
    action: string | null;
    dateRange: [string | null, string | null];
    setEntityType: (v: string | null) => void;
    setAction: (v: string | null) => void;
    setDateRange: (v: [string | null, string | null]) => void;
  }) => {
    if (!hasActiveFilters) return null;
    return (
      <Group
        gap="xs"
        role="status"
        aria-live="polite"
        aria-label="Active filters"
      >
        <Text size="xs" c="gray.7" fw={600}>
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
            aria-label={`Remove entity type filter: ${ENTITY_TYPES.find((e) => e.value === entityType)?.label ?? "Unknown"}`}
          >
            {ENTITY_TYPES.find((e) => e.value === entityType)?.label ??
              entityType}
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
            aria-label={`Remove action filter: ${ACTIONS.find((a) => a.value === action)?.label ?? "Unknown"}`}
          >
            {ACTIONS.find((a) => a.value === action)?.label ?? action}
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
    );
  },
);

ActiveFiltersDisplay.displayName = "ActiveFiltersDisplay";

export default function ActivityLogContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Sorting
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ActivityLogEntry>
  >({
    columnAccessor: "activity_created_at",
    direction: "desc",
  });

  const [selectedLog, setSelectedLog] = useState<ActivityLogEntry | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleRowClick = useCallback(
    (log: ActivityLogEntry) => {
      setSelectedLog(log);
      open();
    },
    [open],
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: recordsPerPage.toString(),
        offset: ((page - 1) * recordsPerPage).toString(),
        ...(search && { search }),
        ...(entityType && { entity_type: entityType }),
        ...(action && { action }),
        ...(dateRange[0] && { date_from: dateRange[0] }),
        ...(dateRange[1] && { date_to: dateRange[1] }),
        ...(sortStatus.columnAccessor && {
          sort_by: String(sortStatus.columnAccessor),
        }),
        ...(sortStatus.direction && { sort_direction: sortStatus.direction }),
      });

      const response = await fetch(
        `${API_ENDPOINTS.admin.activityLogs}?${params.toString()}`,
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch activity logs");
      }

      if (result) {
        setLogs(result.logs || []);
        setTotalRecords(result.total_count || 0);
      }
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setLoading(false);
    }
  }, [page, recordsPerPage, search, entityType, action, dateRange, sortStatus]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [search, entityType, action, dateRange, sortStatus]);

  const [searchInput, setSearchInput] = useState("");
  const hasActiveFilters = !!(
    entityType ||
    action ||
    dateRange[0] ||
    dateRange[1]
  );
  const activeFilterCount = [
    entityType,
    action,
    dateRange[0],
    dateRange[1],
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setEntityType(null);
    setAction(null);
    setDateRange([null, null]);
    setSearch("");
    setSearchInput("");
  }, []);

  const handleSearchSubmit = useCallback(() => {
    setSearch(searchInput);
  }, [searchInput]);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearch("");
  }, []);

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearchSubmit();
    }
  };

  const handleRecordsPerPageChange = useCallback((n: number) => {
    setRecordsPerPage(n);
    setPage(1);
  }, []);

  const columns = useMemo(
    () => [
      {
        accessor: "activity_created_at",
        title: "Timestamp",
        width: 180,
        sortable: true,
        render: (log: ActivityLogEntry) => formatDate(log.activity_created_at),
      },
      {
        accessor: "actor_email",
        title: "Actor",
        width: 250,
        sortable: true,
        render: (log: ActivityLogEntry) => <LogActor email={log.actor_email} />,
      },
      {
        accessor: "activity_entity_type",
        title: "Entity Type",
        width: 200,
        sortable: true,
        render: (log: ActivityLogEntry) => (
          <Badge variant="filled" size="md" color="#1a237e" radius="md" w={130}>
            {log.activity_entity_type?.replace(/_/g, " ") || "N/A"}
          </Badge>
        ),
      },
      {
        accessor: "description",
        title: "Description",
        render: (log: ActivityLogEntry) => <LogDescription log={log} />,
      },
      {
        accessor: "activity_action",
        title: "Action",
        width: 150,
        sortable: true,
        render: (log: ActivityLogEntry) => (
          <Badge variant="filled" size="md" color="#1a237e" radius="md" w={100}>
            {log.activity_action.replace(/_/g, " ").toUpperCase()}
          </Badge>
        ),
      },
    ],
    [],
  );

  return (
    <Box component="section" aria-labelledby="activity-log-title">
      <VisuallyHidden>
        <span id="activity-log-title">Activity Logs</span>
      </VisuallyHidden>
      <Stack gap="sm">
        <Paper
          p={{ base: "md", sm: "xl" }}
          radius="lg"
          withBorder
          shadow="sm"
          w="100%"
        >
          <Stack gap="sm">
            <Flex
              gap={{ base: "xs", sm: "sm" }}
              role="search"
              aria-label="Activity log search and filters"
              align="center"
              wrap="wrap"
            >
              <SearchSection
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                handleClearSearch={handleClearSearch}
                handleSearchSubmit={handleSearchSubmit}
                handleSearchKeyPress={handleSearchKeyPress}
                isLoading={loading}
              />

              <Popover
                width={400}
                position="bottom-end"
                shadow="md"
                opened={popoverOpened}
                onChange={setPopoverOpened}
                withinPortal={false}
              >
                <Popover.Target>
                  <Button
                    disabled={loading}
                    variant="filled"
                    color="#26316e"
                    leftSection={<IconFilter size={18} aria-hidden="true" />}
                    size="sm"
                    radius="md"
                    onClick={() => setPopoverOpened((o) => !o)}
                    aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                    aria-expanded={popoverOpened}
                    aria-haspopup="dialog"
                    aria-controls="activity-log-filters"
                    data-testid="filter-button"
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
                <Popover.Dropdown id="activity-log-filters">
                  <FilterPopoverContent
                    popoverOpened={popoverOpened}
                    hasActiveFilters={hasActiveFilters}
                    clearAllFilters={clearAllFilters}
                    entityType={entityType}
                    setEntityType={setEntityType}
                    action={action}
                    setAction={setAction}
                    dateRange={dateRange}
                    setDateRange={setDateRange}
                  />
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
            </Flex>

            <ActiveFiltersDisplay
              hasActiveFilters={hasActiveFilters}
              entityType={entityType}
              action={action}
              dateRange={dateRange}
              setEntityType={setEntityType}
              setAction={setAction}
              setDateRange={setDateRange}
            />

            {error && (
              <Alert
                variant="light"
                color="red"
                title="Error fetching logs"
                icon={<IconAlertCircle size={18} />}
              >
                <Stack gap="xs">
                  <Text size="sm">{error}</Text>
                  <Button
                    variant="outline"
                    color="red"
                    size="xs"
                    onClick={() => fetchLogs()}
                    leftSection={<IconRefresh size={14} />}
                    style={{ width: "fit-content" }}
                  >
                    Retry Refresh
                  </Button>
                </Stack>
              </Alert>
            )}

            <Box
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "0 750px",
              }}
            >
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
                columns={columns}
                noRecordsText="No activity logs found"
                onRowClick={({ record }) => handleRowClick(record)}
              />
            </Box>
            <LogDetailsModal
              opened={opened}
              onClose={close}
              selectedLog={selectedLog}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
