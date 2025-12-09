"use client";

// Add this import to fix the table layout and pagination styles
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
  Title,
  Tooltip,
  SegmentedControl,
  Tabs,
  Alert, // Added Alert
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// Added useSearchParams
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
  IconCheck, // Added IconCheck
  IconAlertCircle, // Added IconAlertCircle
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";

interface Location {
  id: string;
  name: string;
}

interface Locker {
  id: string;
  locker_code: string;
  location_id: string;
  is_available: boolean;
  location?: Location;
}

interface AssignedLocker {
  id: string;
  registration_id: string;
  locker_id: string;
  status: "Normal" | "Near Full" | "Full";
  registration?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function MailroomLockers() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignedLockers, setAssignedLockers] = useState<AssignedLocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [filterLocation, setFilterLocation] = useState<string | null>(null);

  // CHANGED: Replaced filterStatus with activeTab
  const [activeTab, setActiveTab] = useState<string | null>("all");

  // NEW: Alert States
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // NEW: Handle URL Query Params for Tab Selection
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [opened, { open, close }] = useDisclosure(false);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [formData, setFormData] = useState({
    locker_code: "",
    location_id: "",
    is_available: true,
  });

  const [capacityStatus, setCapacityStatus] = useState<string>("Normal");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // SWR handles initial fetch; nothing needed here
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterLocation, activeTab]); // Updated dependency

  // --- SWR Data Fetching ---
  const lockersKey = "/api/admin/mailroom/lockers";
  const locationsKey = "/api/admin/mailroom/locations";
  const assignedKey = "/api/admin/mailroom/assigned-lockers";

  const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to fetch ${url}`);
    }
    return res.json().catch(() => ({}));
  };

  const {
    data: lockersData,
    error: lockersError,
    isValidating: lockersValidating,
  } = useSWR(lockersKey, fetcher, { revalidateOnFocus: true });
  const {
    data: locationsData,
    error: locationsError,
    isValidating: locationsValidating,
  } = useSWR(locationsKey, fetcher, { revalidateOnFocus: true });
  const {
    data: assignedData,
    error: assignedError,
    isValidating: assignedValidating,
  } = useSWR(assignedKey, fetcher, { revalidateOnFocus: true });

  // derive arrays from responses (support { data: [...] } or bare arrays)
  const lockersArr =
    Array.isArray(lockersData) ||
    Array.isArray(lockersData?.data) ||
    (lockersData && typeof lockersData === "object")
      ? lockersData
      : [];
  const locationsArr =
    Array.isArray(locationsData) ||
    Array.isArray(locationsData?.data) ||
    (locationsData && typeof locationsData === "object")
      ? locationsData
      : [];
  const assignedArr =
    Array.isArray(assignedData) ||
    Array.isArray(assignedData?.data) ||
    (assignedData && typeof assignedData === "object")
      ? assignedData
      : [];

  // sync into local state and keep loading state in sync with SWR
  useEffect(() => {
    setLoading(lockersValidating || locationsValidating || assignedValidating);
    if (lockersArr.length) setLockers(lockersArr);
    if (locationsArr.length) setLocations(locationsArr);
    if (assignedArr.length) setAssignedLockers(assignedArr);

    // auto-fix ghost lockers (preserve previous behavior)
    if (lockersArr.length && assignedArr.length) {
      const assignedLockerIds = new Set(
        assignedArr.map((a: any) => a.locker_id)
      );
      const ghostLockers = lockersArr.filter(
        (l: any) => !l.is_available && !assignedLockerIds.has(l.id)
      );
      if (ghostLockers.length > 0) {
        (async () => {
          try {
            await Promise.all(
              ghostLockers.map((l: any) =>
                fetch(`/api/admin/mailroom/lockers/${l.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    locker_code: l.locker_code,
                    location_id: l.location_id,
                    is_available: true,
                  }),
                })
              )
            );
            notifications.show({
              title: "System Cleanup",
              message: `Automatically freed ${ghostLockers.length} lockers that had no active assignment.`,
              color: "orange",
              icon: <IconLockOpen size={16} />,
            });
            // revalidate lockers to reflect fixes
            await swrMutate(lockersKey);
          } catch (e) {
            console.error("Auto-fix failed:", e);
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockersData, locationsData, assignedData]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        swrMutate(lockersKey),
        swrMutate(locationsKey),
        swrMutate(assignedKey),
      ]);
    } catch (e) {
      console.error("refreshAll failed", e);
    } finally {
      setLoading(false);
    }
  };

  // NEW: Auto-dismiss global success
  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  // NEW: Clear form errors when modal opens
  useEffect(() => {
    if (opened) {
      setFormError(null);
    }
  }, [opened]);

  const clearFilters = () => {
    setSearch("");
    setFilterLocation(null);
    setActiveTab("all");
  };

  const hasFilters = search || filterLocation || activeTab !== "all";

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lockersRes, locationsRes, assignedRes] = await Promise.all([
        fetch("/api/admin/mailroom/lockers"),
        fetch("/api/admin/mailroom/locations"),
        fetch("/api/admin/mailroom/assigned-lockers"),
      ]);

      let fetchedLockers: Locker[] = [];
      let fetchedAssignments: AssignedLocker[] = [];

      if (lockersRes.ok) {
        const data = await lockersRes.json();
        fetchedLockers = Array.isArray(data) ? data : data.data || [];
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(Array.isArray(data) ? data : data.data || []);
      }
      if (assignedRes.ok) {
        const data = await assignedRes.json();
        fetchedAssignments = Array.isArray(data) ? data : data.data || [];
      }

      // --- AUTO-FIX LOGIC ---
      // If both fetches succeeded, check for lockers marked 'Occupied' but have no assignment
      if (lockersRes.ok && assignedRes.ok) {
        const assignedLockerIds = new Set(
          fetchedAssignments.map((a) => a.locker_id)
        );

        const ghostLockers = fetchedLockers.filter(
          (l) => !l.is_available && !assignedLockerIds.has(l.id)
        );

        if (ghostLockers.length > 0) {
          console.log("Fixing ghost lockers:", ghostLockers);

          // Update them in the database
          await Promise.all(
            ghostLockers.map((l) =>
              fetch(`/api/admin/mailroom/lockers/${l.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  locker_code: l.locker_code,
                  location_id: l.location_id,
                  is_available: true, // Force available
                }),
              })
            )
          );

          notifications.show({
            title: "System Cleanup",
            message: `Automatically freed ${ghostLockers.length} lockers that had no active assignment.`,
            color: "orange",
            icon: <IconLockOpen size={16} />,
          });

          // Update local state immediately so UI reflects the fix
          fetchedLockers = fetchedLockers.map((l) =>
            ghostLockers.find((g) => g.id === l.id)
              ? { ...l, is_available: true }
              : l
          );
        }
      }
      // ----------------------

      setLockers(fetchedLockers);
      setAssignedLockers(fetchedAssignments);
    } catch (error) {
      console.error("Failed to fetch data", error);
      notifications.show({
        title: "Error",
        message: "Failed to load data",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (locker?: Locker) => {
    if (locker) {
      setEditingLocker(locker);
      setFormData({
        locker_code: locker.locker_code,
        location_id: locker.location_id,
        is_available: locker.is_available,
      });

      const assignment = assignedLockers.find((a) => a.locker_id === locker.id);
      setCapacityStatus(assignment?.status || "Normal");
    } else {
      setEditingLocker(null);
      setFormData({
        locker_code: "",
        location_id: "",
        is_available: true,
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
    setFormError(null); // Clear previous errors

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

      if (!res.ok) throw new Error("Failed to save locker");

      const assignment = editingLocker
        ? assignedLockers.find((a) => a.locker_id === editingLocker.id)
        : null;

      if (editingLocker && assignment && capacityStatus !== assignment.status) {
        const statusRes = await fetch(
          `/api/admin/mailroom/assigned-lockers/${assignment.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: capacityStatus }),
          }
        );
        if (!statusRes.ok) console.error("Failed to update capacity status");
      }

      setGlobalSuccess(
        `Locker ${editingLocker ? "updated" : "created"} successfully`
      );

      close();
      await refreshAll();
    } catch (error: any) {
      console.error(error);
      setFormError(error.message || "Failed to save locker");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this locker?")) return;

    try {
      const res = await fetch(`/api/admin/mailroom/lockers/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      setGlobalSuccess("Locker deleted successfully");
      await refreshAll();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to delete locker",
        color: "red",
      });
    }
  };

  const filteredLockers = lockers.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      l.locker_code.toLowerCase().includes(q) ||
      l.location?.name.toLowerCase().includes(q);

    const matchesLocation = filterLocation
      ? l.location_id === filterLocation
      : true;

    // CHANGED: Tab Logic
    const matchesStatus =
      activeTab === "available"
        ? l.is_available
        : activeTab === "occupied"
        ? !l.is_available
        : true;

    return matchesSearch && matchesLocation && matchesStatus;
  });

  const paginatedLockers = filteredLockers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const activeAssignment = editingLocker
    ? assignedLockers.find((a) => a.locker_id === editingLocker.id)
    : null;

  return (
    <Stack align="center">
      {/* GLOBAL SUCCESS ALERT */}
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
            <TextInput
              placeholder="Search lockers..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Filter by Location"
              data={locations.map((l) => ({ value: l.id, label: l.name }))}
              value={filterLocation}
              onChange={setFilterLocation}
              clearable
              style={{ width: 200 }}
            />
            {/* Removed Status Select */}

            {hasFilters && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            )}
          </Group>
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenModal()}
          >
            Add Locker
          </Button>
        </Group>

        {/* NEW: Tabs for Status */}
        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="all" leftSection={<IconLayoutGrid size={16} />}>
              All Lockers
            </Tabs.Tab>
            <Tabs.Tab value="occupied" leftSection={<IconLock size={16} />}>
              Occupied
            </Tabs.Tab>
            <Tabs.Tab
              value="available"
              leftSection={<IconLockOpen size={16} />}
            >
              Available
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginatedLockers}
          fetching={loading}
          minHeight={200}
          totalRecords={filteredLockers.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={setPageSize}
          columns={[
            { accessor: "locker_code", title: "Locker Code", width: 150 },
            {
              accessor: "location.name",
              title: "Location",
              render: ({ location }: Locker) => location?.name || "Unknown",
            },
            {
              accessor: "is_available",
              title: "Status",
              width: 150,
              render: ({ is_available }: Locker) => (
                <Badge
                  color={is_available ? "green" : "red"}
                  variant="light"
                  leftSection={
                    is_available ? (
                      <IconLockOpen size={12} />
                    ) : (
                      <IconLock size={12} />
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
                const assignment = Array.isArray(assignedLockers)
                  ? assignedLockers.find((a) => a.locker_id === locker.id)
                  : null;

                if (!assignment)
                  return (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  );

                return (
                  <Badge
                    color={
                      assignment.status === "Full"
                        ? "red"
                        : assignment.status === "Near Full"
                        ? "orange"
                        : "blue"
                    }
                    variant="outline"
                    leftSection={<IconBox size={12} />}
                  >
                    {assignment.status || "Normal"}
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
                <Group gap="xs" justify="flex-end">
                  <Tooltip label="Edit">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => handleOpenModal(locker)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(locker.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          noRecordsText="No lockers found"
        />
      </Paper>

      {/* Add/Edit Locker Modal */}
      <Modal
        opened={opened}
        onClose={close}
        title={editingLocker ? "Edit Locker" : "Add Locker"}
        centered
      >
        <Stack>
          {/* FORM ERROR ALERT */}
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
            data={locations.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.location_id}
            onChange={(val) =>
              setFormData({ ...formData, location_id: val || "" })
            }
            required
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
                  onChange={setCapacityStatus}
                  fullWidth
                  size="xs"
                  data={[
                    { label: "Normal", value: "Normal" },
                    { label: "Near Full", value: "Near Full" },
                    { label: "Full", value: "Full" },
                  ]}
                  color={
                    capacityStatus === "Full"
                      ? "red"
                      : capacityStatus === "Near Full"
                      ? "orange"
                      : "blue"
                  }
                />
              </Stack>
            </Paper>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
