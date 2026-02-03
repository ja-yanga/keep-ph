"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import dynamic from "next/dynamic";
import {
  Stack,
  Group,
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
} from "@mantine/core";
import { IconFilter, IconRefresh } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { AdminTable } from "@/components/common/AdminTable";
import { type DataTableSortStatus } from "mantine-datatable";
import { formatDate } from "@/utils/format";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { fetchFromAPI } from "@/utils/fetcher";
import {
  type AdminListErrorLogsResult,
  type ErrorLogEntry,
} from "@/utils/types";
import { ERROR_RESOLUTION_STATUSES, ERROR_TYPES } from "@/utils/constants";
import {
  ErrorCodeCell,
  ErrorMessageCell,
  ErrorTypeBadge,
  RequestPathCell,
  ResolvedStatusBadge,
} from "./ErrorLogCells";

const ErrorLogDetailsModal = dynamic(() => import("./ErrorLogDetailsModal"), {
  ssr: false,
});

const FilterPopoverContent = dynamic(() => import("./FilterPopoverContent"), {
  ssr: false,
});

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const ActiveFiltersDisplay = memo(
  ({
    hasActiveFilters,
    errorType,
    resolvedStatus,
    errorCode,
    requestPath,
    userId,
    dateRange,
    setErrorType,
    setResolvedStatus,
    setErrorCode,
    setRequestPath,
    setUserId,
    setDateRange,
  }: {
    hasActiveFilters: boolean;
    errorType: string | null;
    resolvedStatus: string | null;
    errorCode: string;
    requestPath: string;
    userId: string;
    dateRange: [string | null, string | null];
    setErrorType: (v: string | null) => void;
    setResolvedStatus: (v: string | null) => void;
    setErrorCode: (v: string) => void;
    setRequestPath: (v: string) => void;
    setUserId: (v: string) => void;
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
        {errorType && (
          <Chip
            checked={false}
            size="sm"
            variant="filled"
            color="#26316e"
            radius="sm"
            onClick={() => setErrorType(null)}
            aria-label={`Remove error type filter: ${ERROR_TYPES.find((e) => e.value === errorType)?.label ?? "Unknown"}`}
          >
            {ERROR_TYPES.find((e) => e.value === errorType)?.label ?? errorType}
          </Chip>
        )}
        {resolvedStatus && (
          <Chip
            checked={false}
            size="sm"
            variant="filled"
            color="#26316e"
            radius="sm"
            onClick={() => setResolvedStatus(null)}
            aria-label={`Remove resolved status filter: ${ERROR_RESOLUTION_STATUSES.find((e) => e.value === resolvedStatus)?.label ?? "Unknown"}`}
          >
            {ERROR_RESOLUTION_STATUSES.find((e) => e.value === resolvedStatus)
              ?.label ?? resolvedStatus}
          </Chip>
        )}
        {errorCode && (
          <Chip
            checked={false}
            size="sm"
            variant="filled"
            color="#26316e"
            radius="sm"
            onClick={() => setErrorCode("")}
            aria-label={`Remove error code filter: ${errorCode}`}
          >
            Code: {errorCode}
          </Chip>
        )}
        {requestPath && (
          <Chip
            checked={false}
            size="sm"
            variant="filled"
            color="#26316e"
            radius="sm"
            onClick={() => setRequestPath("")}
            aria-label={`Remove request path filter: ${requestPath}`}
          >
            Path: {requestPath}
          </Chip>
        )}
        {userId && (
          <Chip
            checked={false}
            size="sm"
            variant="filled"
            color="#26316e"
            radius="sm"
            onClick={() => setUserId("")}
            aria-label={`Remove user id filter: ${userId}`}
          >
            User: {userId}
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

export default function ErrorLogContent() {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [page, setPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(10);

  // Filters
  const [errorType, setErrorType] = useState<string | null>(null);
  const [resolvedStatus, setResolvedStatus] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState("");
  const [requestPath, setRequestPath] = useState("");
  const [userId, setUserId] = useState("");
  const [dateRange, setDateRange] = useState<[string | null, string | null]>([
    null,
    null,
  ]);
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Sorting
  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<ErrorLogEntry>
  >({
    columnAccessor: "error_created_at",
    direction: "desc",
  });

  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [opened, { open, close }] = useDisclosure(false);

  const handleRowClick = useCallback(
    (log: ErrorLogEntry) => {
      setSelectedLogId(log.error_log_id);
      open();
    },
    [open],
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: recordsPerPage.toString(),
        offset: ((page - 1) * recordsPerPage).toString(),
        ...(errorType && { error_type: errorType }),
        ...(resolvedStatus && { error_resolved: resolvedStatus }),
        ...(errorCode && { error_code: errorCode }),
        ...(requestPath && { request_path: requestPath }),
        ...(userId && { user_id: userId }),
        ...(dateRange[0] && { date_from: dateRange[0] }),
        ...(dateRange[1] && { date_to: dateRange[1] }),
        ...(sortStatus.columnAccessor && {
          sort_by: String(sortStatus.columnAccessor),
        }),
        ...(sortStatus.direction && { sort_direction: sortStatus.direction }),
      });

      const result = await fetchFromAPI<AdminListErrorLogsResult>(
        `${API_ENDPOINTS.admin.errorLogs}?${params.toString()}`,
      );

      if (result) {
        setLogs(result.logs || []);
        setTotalRecords(result.total_count || 0);
      }
    } catch (err) {
      console.error("Error fetching error logs:", err);
    } finally {
      setLoading(false);
    }
  }, [
    page,
    recordsPerPage,
    errorType,
    resolvedStatus,
    errorCode,
    requestPath,
    userId,
    dateRange,
    sortStatus,
  ]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    setPage(1);
  }, [
    errorType,
    resolvedStatus,
    errorCode,
    requestPath,
    userId,
    dateRange,
    sortStatus,
  ]);

  const hasActiveFilters = !!(
    errorType ||
    resolvedStatus ||
    errorCode ||
    requestPath ||
    userId ||
    dateRange[0] ||
    dateRange[1]
  );
  const activeFilterCount = [
    errorType,
    resolvedStatus,
    errorCode,
    requestPath,
    userId,
    dateRange[0],
    dateRange[1],
  ].filter(Boolean).length;

  const clearAllFilters = useCallback(() => {
    setErrorType(null);
    setResolvedStatus(null);
    setErrorCode("");
    setRequestPath("");
    setUserId("");
    setDateRange([null, null]);
  }, []);

  const handleRecordsPerPageChange = useCallback((n: number) => {
    setRecordsPerPage(n);
    setPage(1);
  }, []);

  const columns = useMemo(
    () => [
      {
        accessor: "error_created_at",
        title: "Created",
        width: 180,
        sortable: true,
        render: (log: ErrorLogEntry) => formatDate(log.error_created_at),
      },
      {
        accessor: "error_type",
        title: "Type",
        width: 160,
        sortable: true,
        render: (log: ErrorLogEntry) => (
          <ErrorTypeBadge type={log.error_type} />
        ),
      },
      {
        accessor: "error_code",
        title: "Code",
        width: 110,
        sortable: true,
        render: (log: ErrorLogEntry) => <ErrorCodeCell code={log.error_code} />,
      },
      {
        accessor: "error_message",
        title: "Message",
        render: (log: ErrorLogEntry) => (
          <ErrorMessageCell message={log.error_message} />
        ),
      },
      {
        accessor: "request_path",
        title: "Request Path",
        width: 200,
        sortable: true,
        render: (log: ErrorLogEntry) => (
          <RequestPathCell path={log.request_path} />
        ),
      },
      {
        accessor: "response_status",
        title: "Status",
        width: 110,
        sortable: true,
        render: (log: ErrorLogEntry) => log.response_status ?? "N/A",
      },
      {
        accessor: "error_resolved",
        title: "Resolved",
        width: 120,
        sortable: true,
        render: (log: ErrorLogEntry) => (
          <ResolvedStatusBadge resolved={log.error_resolved ?? false} />
        ),
      },
    ],
    [],
  );

  return (
    <Box component="section" aria-labelledby="error-log-title">
      <VisuallyHidden>
        <span id="error-log-title">Error Logs</span>
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
              aria-label="Error log filters"
              align="center"
              wrap="wrap"
            >
              <Popover
                width={420}
                position="bottom-start"
                shadow="md"
                opened={popoverOpened}
                onChange={setPopoverOpened}
                withinPortal={false}
              >
                <Popover.Target>
                  <Button
                    variant="filled"
                    color="#26316e"
                    leftSection={<IconFilter size={18} aria-hidden="true" />}
                    size="sm"
                    radius="md"
                    onClick={() => setPopoverOpened((o) => !o)}
                    aria-label={`Open filters${activeFilterCount > 0 ? ` (${activeFilterCount} active)` : ""}`}
                    aria-expanded={popoverOpened}
                    aria-haspopup="dialog"
                    aria-controls="error-log-filters"
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
                <Popover.Dropdown id="error-log-filters">
                  <FilterPopoverContent
                    popoverOpened={popoverOpened}
                    hasActiveFilters={hasActiveFilters}
                    clearAllFilters={clearAllFilters}
                    errorType={errorType}
                    setErrorType={setErrorType}
                    resolvedStatus={resolvedStatus}
                    setResolvedStatus={setResolvedStatus}
                    errorCode={errorCode}
                    setErrorCode={setErrorCode}
                    requestPath={requestPath}
                    setRequestPath={setRequestPath}
                    userId={userId}
                    setUserId={setUserId}
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
                aria-label="Refresh error logs"
                title="Refresh"
              >
                <IconRefresh size={18} aria-hidden="true" />
              </ActionIcon>
            </Flex>

            <ActiveFiltersDisplay
              hasActiveFilters={hasActiveFilters}
              errorType={errorType}
              resolvedStatus={resolvedStatus}
              errorCode={errorCode}
              requestPath={requestPath}
              userId={userId}
              dateRange={dateRange}
              setErrorType={setErrorType}
              setResolvedStatus={setResolvedStatus}
              setErrorCode={setErrorCode}
              setRequestPath={setRequestPath}
              setUserId={setUserId}
              setDateRange={setDateRange}
            />

            <Box
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "0 750px",
              }}
            >
              <AdminTable<ErrorLogEntry>
                fetching={loading}
                records={logs}
                idAccessor="error_log_id"
                totalRecords={totalRecords}
                recordsPerPage={recordsPerPage}
                recordsPerPageOptions={PAGE_SIZE_OPTIONS}
                onRecordsPerPageChange={handleRecordsPerPageChange}
                page={page}
                onPageChange={setPage}
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
                columns={columns}
                noRecordsText="No error logs found"
                onRowClick={({ record }) => handleRowClick(record)}
              />
            </Box>
            <ErrorLogDetailsModal
              opened={opened}
              onClose={close}
              errorLogId={selectedLogId}
              onUpdated={fetchLogs}
            />
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
