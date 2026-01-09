"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
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
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useSearchParams } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconLock,
  IconLockOpen,
  IconBox,
  IconLayoutGrid,
  IconCheck,
  IconAlertCircle,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dynamic from "next/dynamic";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";
const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        aria-busy="true"
        aria-hidden="true"
      >
        <div style={{ display: "flex", gap: "10px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 40,
                flex: 1,
                backgroundColor: "#f1f3f5",
                borderRadius: "4px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 52,
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        ))}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `,
          }}
        />
      </div>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;

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
        style={{ width: "100%", maxWidth: 350 }}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

type Location = {
  id: string;
  name: string;
};

type Locker = {
  id: string;
  locker_code: string;
  location_id: string;
  is_available: boolean;
  location?: Location | null;
  // keep optional DB-style keys that may appear in payloads
  location_locker_id?: string;
  // optional assigned payload embedded on lockers (overview expanded)
  assigned?: {
    id?: string;
    registration_id?: string;
    status?: string;
    registration?: {
      id?: string;
      full_name?: string;
      email: string;
    } | null;
  } | null;
};

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
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  return res.json();
};

export default function MailroomLockers() {
  const [lockers, setLockers] = useState<Locker[]>([]);
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

  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [lockerToDelete, setLockerToDelete] = useState<string | null>(null);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [formData, setFormData] = useState({
    locker_code: "",
    location_id: "",
    is_available: true,
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

  const lockersKey = `/api/admin/mailroom/lockers?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(query)}&locationId=${filterLocation || ""}&activeTab=${activeTab}`;
  const locationsKey = "/api/admin/mailroom/locations";

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
        id: String(row.id ?? row.mailroom_location_id ?? ""),
        name: String(row.name ?? row.mailroom_location_name ?? ""),
      } as Location;
    });
  };

  const { data: overviewData, isValidating } = useSWR(
    lockersKey,
    fetcherLockers,
    {
      revalidateOnFocus: false,
      dedupingInterval: 10000,
      keepPreviousData: true,
    },
  );
  const { data: locationsData } = useSWR(locationsKey, fetcherLocations, {
    revalidateOnFocus: false,
  });

  useEffect(() => {
    if (!isValidating) {
      setIsSearching(false);
    }
  }, [isValidating]);

  useEffect(() => {
    if (overviewData?.data) {
      setLockers(overviewData.data);
    } else {
      setLockers([]);
    }

    if (Array.isArray(locationsData) && locationsData.length > 0) {
      setLocations(locationsData);
    }
  }, [overviewData, locationsData]);

  const refreshAll = async () => {
    try {
      await swrMutate(lockersKey);
    } catch {
      // noop
    }
  };

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
        locker_code: locker.locker_code,
        location_id: locker.location_id,
        is_available: locker.is_available,
      });
      setCapacityStatus(locker.assigned?.status ?? "Normal");
    } else {
      setEditingLocker(null);
      setFormData({ locker_code: "", location_id: "", is_available: true });
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
        ? `/api/admin/mailroom/lockers/${editingLocker.id}`
        : "/api/admin/mailroom/lockers";
      const method = editingLocker ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || "Failed to save locker");
      }

      // if locker has an assignment, update its capacity status
      const assignment = editingLocker?.assigned;

      if (editingLocker && assignment && capacityStatus !== assignment.status) {
        const assignmentId = assignment.id;
        if (assignmentId) {
          const statusRes = await fetch(
            `/api/admin/mailroom/assigned-lockers/${assignmentId}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: capacityStatus }),
            },
          );
          if (!statusRes.ok) {
            void (await statusRes.text().catch(() => ""));
          }
        }
      }

      setGlobalSuccess(
        `Locker ${editingLocker ? "updated" : "created"} successfully`,
      );
      close();
      await refreshAll();
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
      await refreshAll();
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

  const getCapacityBadgeColor = React.useCallback(
    (status: string | undefined) => {
      if (status === "Full") return "#7f1d1d"; // Dark Red
      if (status === "Near Full") return "#7c2d12"; // Dark Orange
      if (status === "Empty") return "#374151"; // Dark Gray
      return "#1e3a8a"; // Dark Blue
    },
    [],
  );

  const segmentedColor = React.useMemo(() => {
    if (capacityStatus === "Full") return "red";
    if (capacityStatus === "Near Full") return "orange";
    if (capacityStatus === "Empty") return "gray";
    return "blue";
  }, [capacityStatus]);

  const columns = React.useMemo<DataTableColumn<Locker>[]>(
    () => [
      { accessor: "locker_code", title: "Locker Code", width: 150 },
      {
        accessor: "location.name",
        title: "Location",
        render: ({ location }: Locker) => location?.name ?? "Unknown",
      },
      {
        accessor: "is_available",
        title: "Status",
        width: 150,
        render: ({ is_available }: Locker) => (
          <Badge
            color={is_available ? "#064e3b" : "#7f1d1d"}
            variant="outline"
            size="sm"
            fw={700}
            tt="none"
            leftSection={
              is_available ? (
                <IconLockOpen size={12} aria-hidden="true" />
              ) : (
                <IconLock size={12} aria-hidden="true" />
              )
            }
          >
            {is_available ? "Available" : "Occupied"}
          </Badge>
        ),
      },
      {
        accessor: "capacity",
        title: "Capacity Status",
        width: 150,
        render: (locker: Locker) => {
          const assignment = locker.assigned;

          if (!assignment) {
            return (
              <Text size="sm" c="gray.7">
                —
              </Text>
            );
          }

          const color = getCapacityBadgeColor(assignment.status);

          return (
            <Badge
              color={color}
              variant="outline"
              size="sm"
              fw={700}
              tt="none"
              leftSection={<IconBox size={12} aria-hidden="true" />}
            >
              {assignment.status ?? "Normal"}
            </Badge>
          );
        },
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 100,
        textAlign: "right",
        render: (locker: Locker) => (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Tooltip label="Edit locker details">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={() => handleOpenModal(locker)}
                aria-label={`Edit locker ${locker.locker_code}`}
              >
                <IconEdit size={16} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete locker permanently">
              <ActionIcon
                variant="subtle"
                color="red.8"
                onClick={() => handleDelete(locker.id)}
                aria-label={`Delete locker ${locker.locker_code}`}
              >
                <IconTrash size={16} aria-hidden="true" />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [getCapacityBadgeColor, handleOpenModal, handleDelete],
  );

  return (
    <Stack align="center">
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

      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <Group style={{ flex: 1 }}>
            <SearchInput onSearch={handleSearchSubmit} searchQuery={query} />
            <Select
              placeholder="Filter by Location"
              aria-label="Filter by location"
              data={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={filterLocation}
              onChange={(val) => {
                setFilterLocation(val ?? null);
                setPage(1);
              }}
              clearable
              style={{ width: 200 }}
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
          <Button
            leftSection={<IconPlus size={16} aria-hidden="true" />}
            onClick={() => handleOpenModal()}
            aria-label="Add new locker"
            color="#1e3a8a"
          >
            Add Locker
          </Button>
        </Group>

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
            <div style={{ marginTop: "1rem" }}>
              <DataTable
                aria-label="Lockers list"
                withTableBorder
                borderRadius="sm"
                striped
                highlightOnHover
                records={isSearching ? [] : lockers}
                fetching={isValidating || isSearching}
                minHeight={minTableHeight(pageSize)}
                totalRecords={overviewData?.pagination?.totalCount ?? 0}
                recordsPerPage={pageSize}
                page={page}
                onPageChange={setPage}
                recordsPerPageOptions={[10, 20, 50]}
                onRecordsPerPageChange={(n: number) => {
                  setPageSize(n);
                  setPage(1);
                }}
                paginationText={({ from, to, totalRecords }) =>
                  `Showing ${from} to ${to} of ${totalRecords} lockers`
                }
                recordsPerPageLabel="Lockers per page"
                noRecordsText="No records found"
                columns={columns}
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
            placeholder="Select location"
            aria-label="Select locker location"
            data={locations.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.location_id}
            onChange={(val) =>
              setFormData({ ...formData, location_id: val ?? "" })
            }
            required
            // allow changing location in both add and edit flows
          />

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
                    {activeAssignment.registration?.full_name}
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
                  color={segmentedColor}
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

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
