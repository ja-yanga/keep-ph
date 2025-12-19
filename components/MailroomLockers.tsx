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
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";

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

type AssignedLocker = {
  id: string;
  registration_id: string;
  locker_id: string;
  status: "Empty" | "Normal" | "Near Full" | "Full";
  registration?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
};

const fetcherLockers = async (
  url: string,
): Promise<{
  lockers: Locker[];
  locations: Location[];
  assigned: AssignedLocker[];
}> => {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  const payload = (await res
    .json()
    .catch(() => ({}) as Record<string, unknown>)) as Record<string, unknown>;
  const data: unknown = payload.data ?? payload;

  let rawLockers: unknown[] = [];
  if (Array.isArray(data)) {
    rawLockers = data as unknown[];
  } else if (Array.isArray((data as Record<string, unknown>)?.lockers)) {
    rawLockers = (data as Record<string, unknown>).lockers as unknown[];
  } else {
    rawLockers = [];
  }
  const lockers = (rawLockers ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    const locationTable = row.mailroom_location_table as
      | Record<string, unknown>
      | undefined;
    const assignedRow = (row.assigned ??
      (row as Record<string, unknown>).assigned) as
      | Record<string, unknown>
      | undefined;

    const assignedMapped =
      assignedRow == null
        ? null
        : {
            id: String(
              assignedRow.mailroom_assigned_locker_id ?? assignedRow.id ?? "",
            ),
            registration_id: String(
              assignedRow.mailroom_registration_id ??
                assignedRow.registration_id ??
                "",
            ),
            locker_id: String(
              assignedRow.location_locker_id ??
                assignedRow.locker_id ??
                row.location_locker_id ??
                row.id ??
                "",
            ),
            status: String(
              assignedRow.mailroom_assigned_locker_status ??
                assignedRow.status ??
                "Normal",
            ) as AssignedLocker["status"],
            registration: assignedRow.registration
              ? {
                  id: String(
                    (assignedRow.registration as Record<string, unknown>)
                      .mailroom_registration_id ??
                      (assignedRow.registration as Record<string, unknown>)
                        .id ??
                      "",
                  ),
                  full_name: String(
                    (assignedRow.registration as Record<string, unknown>)
                      .full_name ?? "",
                  ),
                  email: String(
                    (assignedRow.registration as Record<string, unknown>)
                      .email ?? "",
                  ),
                }
              : null,
          };

    return {
      id: String(row.id ?? row.location_locker_id ?? ""),
      locker_code: String(row.code ?? row.location_locker_code ?? ""),
      location_id: String(row.location_id ?? row.mailroom_location_id ?? ""),
      is_available: Boolean(
        row.is_available ?? row.location_locker_is_available ?? true,
      ),
      location: locationTable
        ? {
            id: String(locationTable.mailroom_location_id ?? ""),
            name: String(locationTable.mailroom_location_name ?? ""),
          }
        : ((row.location as Locker["location"]) ?? null),
      // preserve DB-style id for matching
      location_locker_id: String(row.location_locker_id ?? row.id ?? ""),
      assigned: assignedMapped,
    } as Locker;
  });

  const rawLocations: unknown[] = Array.isArray(
    (data as Record<string, unknown>)?.locations,
  )
    ? ((data as Record<string, unknown>).locations as unknown[])
    : [];
  const locations = (rawLocations ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? row.mailroom_location_id ?? ""),
      name: String(row.name ?? row.mailroom_location_name ?? ""),
    } as Location;
  });

  const dataRecord = data as Record<string, unknown>;
  let rawAssigned: unknown[] = [];
  if (Array.isArray(dataRecord.assigned)) {
    rawAssigned = dataRecord.assigned as unknown[];
  } else if (Array.isArray(dataRecord.assigned_lockers)) {
    rawAssigned = dataRecord.assigned_lockers as unknown[];
  }

  const assigned = (rawAssigned ?? []).map((r) => {
    const row = r as Record<string, unknown>;
    return {
      id: String(row.id ?? row.assigned_locker_id ?? ""),
      registration_id: String(row.registration_id ?? ""),
      locker_id: String(row.locker_id ?? row.location_locker_id ?? ""),
      status: (row.status as AssignedLocker["status"]) ?? "Normal",
      registration: row.registration
        ? {
            id: String((row.registration as Record<string, unknown>).id ?? ""),
            full_name: String(
              (row.registration as Record<string, unknown>).full_name ?? "",
            ),
            email: String(
              (row.registration as Record<string, unknown>).email ?? "",
            ),
          }
        : null,
    } as AssignedLocker;
  });

  return { lockers, locations, assigned };
};

export default function MailroomLockers() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignedMap, setAssignedMap] = useState<
    Record<string, AssignedLocker | undefined>
  >({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [formData, setFormData] = useState({
    locker_code: "",
    location_id: "",
    is_available: true,
  });

  const [capacityStatus, setCapacityStatus] = useState<string>("Normal");
  const [submitting, setSubmitting] = useState(false);

  const lockersKey = "/api/admin/mailroom/lockers?expanded=1";
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

  const { data: overviewData, isValidating: overviewValidating } = useSWR(
    lockersKey,
    fetcherLockers,
    { revalidateOnFocus: true },
  );
  const { data: locationsData } = useSWR(locationsKey, fetcherLocations, {
    revalidateOnFocus: true,
  });

  useEffect(() => {
    setLoading(Boolean(overviewValidating));
    if (overviewData) {
      // keep raw locker fields (including DB-style keys) on objects
      const lockersPayload = (overviewData.lockers ?? []).map((lk) => ({
        ...lk,
        // ensure DB-style id field is present for matching
        location_locker_id: String(
          (lk as Record<string, unknown>).location_locker_id ??
            (lk as Record<string, unknown>).id ??
            "",
        ),
      })) as Locker[];
      setLockers(lockersPayload);

      // prefer dedicated locations endpoint; fallback to overviewData.locations; final fallback derive from lockers
      if (Array.isArray(locationsData) && locationsData.length > 0) {
        setLocations(locationsData);
      } else if (
        Array.isArray(overviewData.locations) &&
        overviewData.locations.length > 0
      ) {
        setLocations(overviewData.locations as Location[]);
      } else {
        const fromLockers: Location[] = [];
        const raw = overviewData.lockers ?? [];
        for (const lk of raw) {
          if (!lk.location) continue;
          if (!fromLockers.some((x) => x.id === lk.location!.id)) {
            fromLockers.push(lk.location);
          }
        }
        setLocations(fromLockers);
      }
      // build assignedLockers array and a fast lookup map keyed by normalized locker id
      let derivedAssigned: AssignedLocker[] = [];
      if (
        Array.isArray(overviewData.assigned) &&
        overviewData.assigned.length > 0
      ) {
        derivedAssigned = overviewData.assigned as AssignedLocker[];
      } else {
        const rawLockers = overviewData.lockers ?? [];
        for (const lk of rawLockers) {
          if (!lk || !(lk as Locker).assigned) continue;
          const aRec = (lk as Locker).assigned as Record<string, unknown>;
          const regRec = (aRec.registration ?? undefined) as
            | Record<string, unknown>
            | undefined;

          const id = String(aRec.id ?? aRec.mailroom_assigned_locker_id ?? "");
          const registrationId = String(
            aRec.registration_id ?? aRec.mailroom_registration_id ?? "",
          );
          const lockerId = String(
            (lk as Record<string, unknown>).id ??
              (lk as Record<string, unknown>).location_locker_id ??
              "",
          );
          const status = String(
            aRec.status ?? aRec.mailroom_assigned_locker_status ?? "Normal",
          ) as AssignedLocker["status"];

          const registration = regRec
            ? {
                id: String(regRec.id ?? regRec.mailroom_registration_id ?? ""),
                full_name: String(regRec.full_name ?? ""),
                email: String(regRec.email ?? ""),
              }
            : null;

          derivedAssigned.push({
            id,
            registration_id: registrationId,
            locker_id: lockerId,
            status,
            registration,
          });
        }
      }
      // build lookup map from derivedAssigned (do not assign array to map state)

      const map: Record<string, AssignedLocker | undefined> = {};
      const normalizeKey = (v?: string | null) =>
        (v ?? "").toLowerCase().trim();
      for (const a of derivedAssigned) {
        const key = normalizeKey(a.locker_id);
        if (key) map[key] = a;
      }
      setAssignedMap(map);
    } else {
      setLockers([]);
      setLocations([]);
      setAssignedMap({});
    }

    // auto-fix ghost lockers (no console logs)
    if (
      (overviewData?.lockers?.length ?? 0) > 0 &&
      (overviewData?.assigned?.length ?? 0) > 0
    ) {
      const assignedIds = new Set(
        (overviewData?.assigned ?? []).map((a) => a.locker_id),
      );
      const ghost = (overviewData?.lockers ?? []).filter(
        (l) => !l.is_available && !assignedIds.has(l.id),
      );
      if (ghost.length > 0) {
        (async () => {
          try {
            await Promise.all(
              ghost.map((l) =>
                fetch(`/api/admin/mailroom/lockers/${l.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    locker_code: l.locker_code,
                    location_id: l.location_id,
                    is_available: true,
                  }),
                }),
              ),
            );
            notifications.show({
              title: "System Cleanup",
              message: `Automatically freed ${ghost.length} lockers that had no active assignment.`,
              color: "orange",
              icon: <IconLockOpen size={16} />,
            });
            await swrMutate(lockersKey);
          } catch (err: unknown) {
            void err;
          }
        })();
      }
    }
  }, [overviewData, overviewValidating]);

  const refreshAll = async () => {
    setLoading(true);
    try {
      await swrMutate(lockersKey);
    } catch {
      // noop
    } finally {
      setLoading(false);
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
    setSearch("");
    setFilterLocation(null);
    setActiveTab("all");
  };

  const handleOpenModal = (locker?: Locker) => {
    const normalize = (v?: string | null) => (v ?? "").toLowerCase().trim();
    const findAssignmentForLocker = (l: Locker | undefined) => {
      if (!l) return undefined;
      return (
        assignedMap[normalize(l.id)] ??
        assignedMap[normalize(l.location_locker_id ?? "")] ??
        assignedMap[normalize(l.location_id ?? "")] ??
        assignedMap[normalize(l.locker_code ?? "")]
      );
    };

    if (locker) {
      setEditingLocker(locker);
      setFormData({
        locker_code: locker.locker_code,
        location_id: locker.location_id,
        is_available: locker.is_available,
      });
      const assignment = findAssignmentForLocker(locker);
      setCapacityStatus(assignment?.status ?? "Normal");
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
      const normalize = (v?: string | null) => (v ?? "").toLowerCase().trim();
      const assignment =
        (editingLocker
          ? (assignedMap[normalize(editingLocker.id)] ??
            assignedMap[normalize(editingLocker.location_locker_id ?? "")] ??
            assignedMap[normalize(editingLocker.location_id ?? "")] ??
            assignedMap[normalize(editingLocker.locker_code ?? "")])
          : undefined) ?? null;

      if (editingLocker && assignment && capacityStatus !== assignment.status) {
        const statusRes = await fetch(
          `/api/admin/mailroom/assigned-lockers/${assignment.id}`,
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

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this locker?")) return;

    try {
      const res = await fetch(`/api/admin/mailroom/lockers/${id}`, {
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
    }
  };

  const matchesStatus = (l: Locker): boolean => {
    if (activeTab === "available") return l.is_available;
    if (activeTab === "occupied") return !l.is_available;
    return true;
  };

  const filteredLockers = lockers.filter((l) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (l.locker_code ?? "").toLowerCase().includes(q) ||
      (l.location?.name ?? "").toLowerCase().includes(q);
    const matchesLocation = filterLocation
      ? l.location_id === filterLocation
      : true;
    return matchesSearch && matchesLocation && matchesStatus(l);
  });

  const paginatedLockers = filteredLockers.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const activeAssignment = (() => {
    const normalize = (v?: string | null) => (v ?? "").toLowerCase().trim();
    if (!editingLocker) return null;
    return (
      assignedMap[normalize(editingLocker.id)] ??
      assignedMap[normalize(editingLocker.location_locker_id ?? "")] ??
      assignedMap[normalize(editingLocker.location_id ?? "")] ??
      assignedMap[normalize(editingLocker.locker_code ?? "")] ??
      null
    );
  })();

  const getCapacityBadgeColor = (status: string | undefined) => {
    if (status === "Full") return "red";
    if (status === "Near Full") return "orange";
    if (status === "Empty") return "gray";
    return "blue";
  };

  const segmentedColor = React.useMemo(() => {
    if (capacityStatus === "Full") return "red";
    if (capacityStatus === "Near Full") return "orange";
    if (capacityStatus === "Empty") return "gray";
    return "blue";
  }, [capacityStatus]);

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
              onChange={(val) => setFilterLocation(val ?? null)}
              clearable
              style={{ width: 200 }}
            />

            {(search || filterLocation || activeTab !== "all") && (
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

        <Tabs
          value={activeTab}
          onChange={(val: string | null) => setActiveTab(val ?? "all")}
          mb="md"
        >
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
          onRecordsPerPageChange={(n: number) => setPageSize(n)}
          columns={[
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
                const normalize = (v?: string | null) =>
                  (v ?? "").toLowerCase().trim();

                const byId =
                  assignedMap[normalize(locker.id)] ??
                  assignedMap[normalize(locker.location_locker_id ?? "")] ??
                  assignedMap[normalize(locker.location_id ?? "")] ??
                  assignedMap[normalize(locker.locker_code ?? "")];
                const assignment = byId ?? null;

                if (!assignment) {
                  return (
                    <Text size="sm" c="dimmed">
                      —
                    </Text>
                  );
                }

                const color = getCapacityBadgeColor(assignment.status);

                return (
                  <Badge
                    color={color}
                    variant="outline"
                    leftSection={<IconBox size={12} />}
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
