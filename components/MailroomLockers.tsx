"use client";

import "mantine-datatable/styles.layer.css";
import React, { useEffect, useMemo, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import useSWRInfinite from "swr/infinite";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
  SegmentedControl,
  Tabs,
  Alert,
  Switch,
} from "@mantine/core";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { useSearchParams } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconTrash,
  IconLock,
  IconLockOpen,
  IconLayoutGrid,
  IconCheck,
  IconAlertCircle,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { AdminTable } from "./common/AdminTable";
import { DataTableColumn, type DataTableSortStatus } from "mantine-datatable";
import { getStatusFormat } from "@/utils/helper";
import { T_LocationLocker } from "@/utils/types";

const SearchInput = React.memo(
  ({
    onSearch,
    searchQuery,
  }: {
    onSearch: (value: string) => void;
    searchQuery: string;
  }) => {
    const [value, setValue] = useState(searchQuery);

    // Sync internal value when parent searchQuery changes (e.g. Clear Filters)
    useEffect(() => {
      setValue(searchQuery);
    }, [searchQuery]);

    const handleSearch = () => {
      onSearch(value);
    };

    const handleClear = () => {
      setValue("");
      onSearch("");
    };

    return (
      <TextInput
        placeholder="Search lockers By code..."
        aria-label="Search lockers"
        leftSection={<IconSearch size={16} aria-hidden="true" />}
        rightSectionWidth={value ? 70 : 42}
        rightSection={
          value ? (
            <Group gap={4}>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="gray.7"
                onClick={handleClear}
                aria-label="Clear search"
              >
                <IconX size={16} aria-hidden="true" />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="indigo"
                onClick={handleSearch}
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
              onClick={handleSearch}
              aria-label="Submit search"
            >
              <IconArrowRight size={16} aria-hidden="true" />
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
        style={{ flex: 1 }}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

type Location = {
  mailroom_location_id: string;
  mailroom_location_name: string;
};

type Locker = T_LocationLocker;

const fetcherLockers = async (
  url: string,
): Promise<{
  data: Locker[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}> => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  const json = await res.json();
  console.log("admin lockers payload:", json);
  return json;
};

export default function MailroomLockers() {
  // const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [filterLocation, setFilterLocation] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<Locker>>({
    columnAccessor: "locker_code",
    direction: "asc",
  });

  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [lockerToDelete, setLockerToDelete] = useState<string | null>(null);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [formData, setFormData] = useState({
    locker_code: "",
    location_id: "",
    is_assignable: true,
  });

  const [capacityStatus, setCapacityStatus] = useState<string>("Normal");
  const [submitting, setSubmitting] = useState(false);

  const handleSearchSubmit = React.useCallback(
    (val: string) => {
      if (val === query && page === 1) return;
      setIsSearching(true);
      setQuery(val);
      setPage(1);
    },
    [query, page],
  );

  const lockersKey = `/api/admin/mailroom/lockers?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(query)}&locationId=${filterLocation || ""}&activeTab=${activeTab}&sortBy=${sortStatus.columnAccessor}&sortOrder=${sortStatus.direction}`;
  const fetcherLocations = async (url: string): Promise<Location[]> => {
    const res = await fetch(url);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Failed to fetch ${url}`);
    }
    const payload = await res
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const data = payload.data ?? payload;
    if (!Array.isArray(data)) return [];
    return (data as unknown[]).map((r) => {
      const row = r as Record<string, unknown>;
      return {
        mailroom_location_id: String(row.id ?? row.mailroom_location_id ?? ""),
        mailroom_location_name: String(
          row.name ?? row.mailroom_location_name ?? "",
        ),
      } as Location;
    });
  };

  const getLocationsKey = (
    pageIndex: number,
    previousPageData: Location[] | null,
  ) => {
    if (previousPageData && !previousPageData.length) return null;
    if (pageIndex > 0) return null; // Fetch all in one go
    return `/api/admin/mailroom/locations?page=1&pageSize=1000`;
  };

  const {
    data: infiniteLocationsData,
    // size: locationsSize,
    // setSize: setLocationsSize,
  } = useSWRInfinite(getLocationsKey, fetcherLocations, {
    revalidateOnFocus: false,
    dedupingInterval: 10000,
    keepPreviousData: true,
  });

  // Flatten locations
  useEffect(() => {
    if (infiniteLocationsData) {
      const all = infiniteLocationsData.flatMap((d) => d);
      setLocations(all);
    }
  }, [infiniteLocationsData]);

  const { data: overviewData, isValidating } = useSWR(
    lockersKey,
    fetcherLockers,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      keepPreviousData: true,
    },
  );

  const lockers = useMemo(() => overviewData?.data || [], [overviewData]);

  const refreshAll = async () => {
    try {
      await swrMutate(lockersKey);
    } catch {
      // noop
    }
  };

  useEffect(() => {
    if (overviewData) {
      setIsSearching(false);
    }
  }, [overviewData]);

  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [globalSuccess]);

  useEffect(() => {
    if (opened) setFormError(null);
  }, [opened]);

  const clearFilters = () => {
    setQuery("");
    setFilterLocation(null);
    setActiveTab("all");
    setPage(1);
  };

  const handleOpenModal = (locker?: Locker) => {
    if (locker) {
      setEditingLocker(locker);
      setFormData({
        locker_code: locker.location_locker_code || "",
        location_id: locker.mailroom_location_id || "",

        is_assignable: locker.location_locker_is_assignable ?? true,
      });
      setCapacityStatus(
        locker.assigned?.mailroom_assigned_locker_status ?? "Normal",
      );
    } else {
      setEditingLocker(null);
      setFormData({
        locker_code: "",
        location_id: "",

        is_assignable: true,
      });
      setCapacityStatus("Normal");
    }

    open();
  };

  const handleSubmit = async () => {
    if (!formData.locker_code || !formData.location_id) {
      setFormError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const url = editingLocker
        ? `/api/admin/mailroom/lockers/${editingLocker.location_locker_id}`
        : "/api/admin/mailroom/lockers";
      const method = editingLocker ? "PUT" : "POST";

      const payload = {
        ...formData,
        ...(editingLocker && { assignment_status: capacityStatus }),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to save locker");
      }

      const result = (await res.json().catch(() => ({}))) as {
        data?: Locker;
      };

      if (editingLocker && result?.data) {
        // Optimistically update the current list so the table reflects changes immediately
        await swrMutate(
          lockersKey,
          (
            current:
              | {
                  data: Locker[];
                  pagination: {
                    page: number;
                    pageSize: number;
                    totalCount: number;
                    totalPages: number;
                  };
                }
              | undefined,
          ) => {
            if (!current) return current;
            const merged = {
              ...editingLocker,
              ...result.data,
              location_locker_code: formData.locker_code,
              mailroom_location_id: formData.location_id,

              location_locker_is_assignable: formData.is_assignable,
            };
            return {
              ...current,
              data: current.data.map((l) =>
                l.location_locker_id === merged.location_locker_id
                  ? { ...l, ...merged }
                  : l,
              ),
            };
          },
          false,
        );
      }

      setGlobalSuccess(
        `Locker ${editingLocker ? "updated" : "created"} successfully`,
      );
      close();
      void refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setFormError(msg || "Failed to save locker");
    } finally {
      setSubmitting(false);
    }
  };

  const activeAssignment = editingLocker?.assigned ?? null;

  const handleDelete = (id: string) => {
    setLockerToDelete(id);
    openDeleteModal();
  };

  const confirmDelete = async () => {
    if (!lockerToDelete) return;

    try {
      const res = await fetch(`/api/admin/mailroom/lockers/${lockerToDelete}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to delete");
      }
      setGlobalSuccess("Locker deleted successfully");
      closeDeleteModal();
      void refreshAll();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      notifications.show({
        title: "Error",
        message: msg || "Failed to delete locker",
        color: "red",
      });
    } finally {
      closeDeleteModal();
      setLockerToDelete(null);
    }
  };

  const columns = React.useMemo<DataTableColumn<Locker>[]>(
    () => [
      {
        accessor: "location_locker_code",
        title: "Locker Code",
        sortable: true,
        render: ({ location_locker_code }: Locker) => (
          <Text fw={700} c="dark.4" size="sm">
            {location_locker_code}
          </Text>
        ),
      },
      {
        accessor: "mailroom_location_name",
        title: "Location",
        sortable: true,
        render: ({ location }: Locker) => (
          <Text size="sm" c="dark.3" fw={500}>
            {location?.mailroom_location_name ?? "Unknown"}
          </Text>
        ),
      },
      {
        accessor: "location_locker_is_available",
        title: "Status",
        sortable: true,
        render: (locker: Locker) => {
          const isAvail = locker.location_locker_is_available;
          return (
            <Badge color={isAvail ? "teal" : "red"} variant="dot">
              {isAvail ? "Available" : "Occupied"}
            </Badge>
          );
        },
      },
      {
        accessor: "location_locker_is_assignable",
        title: "Assignable",
        sortable: true,
        render: (locker: Locker) => {
          const isAssignable = locker.location_locker_is_assignable ?? true;
          return (
            <Badge color={isAssignable ? "teal" : "gray"} variant="outline">
              {isAssignable ? "Yes" : "No"}
            </Badge>
          );
        },
      },
      {
        accessor: "mailroom_assigned_locker_status",
        title: "Capacity Status",
        sortable: true,
        render: ({ assigned }: Locker) => {
          const status = assigned?.mailroom_assigned_locker_status || "-";
          return (
            <Badge color={getStatusFormat(status)} variant="outline">
              {status}
            </Badge>
          );
        },
      },
      // {
      //   accessor: "location_locker_created_at",
      //   title: "Date Added",
      //   sortable: true,
      //   render: ({ location_locker_created_at }: Locker) => (
      //     <Text size="sm" c="dark.3">
      //       {location_locker_created_at
      //         ? new Date(location_locker_created_at).toLocaleDateString()
      //         : "-"}
      //     </Text>
      //   ),
      // },
      {
        accessor: "actions",
        title: "Actions",
        textAlign: "right",
        render: (locker: Locker) => (
          <Group gap={4} justify="right" wrap="nowrap">
            <Tooltip label="Edit locker">
              <ActionIcon
                variant="subtle"
                color="blue.8"
                onClick={() => handleOpenModal(locker)}
                aria-label={`Edit locker ${locker.location_locker_code}`}
              >
                <IconEdit size={16} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete locker permanently">
              <ActionIcon
                variant="subtle"
                color="red.8"
                onClick={() => handleDelete(locker.location_locker_id)}
                aria-label={`Delete locker ${locker.location_locker_code}`}
              >
                <IconTrash size={16} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [getStatusFormat, handleOpenModal, handleDelete],
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
          maw={1200}
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
        {isMobile ? (
          <Stack mb="md">
            <SearchInput onSearch={handleSearchSubmit} searchQuery={query} />
            <Group grow>
              <Select
                placeholder="Filter by Location"
                aria-label="Filter by location"
                data={locations.map((l) => ({
                  value: l.mailroom_location_id,
                  label: l.mailroom_location_name,
                }))}
                value={filterLocation}
                onChange={(val) => {
                  setFilterLocation(val ?? null);
                  setPage(1);
                }}
                clearable
                searchable
              />
              <Group gap="xs">
                <Button
                  leftSection={<IconPlus size={16} aria-hidden="true" />}
                  onClick={() => handleOpenModal()}
                  aria-label="Add new locker"
                  color="#1e3a8a"
                  style={{ flex: 1 }}
                >
                  Add
                </Button>
                <Tooltip label="Refresh data">
                  <ActionIcon
                    color="#1e3a8a"
                    size="lg"
                    onClick={refreshAll}
                    loading={isValidating && !isSearching}
                  >
                    <IconRefresh size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Group>
            {(query || filterLocation || activeTab !== "all") && (
              <Button
                variant="subtle"
                color="red.8"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
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
              <SearchInput onSearch={handleSearchSubmit} searchQuery={query} />
              <Select
                placeholder="Filter by Location"
                aria-label="Filter by location"
                data={locations.map((l) => ({
                  value: l.mailroom_location_id,
                  label: l.mailroom_location_name,
                }))}
                value={filterLocation}
                onChange={(val) => {
                  setFilterLocation(val ?? null);
                  setPage(1);
                }}
                clearable
                searchable
                style={{ width: 200, flexShrink: 0 }}
              />

              {(query || filterLocation || activeTab !== "all") && (
                <Button
                  variant="subtle"
                  color="red.8"
                  size="sm"
                  onClick={clearFilters}
                  aria-label="Clear all filters"
                >
                  Clear Filters
                </Button>
              )}
            </Group>
            <Group gap="xs">
              <Button
                leftSection={<IconPlus size={16} aria-hidden="true" />}
                onClick={() => handleOpenModal()}
                aria-label="Add new locker"
                color="#1e3a8a"
              >
                Add Locker
              </Button>

              <Button
                aria-label="Refresh data"
                color="#1e3a8a"
                onClick={refreshAll}
                loading={isValidating && !isSearching}
              >
                <IconRefresh size={18} />
              </Button>
            </Group>
          </Group>
        )}

        <Tabs
          id="mailroom-lockers-tabs"
          value={activeTab}
          onChange={(val: string | null) => setActiveTab(val ?? "all")}
          mb="md"
        >
          <Tabs.List aria-label="Locker status filter">
            <Tabs.Tab
              value="all"
              leftSection={<IconLayoutGrid size={16} aria-hidden="true" />}
            >
              All Lockers
            </Tabs.Tab>
            <Tabs.Tab
              value="occupied"
              leftSection={<IconLock size={16} aria-hidden="true" />}
            >
              Occupied
            </Tabs.Tab>
            <Tabs.Tab
              value="available"
              leftSection={<IconLockOpen size={16} aria-hidden="true" />}
            >
              Available
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={activeTab}>
            <div
              style={{
                marginTop: "1rem",
                contentVisibility: "auto",
                containIntrinsicSize: "400px",
              }}
            >
              <AdminTable<Locker>
                idAccessor="location_locker_id"
                records={isSearching ? [] : lockers}
                fetching={isValidating || isSearching}
                totalRecords={overviewData?.pagination?.totalCount ?? 0}
                recordsPerPage={pageSize}
                page={page}
                onPageChange={setPage}
                recordsPerPageOptions={[10, 20, 50]}
                onRecordsPerPageChange={(n: number) => {
                  setPageSize(n);
                  setPage(1);
                }}
                recordsPerPageLabel="Lockers per page"
                noRecordsText="No records found"
                columns={columns}
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
              />
            </div>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete this locker? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={closeDeleteModal}
              aria-label="Cancel deletion"
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={confirmDelete}
              aria-label="Confirm locker deletion"
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={opened}
        onClose={close}
        title={editingLocker ? "Edit Locker" : "Add Locker"}
        centered
      >
        <Stack>
          {formError && (
            <Alert
              variant="light"
              color="red"
              title="Error"
              icon={<IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <TextInput
            label="Locker Code"
            placeholder="e.g. A-101"
            required
            value={formData.locker_code}
            onChange={(e) =>
              setFormData({ ...formData, locker_code: e.currentTarget.value })
            }
          />
          <Select
            label="Location"
            searchable
            clearable
            placeholder="Select location"
            aria-label="Select locker location"
            data={locations.map((l) => ({
              value: l.mailroom_location_id,
              label: l.mailroom_location_name,
            }))}
            value={formData.location_id}
            onChange={(val) =>
              setFormData({ ...formData, location_id: val ?? "" })
            }
            required
            // allow changing location in both add and edit flows
          />

          <Group justify="space-between" align="center">
            <Text size="sm">Assignable</Text>
            <Switch
              checked={formData.is_assignable}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_assignable: e.currentTarget.checked,
                })
              }
              aria-label="Set locker assignable"
            />
          </Group>

          {activeAssignment && (
            <Paper
              withBorder
              p="sm"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Assigned To:
                  </Text>
                  <Text size="sm">
                    {activeAssignment?.registration?.full_name}
                  </Text>
                </Group>

                <Text size="sm" fw={600}>
                  Capacity Status
                </Text>
                <SegmentedControl
                  value={capacityStatus}
                  onChange={(val: string) => setCapacityStatus(val)}
                  fullWidth
                  size="xs"
                  data={[
                    { label: "Empty", value: "Empty" },
                    { label: "Normal", value: "Normal" },
                    { label: "Near Full", value: "Near Full" },
                    { label: "Full", value: "Full" },
                  ]}
                  color={getStatusFormat(capacityStatus)}
                  aria-label="Set capacity status"
                />
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close} aria-label="Cancel form">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              loading={submitting}
              aria-label="Save locker details"
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
