"use client";

import { memo } from "react";
import {
  Stack,
  Group,
  Text,
  Button,
  Divider,
  Select,
  TextInput,
} from "@mantine/core";
import { IconCalendar } from "@tabler/icons-react";
import { ERROR_RESOLUTION_STATUSES, ERROR_TYPES } from "@/utils/constants";

export type FilterPopoverContentProps = {
  popoverOpened: boolean;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  errorType: string | null;
  setErrorType: (v: string | null) => void;
  resolvedStatus: string | null;
  setResolvedStatus: (v: string | null) => void;
  errorCode: string;
  setErrorCode: (v: string) => void;
  requestPath: string;
  setRequestPath: (v: string) => void;
  userId: string;
  setUserId: (v: string) => void;
  dateRange: [string | null, string | null];
  setDateRange: (v: [string | null, string | null]) => void;
};

const FilterPopoverContent = memo(
  ({
    popoverOpened,
    hasActiveFilters,
    clearAllFilters,
    errorType,
    setErrorType,
    resolvedStatus,
    setResolvedStatus,
    errorCode,
    setErrorCode,
    requestPath,
    setRequestPath,
    userId,
    setUserId,
    dateRange,
    setDateRange,
  }: FilterPopoverContentProps) => {
    if (!popoverOpened) return null;

    return (
      <Stack
        gap="md"
        component="form"
        role="dialog"
        aria-label="Filter options"
      >
        <Group justify="space-between">
          <Text fw={600} size="sm" component="h2">
            Filter Error Logs
          </Text>
          {hasActiveFilters && (
            <Button
              variant="subtle"
              size="xs"
              color="red"
              onClick={clearAllFilters}
              aria-label="Clear all filters"
              data-testid="clear-all-filters-button"
            >
              Clear All
            </Button>
          )}
        </Group>

        <Divider />

        <Select
          label="Error Type"
          placeholder="Select error type"
          data={ERROR_TYPES}
          value={errorType}
          onChange={setErrorType}
          clearable
          searchable
          aria-label="Filter by error type"
          data-testid="error-type-select"
          comboboxProps={{ withinPortal: false }}
        />

        <Select
          label="Resolved Status"
          placeholder="Select status"
          data={ERROR_RESOLUTION_STATUSES}
          value={resolvedStatus}
          onChange={setResolvedStatus}
          clearable
          aria-label="Filter by resolution status"
          data-testid="resolved-status-select"
          comboboxProps={{ withinPortal: false }}
        />

        <TextInput
          label="Error Code"
          placeholder="Search by error code"
          value={errorCode}
          onChange={(e) => setErrorCode(e.currentTarget.value)}
          aria-label="Filter by error code"
          data-testid="error-code-filter"
        />

        <TextInput
          label="Request Path"
          placeholder="Search by request path"
          value={requestPath}
          onChange={(e) => setRequestPath(e.currentTarget.value)}
          aria-label="Filter by request path"
          data-testid="request-path-filter"
        />

        <TextInput
          label="User ID"
          placeholder="Filter by user id"
          value={userId}
          onChange={(e) => setUserId(e.currentTarget.value)}
          aria-label="Filter by user id"
          data-testid="user-id-filter"
        />

        <Divider label="Date Range" labelPosition="center" />

        <TextInput
          label="From Date"
          type="date"
          placeholder="Pick start date"
          data-testid="from-date-filter"
          leftSection={<IconCalendar size={16} aria-hidden="true" />}
          value={dateRange[0] || ""}
          onChange={(e) =>
            setDateRange([e.currentTarget.value || null, dateRange[1]])
          }
          aria-label="Filter from date"
        />

        <TextInput
          label="To Date"
          type="date"
          placeholder="Pick end date"
          data-testid="to-date-filter"
          leftSection={<IconCalendar size={16} aria-hidden="true" />}
          value={dateRange[1] || ""}
          onChange={(e) =>
            setDateRange([dateRange[0], e.currentTarget.value || null])
          }
          aria-label="Filter to date"
        />
      </Stack>
    );
  },
);

FilterPopoverContent.displayName = "FilterPopoverContent";

export default FilterPopoverContent;
