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
import { ACTIONS, ENTITY_TYPES } from "@/utils/constants";

export type FilterPopoverContentProps = {
  popoverOpened: boolean;
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  entityType: string | null;
  setEntityType: (v: string | null) => void;
  action: string | null;
  setAction: (v: string | null) => void;
  dateRange: [string | null, string | null];
  setDateRange: (v: [string | null, string | null]) => void;
};

const FilterPopoverContent = memo(
  ({
    popoverOpened,
    hasActiveFilters,
    clearAllFilters,
    entityType,
    setEntityType,
    action,
    setAction,
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
            Filter Activity Logs
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
          label="Entity Type"
          placeholder="Select entity type"
          data={ENTITY_TYPES}
          value={entityType}
          onChange={setEntityType}
          clearable
          searchable
          aria-label="Filter by entity type"
          data-testid="entity-type-select"
          comboboxProps={{ withinPortal: false }}
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
          data-testid="action-select"
          comboboxProps={{ withinPortal: false }}
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
