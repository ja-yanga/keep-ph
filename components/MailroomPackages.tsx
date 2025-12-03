"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  TextInput,
  Tooltip,
  Textarea,
  Text,
  FileInput,
  Tabs,
  rem,
  SegmentedControl,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
// Added useSearchParams
import { useSearchParams } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconPackage,
  IconFileText,
  IconLock,
  IconAlertCircle,
  IconScan,
  IconUpload,
  IconTruckDelivery,
  IconList,
  IconCheck,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";

interface Registration {
  id: string;
  full_name: string;
  email: string;
  mailroom_code?: string | null;
}

interface Locker {
  id: string;
  locker_code: string;
  is_available: boolean;
}

// We need to know which locker is assigned to which user
interface AssignedLocker {
  id: string;
  registration_id: string;
  locker_id: string;
  status?: "Empty" | "Normal" | "Near Full" | "Full";
  locker?: Locker;
}

interface Package {
  id: string;
  tracking_number: string;
  registration_id: string;
  locker_id?: string | null;
  package_type: "Document" | "Parcel";
  status: string;
  notes?: string;
  image_url?: string;
  received_at: string;
  registration?: Registration;
  locker?: Locker;
}

const PACKAGE_TYPES = ["Document", "Parcel"];
const STATUSES = [
  "STORED",
  "RELEASED",
  "RETRIEVED",
  "DISPOSED",
  "REQUEST_TO_RELEASE",
  "REQUEST_TO_DISPOSE",
  "REQUEST_TO_SCAN",
];

export default function MailroomPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [assignedLockers, setAssignedLockers] = useState<AssignedLocker[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // New Filter States
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    tracking_number: "",
    registration_id: "",
    locker_id: "",
    package_type: "Parcel",
    status: "STORED",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Scan/Release States
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [packageToScan, setPackageToScan] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const [packageToRelease, setPackageToRelease] = useState<Package | null>(
    null
  );
  const [isReleasing, setIsReleasing] = useState(false);

  // NEW: Dispose Modal State
  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [packageToDispose, setPackageToDispose] = useState<Package | null>(
    null
  );
  const [isDisposing, setIsDisposing] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<string | null>("active");

  // NEW: Handle URL Query Params for Tab Selection
  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // New state for locker capacity
  const [lockerCapacity, setLockerCapacity] = useState<
    "Empty" | "Normal" | "Near Full" | "Full"
  >("Normal");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType, activeTab]); // Reset page on tab change

  const clearFilters = () => {
    setSearch("");
    setFilterStatus(null);
    setFilterType(null);
  };

  const hasFilters = search || filterStatus || filterType;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [packagesRes, registrationsRes, lockersRes, assignedRes] =
        await Promise.all([
          fetch("/api/admin/mailroom/packages"),
          fetch("/api/admin/mailroom/registrations"),
          fetch("/api/admin/mailroom/lockers"),
          fetch("/api/admin/mailroom/assigned-lockers"),
        ]);

      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data.data || data);
      }
      if (registrationsRes.ok) {
        const data = await registrationsRes.json();
        setRegistrations(Array.isArray(data.data) ? data.data : data);
      }
      if (lockersRes.ok) {
        const data = await lockersRes.json();
        setLockers(Array.isArray(data) ? data : []);
      }
      if (assignedRes.ok) {
        const data = await assignedRes.json();
        setAssignedLockers(data.data || data);
      }
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

  const handleOpenModal = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg);

      // 2. Pre-fill locker capacity from existing assignment if available
      const assignment = assignedLockers.find(
        (a) => a.registration_id === pkg.registration_id
      );
      if (assignment && assignment.status) {
        setLockerCapacity(assignment.status);
      }

      setFormData({
        tracking_number: pkg.tracking_number,
        registration_id: pkg.registration_id,
        locker_id: pkg.locker_id || "",
        package_type: pkg.package_type,
        status: pkg.status,
        notes: pkg.notes || "",
      });
    } else {
      setEditingPackage(null);
      setLockerCapacity("Normal");
      setFormData({
        tracking_number: "",
        registration_id: "",
        locker_id: "",
        package_type: "Parcel",
        status: "STORED",
        notes: "",
      });
    }
    open();
  };

  const handleRegistrationChange = (regId: string | null) => {
    if (!regId) {
      setFormData({ ...formData, registration_id: "", locker_id: "" });
      return;
    }

    // Find if this user has an assigned locker
    const assignment = assignedLockers.find((a) => a.registration_id === regId);

    setFormData({
      ...formData,
      registration_id: regId,
      // If they have an assigned locker, auto-select it. Otherwise leave blank.
      locker_id: assignment ? assignment.locker_id : "",
    });
  };

  const handleSubmit = async () => {
    if (
      !formData.tracking_number ||
      !formData.registration_id ||
      !formData.package_type ||
      !formData.status
    ) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    setSubmitting(true);
    try {
      const url = editingPackage
        ? `/api/admin/mailroom/packages/${editingPackage.id}`
        : "/api/admin/mailroom/packages";

      const method = editingPackage ? "PUT" : "POST";

      // 3. Create payload
      // We cast to 'any' to allow adding the optional locker_status field
      const payload: any = {
        ...formData,
      };

      // Only send locker_status when ADDING a package
      if (!editingPackage) {
        payload.locker_status = lockerCapacity;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");

      notifications.show({
        title: "Success",
        message: `Package ${
          editingPackage ? "updated" : "created"
        } successfully`,
        color: "green",
      });

      close();
      fetchData();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to save package",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this package?")) return;

    try {
      const res = await fetch(`/api/admin/mailroom/packages/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to delete");

      notifications.show({
        title: "Success",
        message: "Package deleted successfully",
        color: "green",
      });
      fetchData();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to delete package",
        color: "red",
      });
    }
  };

  // --- UPDATED HANDLER FOR DISPOSAL ---
  const handleConfirmDisposal = (pkg: Package) => {
    setPackageToDispose(pkg);
    // Default to "Empty" or "Normal" when disposing, as items are removed
    setLockerCapacity("Normal");
    setDisposeModalOpen(true);
  };

  const handleSubmitDispose = async () => {
    if (!packageToDispose) return;
    setIsDisposing(true);

    try {
      const payload = {
        tracking_number: packageToDispose.tracking_number,
        registration_id: packageToDispose.registration_id,
        locker_id: packageToDispose.locker_id,
        package_type: packageToDispose.package_type,
        status: "DISPOSED",
        notes: packageToDispose.notes,

        locker_status: lockerCapacity, // <--- Send the new status
      };

      const res = await fetch(
        `/api/admin/mailroom/packages/${packageToDispose.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Failed to update status");

      notifications.show({
        title: "Success",
        message: "Package marked as DISPOSED and locker status updated",
        color: "green",
      });
      setDisposeModalOpen(false);
      fetchData();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to dispose package",
        color: "red",
      });
    } finally {
      setIsDisposing(false);
    }
  };

  // --- SCAN HANDLERS ---
  const handleOpenScan = (pkg: any) => {
    setPackageToScan(pkg);
    setScanFile(null);
    setScanModalOpen(true);
  };

  const handleSubmitScan = async () => {
    if (!scanFile || !packageToScan) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", scanFile);
      formData.append("packageId", packageToScan.id);

      const res = await fetch("/api/admin/mailroom/scans", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      notifications.show({
        title: "Success",
        message: "Document scanned and uploaded successfully",
        color: "green",
      });

      setScanModalOpen(false);
      fetchData();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // --- RELEASE HANDLERS ---
  const handleOpenRelease = (pkg: Package) => {
    setPackageToRelease(pkg);
    setReleaseFile(null);
    // Default to "Normal" or "Empty" when releasing
    setLockerCapacity("Normal");
    setReleaseModalOpen(true);
  };

  const handleSubmitRelease = async () => {
    if (!releaseFile || !packageToRelease) return;
    setIsReleasing(true);

    try {
      const formData = new FormData();
      formData.append("file", releaseFile);
      formData.append("packageId", packageToRelease.id);
      formData.append("lockerStatus", lockerCapacity); // <--- Send new status

      const res = await fetch("/api/admin/mailroom/release", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Release failed");
      }

      notifications.show({
        title: "Success",
        message: "Package released and locker status updated",
        color: "green",
      });

      setReleaseModalOpen(false);
      fetchData();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredPackages = packages.filter((p) => {
    const q = search.toLowerCase();
    const matchesSearch =
      p.tracking_number.toLowerCase().includes(q) ||
      p.registration?.full_name.toLowerCase().includes(q) ||
      p.registration?.email.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q) ||
      p.locker?.locker_code.toLowerCase().includes(q);

    const matchesStatus = filterStatus ? p.status === filterStatus : true;
    const matchesType = filterType ? p.package_type === filterType : true;

    // Tab Logic
    if (activeTab === "requests") {
      return p.status.includes("REQUEST");
    }
    if (activeTab === "active") {
      return p.status === "STORED";
    }
    if (activeTab === "released") {
      return p.status === "RELEASED" || p.status === "RETRIEVED";
    }
    if (activeTab === "disposed") {
      return p.status === "DISPOSED";
    }

    return matchesSearch && matchesStatus && matchesType;
  });

  const paginatedPackages = filteredPackages.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "STORED":
        return "blue";
      case "RELEASED":
      case "RETRIEVED":
        return "green";
      case "DISPOSED":
        return "red";
      default:
        return "orange";
    }
  };

  // Count requests for badge
  const requestCount = packages.filter((p) =>
    p.status.includes("REQUEST")
  ).length;

  return (
    <Stack align="center">
      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <Group style={{ flex: 1 }}>
            <TextInput
              placeholder="Search packages..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 250 }}
            />
            {/* Only show status filter on Inventory tab */}
            {activeTab === "inventory" && (
              <Select
                placeholder="Filter by Status"
                data={STATUSES.filter((s) => !s.includes("REQUEST")).map(
                  (s) => ({
                    value: s,
                    label: s.replace(/_/g, " "),
                  })
                )}
                value={filterStatus}
                onChange={setFilterStatus}
                clearable
                style={{ width: 200 }}
              />
            )}
            <Select
              placeholder="Filter by Type"
              data={PACKAGE_TYPES}
              value={filterType}
              onChange={setFilterType}
              clearable
              style={{ width: 150 }}
            />
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
            Add Package
          </Button>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab} mb="md">
          <Tabs.List>
            <Tabs.Tab value="active" leftSection={<IconPackage size={16} />}>
              Active Inventory
            </Tabs.Tab>
            <Tabs.Tab
              value="requests"
              leftSection={<IconAlertCircle size={16} />}
              rightSection={
                requestCount > 0 && (
                  <Badge size="xs" circle color="red">
                    {requestCount}
                  </Badge>
                )
              }
            >
              Pending Requests
            </Tabs.Tab>
            <Tabs.Tab value="released" leftSection={<IconCheck size={16} />}>
              Released
            </Tabs.Tab>
            <Tabs.Tab value="disposed" leftSection={<IconTrash size={16} />}>
              Disposed
            </Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginatedPackages}
          fetching={loading}
          minHeight={200}
          totalRecords={filteredPackages.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={setPageSize}
          columns={[
            {
              accessor: "tracking_number",
              title: "Tracking #",
              width: 150,
              render: ({ tracking_number }) => (
                <Text fw={500} size="sm">
                  {tracking_number}
                </Text>
              ),
            },
            {
              accessor: "registration.full_name",
              title: "Recipient",
              render: ({ registration }: Package) => (
                <Stack gap={0}>
                  <Text size="sm" fw={500}>
                    {registration?.full_name || "Unknown"}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {registration?.email}
                  </Text>
                </Stack>
              ),
            },
            {
              accessor: "locker.locker_code",
              title: "Locker",
              width: 120,
              render: ({ locker }: Package) =>
                locker ? (
                  <Badge
                    variant="outline"
                    color="gray"
                    leftSection={<IconLock size={12} />}
                  >
                    {locker.locker_code}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                ),
            },
            {
              accessor: "package_type",
              title: "Type",
              width: 120,
              render: ({ package_type }: Package) => (
                <Badge
                  variant="light"
                  color="gray"
                  leftSection={
                    package_type === "Document" ? (
                      <IconFileText size={12} />
                    ) : (
                      <IconPackage size={12} />
                    )
                  }
                >
                  {package_type}
                </Badge>
              ),
            },
            {
              accessor: "status",
              title: "Status",
              width: 180,
              render: ({ status }: Package) => (
                <Badge color={getStatusColor(status)} variant="light">
                  {status.replace(/_/g, " ")}
                </Badge>
              ),
            },
            {
              accessor: "received_at",
              title: "Received",
              width: 150,
              render: ({ received_at }: Package) =>
                dayjs(received_at).format("MMM D, YYYY"),
            },
            {
              accessor: "actions",
              title: "Actions",
              width: 180,
              textAlign: "right",
              render: (pkg: Package) => (
                <Group gap="xs" justify="flex-end">
                  {/* Action Buttons based on Status (Requests Only) */}
                  {pkg.status === "REQUEST_TO_SCAN" && (
                    <Tooltip label="Upload Scanned PDF">
                      <Button
                        size="compact-xs"
                        color="violet"
                        leftSection={<IconScan size={14} />}
                        onClick={() => handleOpenScan(pkg)}
                      >
                        Scan
                      </Button>
                    </Tooltip>
                  )}
                  {pkg.status === "REQUEST_TO_RELEASE" && (
                    <Tooltip label="Confirm Release">
                      <Button
                        size="compact-xs"
                        color="teal"
                        leftSection={<IconTruckDelivery size={14} />}
                        onClick={() => handleOpenRelease(pkg)}
                      >
                        Release
                      </Button>
                    </Tooltip>
                  )}
                  {pkg.status === "REQUEST_TO_DISPOSE" && (
                    <Tooltip label="Confirm Disposal">
                      <Button
                        size="compact-xs"
                        color="red"
                        variant="light"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => handleConfirmDisposal(pkg)}
                      >
                        Dispose
                      </Button>
                    </Tooltip>
                  )}

                  {/* REMOVED: Manual Release/Dispose for "STORED" status */}

                  {/* Standard Edit/Delete */}
                  <Tooltip label="Edit">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => handleOpenModal(pkg)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Delete">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(pkg.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          noRecordsText={
            activeTab === "requests"
              ? "No pending requests"
              : "No packages found"
          }
        />
      </Paper>

      {/* Modals (Keep existing modals) */}
      <Modal
        opened={opened}
        onClose={close}
        title={editingPackage ? "Edit Package" : "Add Package"}
        centered
      >
        <Stack>
          <TextInput
            label="Tracking Number"
            placeholder="e.g. TN-123456"
            required
            value={formData.tracking_number}
            onChange={(e) =>
              setFormData({
                ...formData,
                tracking_number: e.currentTarget.value,
              })
            }
          />
          <Select
            label="Recipient"
            placeholder="Select recipient"
            required
            searchable
            data={registrations.map((r) => ({
              value: r.id,
              label: `${r.full_name}${
                r.mailroom_code ? ` (${r.mailroom_code})` : ""
              } - ${r.email}`,
            }))}
            value={formData.registration_id}
            onChange={(val) => handleRegistrationChange(val)}
            // CHANGED: Custom filter to search by code, name, or email
            filter={({ options, search }) => {
              const q = search.toLowerCase().trim();
              return (options as any).filter((option: any) =>
                option.label.toLowerCase().includes(q)
              );
            }}
          />
          <Select
            label="Assign Locker"
            placeholder={
              formData.registration_id
                ? "Select assigned locker"
                : "Select a recipient first"
            }
            searchable
            clearable
            disabled={!formData.registration_id}
            data={lockers
              .filter((l) => {
                if (!formData.registration_id) return false;

                // Find the assignment for this locker and user
                const assignment = assignedLockers.find(
                  (a) =>
                    a.locker_id === l.id &&
                    a.registration_id === formData.registration_id
                );

                // Must be assigned to this user
                return !!assignment;
              })
              .map((l) => {
                const assignment = assignedLockers.find(
                  (a) =>
                    a.locker_id === l.id &&
                    a.registration_id === formData.registration_id
                );

                const isFull = assignment?.status === "Full";
                const isCurrent = l.id === formData.locker_id;

                return {
                  value: l.id,
                  label: `${l.locker_code}${isFull ? " (Full)" : ""}`,
                  disabled: isFull && !isCurrent, // Show but disable if full (unless it's the one currently
                };
              })}
            value={formData.locker_id}
            onChange={(val) =>
              setFormData({ ...formData, locker_id: val || "" })
            }
          />
          <Select
            label="Type"
            required
            data={PACKAGE_TYPES}
            value={formData.package_type}
            onChange={(val) =>
              setFormData({ ...formData, package_type: val || "Parcel" })
            }
          />
          <Select
            label="Status"
            required
            data={STATUSES}
            value={formData.status}
            onChange={(val) =>
              setFormData({ ...formData, status: val || "STORED" })
            }
          />

          {/* Locker Capacity Control - Only show when ADDING a package */}
          {!editingPackage && (
            <Stack gap={4} mt="xs">
              <Text size="sm" fw={500}>
                Update Locker Capacity Status
              </Text>
              <SegmentedControl
                value={lockerCapacity}
                onChange={(val) =>
                  setLockerCapacity(
                    val as "Empty" | "Normal" | "Near Full" | "Full"
                  )
                }
                fullWidth
                data={[
                  { label: "Empty", value: "Empty" },
                  { label: "Normal", value: "Normal" },
                  { label: "Near Full", value: "Near Full" },
                  { label: "Full", value: "Full" },
                ]}
                color={
                  lockerCapacity === "Full"
                    ? "red"
                    : lockerCapacity === "Near Full"
                    ? "orange"
                    : lockerCapacity === "Empty"
                    ? "gray"
                    : "blue"
                }
              />
              <Text size="xs" c="dimmed">
                This will update the status of the assigned locker for this
                user.
              </Text>
            </Stack>
          )}

          <Textarea
            label="Notes"
            placeholder="Additional details..."
            minRows={2}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.currentTarget.value })
            }
          />

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

      <Modal
        opened={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Upload Scanned Document"
        centered
      >
        <Stack>
          <Text size="sm">
            Upload the PDF scan for <b>{packageToScan?.tracking_number}</b>.
          </Text>
          <FileInput
            label="Select PDF"
            placeholder="Click to select file"
            accept="application/pdf"
            value={scanFile}
            onChange={setScanFile}
            leftSection={<IconUpload size={16} />}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setScanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={handleSubmitScan}
              loading={isUploading}
              disabled={!scanFile}
            >
              Upload & Complete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Confirm Release"
        centered
      >
        <Stack>
          <Text size="sm">
            Upload Proof of Release (Photo/Signature) for{" "}
            <b>{packageToRelease?.tracking_number}</b>.
          </Text>
          <FileInput
            label="Proof Image"
            placeholder="Select image"
            accept="image/png,image/jpeg,image/jpg"
            value={releaseFile}
            onChange={setReleaseFile}
            leftSection={<IconUpload size={16} />}
          />

          {/* NEW: Locker Status Selector */}
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Update Locker Capacity Status
            </Text>
            <SegmentedControl
              value={lockerCapacity}
              onChange={(val) =>
                setLockerCapacity(
                  val as "Empty" | "Normal" | "Near Full" | "Full"
                )
              }
              fullWidth
              data={[
                { label: "Empty", value: "Empty" },
                { label: "Normal", value: "Normal" },
                { label: "Near Full", value: "Near Full" },
                { label: "Full", value: "Full" },
              ]}
              color={
                lockerCapacity === "Full"
                  ? "red"
                  : lockerCapacity === "Near Full"
                  ? "orange"
                  : lockerCapacity === "Empty"
                  ? "gray"
                  : "blue"
              }
            />
            <Text size="xs" c="dimmed">
              Since items are being removed, you might want to set this to
              "Normal" or "Empty".
            </Text>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setReleaseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="teal"
              onClick={handleSubmitRelease}
              loading={isReleasing}
              disabled={!releaseFile}
            >
              Upload Proof & Complete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* NEW: Dispose Modal */}
      <Modal
        opened={disposeModalOpen}
        onClose={() => setDisposeModalOpen(false)}
        title="Confirm Disposal"
        centered
      >
        <Stack>
          <Alert color="red" icon={<IconTrash size={16} />}>
            Are you sure you want to mark{" "}
            <b>{packageToDispose?.tracking_number}</b> as DISPOSED? This action
            cannot be undone.
          </Alert>

          {/* NEW: Locker Status Selector */}
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Update Locker Capacity Status
            </Text>
            <SegmentedControl
              value={lockerCapacity}
              onChange={(val) =>
                setLockerCapacity(
                  val as "Empty" | "Normal" | "Near Full" | "Full"
                )
              }
              fullWidth
              data={[
                { label: "Empty", value: "Empty" },
                { label: "Normal", value: "Normal" },
                { label: "Near Full", value: "Near Full" },
                { label: "Full", value: "Full" },
              ]}
              color={
                lockerCapacity === "Full"
                  ? "red"
                  : lockerCapacity === "Near Full"
                  ? "orange"
                  : lockerCapacity === "Empty"
                  ? "gray"
                  : "blue"
              }
            />
            <Text size="xs" c="dimmed">
              Since items are being disposed, you might want to set this to
              "Normal" or "Empty".
            </Text>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setDisposeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleSubmitDispose}
              loading={isDisposing}
            >
              Confirm Disposal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
