"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
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
  // CHANGED: Added specific plan capabilities
  mailroom_plans?: {
    name: string;
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
  };
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
  package_name: string;
  registration_id: string;
  locker_id?: string | null;
  package_type: "Document" | "Parcel";
  status: string;
  notes?: string;
  image_url?: string;
  received_at: string;
  registration?: Registration;
  locker?: Locker;
  // Release/address snapshot fields
  release_address_id?: string | null;
  release_address?: string | null;
  release_to_name?: string | null;
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
    package_name: "",
    registration_id: "",
    locker_id: "",
    package_type: "", // CHANGED: Default to empty string to force selection
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
  const [releaseNote, setReleaseNote] = useState<string>("");
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );

  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [packageToDispose, setPackageToDispose] = useState<Package | null>(
    null
  );
  const [isDisposing, setIsDisposing] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<string | null>("active");

  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  // SWR keys
  const packagesKey = "/api/admin/mailroom/packages";
  const registrationsKey = "/api/admin/mailroom/registrations";
  const lockersKey = "/api/admin/mailroom/lockers";
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
    data: packagesData,
    error: packagesError,
    isValidating: packagesValidating,
  } = useSWR(packagesKey, fetcher, { revalidateOnFocus: true });
  const {
    data: registrationsData,
    error: registrationsError,
    isValidating: registrationsValidating,
  } = useSWR(registrationsKey, fetcher, { revalidateOnFocus: true });
  const {
    data: lockersData,
    error: lockersError,
    isValidating: lockersValidating,
  } = useSWR(lockersKey, fetcher, { revalidateOnFocus: true });
  const {
    data: assignedData,
    error: assignedError,
    isValidating: assignedValidating,
  } = useSWR(assignedKey, fetcher, { revalidateOnFocus: true });

  // derived arrays (handle endpoints that return { data: [...] } or bare arrays)
  const packagesArr = Array.isArray(packagesData?.data)
    ? packagesData.data
    : Array.isArray(packagesData)
    ? packagesData
    : [];
  const registrationsArr = Array.isArray(registrationsData?.data)
    ? registrationsData.data
    : Array.isArray(registrationsData)
    ? registrationsData
    : [];
  const lockersArr = Array.isArray(lockersData?.data)
    ? lockersData.data
    : Array.isArray(lockersData)
    ? lockersData
    : [];
  const assignedArr = Array.isArray(assignedData?.data)
    ? assignedData.data
    : Array.isArray(assignedData)
    ? assignedData
    : [];

  // sync SWR results into local state to avoid changing rest of the code
  useEffect(() => {
    setLoading(
      packagesValidating ||
        registrationsValidating ||
        lockersValidating ||
        assignedValidating
    );
    setPackages(packagesArr);
    setRegistrations(registrationsArr);
    setLockers(lockersArr);
    setAssignedLockers(assignedArr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    packagesData,
    registrationsData,
    lockersData,
    assignedData,
    packagesValidating,
    registrationsValidating,
    lockersValidating,
    assignedValidating,
  ]);

  // helper to refresh all data (used after mutations)
  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        swrMutate(packagesKey),
        swrMutate(registrationsKey),
        swrMutate(lockersKey),
        swrMutate(assignedKey),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch is now handled by SWR
    // fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType, activeTab]); // Reset page on tab change

  // NEW: Auto-dismiss global success
  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  // NEW: Clear form errors when any modal opens
  useEffect(() => {
    if (opened || scanModalOpen || releaseModalOpen || disposeModalOpen) {
      setFormError(null);
    }
  }, [opened, scanModalOpen, releaseModalOpen, disposeModalOpen]);

  const clearFilters = () => {
    setSearch("");
    setFilterStatus(null);
    setFilterType(null);
  };

  const hasFilters = search || filterStatus || filterType;

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
        package_name: pkg.package_name,
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
        package_name: "",
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
      setFormData({
        ...formData,
        registration_id: "",
        locker_id: "",
        package_type: "",
      });
      return;
    }

    // Find if this user has an assigned locker
    const assignment = assignedLockers.find((a) => a.registration_id === regId);

    // Find the registration to check plan capabilities
    const reg = registrations.find((r) => r.id === regId);

    // Determine default package type based on plan
    let defaultType = "Document";

    setFormData({
      ...formData,
      registration_id: regId,
      locker_id: assignment ? assignment.locker_id : "",
      package_type: defaultType,
    });
  };

  // Helper to get available types for selected user
  const getAvailablePackageTypes = () => {
    if (!formData.registration_id) return [];

    const reg = registrations.find((r) => r.id === formData.registration_id);
    if (!reg?.mailroom_plans) return PACKAGE_TYPES; // Fallback

    const types = [];
    if (reg.mailroom_plans.can_receive_mail) types.push("Document");
    if (reg.mailroom_plans.can_receive_parcels) types.push("Parcel");

    return types;
  };

  const handleSubmit = async () => {
    if (
      !formData.package_name ||
      !formData.registration_id ||
      !formData.package_type ||
      !formData.status
    ) {
      setFormError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    setFormError(null); // Clear previous errors

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

      setGlobalSuccess(
        `Package ${editingPackage ? "updated" : "created"} successfully`
      );

      close();
      await refreshAll();
    } catch (error: any) {
      console.error(error);
      setFormError(error.message || "Failed to save package");
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

      setGlobalSuccess("Package deleted successfully");
      await refreshAll();
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
    setFormError(null);

    try {
      const payload = {
        package_name: packageToDispose.package_name,
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

      setGlobalSuccess("Package marked as DISPOSED and locker status updated");
      setDisposeModalOpen(false);
      await refreshAll();
    } catch (error: any) {
      console.error(error);
      setFormError(error.message || "Failed to dispose package");
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
    setFormError(null);

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

      setGlobalSuccess("Document scanned and uploaded successfully");
      setScanModalOpen(false);
      await refreshAll();
    } catch (error: any) {
      setFormError(error.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // --- RELEASE HANDLERS ---
  const handleOpenRelease = async (pkg: Package) => {
    setPackageToRelease(pkg);
    setReleaseFile(null);
    setLockerCapacity("Normal");
    setReleaseNote(pkg?.notes || "");
    setReleaseModalOpen(true);

    // fetch saved addresses for the registration's user
    try {
      setAddresses([]);
      setSelectedAddressId(null);
      const userId = pkg?.registration_id; // adapt if registration maps to user_id differently
      if (!userId) return;
      const res = await fetch(
        `/api/user/addresses?userId=${encodeURIComponent(userId)}`
      );
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const arr = Array.isArray(json?.data) ? json.data : json || [];
      setAddresses(arr);
      // preselect package snapshot or default
      if (pkg.release_address_id) {
        setSelectedAddressId(pkg.release_address_id);
      } else {
        const def = arr.find((a: any) => a.is_default);
        setSelectedAddressId(def?.id ?? null);
      }
    } catch (e) {
      console.error("failed to load addresses for release modal", e);
    }
  };

  const handleSubmitRelease = async () => {
    if (!releaseFile || !packageToRelease) return;
    // Determine final address id to send:
    // priority: selectedAddressId (if previously set) -> package snapshot -> user's default address
    const finalAddressId =
      selectedAddressId ??
      packageToRelease?.release_address_id ??
      addresses.find((a) => a.is_default)?.id ??
      null;

    if (!finalAddressId) {
      notifications.show({
        title: "Address required",
        message:
          "No shipping address available for this package. Add a default address for the user or set a release address first.",
        color: "red",
      });
      return;
    }

    setIsReleasing(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", releaseFile);
      formData.append("packageId", packageToRelease.id);
      formData.append("lockerStatus", lockerCapacity);
      if (releaseNote) formData.append("notes", releaseNote);
      formData.append("selectedAddressId", finalAddressId);
      // send an explicit snapshot name: prefer package snapshot -> saved address contact_name -> registration full_name
      const sel = addresses.find((a) => a.id === finalAddressId);
      const snapshotName =
        packageToRelease.release_to_name ??
        sel?.contact_name ??
        packageToRelease?.registration?.full_name ??
        "";
      if (snapshotName) formData.append("release_to_name", snapshotName);

      const res = await fetch("/api/admin/mailroom/release", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Release failed");
      }

      setGlobalSuccess("Package released and locker status updated");
      setReleaseModalOpen(false);
      await refreshAll();
    } catch (error: any) {
      setFormError(error.message || "Release failed");
    } finally {
      setIsReleasing(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredPackages = packages.filter((p) => {
    const q = (search || "").toLowerCase();

    const pkgName = (p.package_name ?? "").toLowerCase();
    const regName = (p.registration?.full_name ?? "").toLowerCase();
    const regEmail = (p.registration?.email ?? "").toLowerCase();
    const status = (p.status ?? "").toLowerCase();
    const lockerCode = (p.locker?.locker_code ?? "").toLowerCase();

    const matchesSearch =
      pkgName.includes(q) ||
      regName.includes(q) ||
      regEmail.includes(q) ||
      status.includes(q) ||
      lockerCode.includes(q);

    const matchesStatus = filterStatus ? p.status === filterStatus : true;
    const matchesType = filterType ? p.package_type === filterType : true;

    // Tab Logic
    if (activeTab === "requests") {
      return (p.status ?? "").includes("REQUEST");
    }
    if (activeTab === "active") {
      return (p.status ?? "") === "STORED";
    }
    if (activeTab === "released") {
      const s = p.status ?? "";
      return s === "RELEASED" || s === "RETRIEVED";
    }
    if (activeTab === "disposed") {
      return (p.status ?? "") === "DISPOSED";
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
              accessor: "package_name",
              title: "Package",
              width: 200,
              render: ({ package_name }) => (
                <Text fw={500} size="sm">
                  {package_name}
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
            label="Package Name"
            placeholder="e.g. My Parcel / Order #1234"
            required
            value={formData.package_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                package_name: e.currentTarget.value,
              })
            }
          />
          <Select
            label="Recipient"
            placeholder="Select recipient"
            required
            searchable
            // Limit displayed options to first 10 for performance/virtualization safety
            data={registrations.slice(0, 10).map((r) => ({
              value: r.id,
              label: `${r.mailroom_code || "No Code"} - ${r.email} (${
                r.mailroom_plans?.name || "Unknown Plan"
              })`,
            }))}
            value={formData.registration_id}
            onChange={(val) => handleRegistrationChange(val)}
            // Custom filter allows searching by any part of the label string
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
            placeholder={
              !formData.registration_id
                ? "Select a recipient first"
                : "Select type"
            }
            disabled={!formData.registration_id}
            data={getAvailablePackageTypes()}
            value={formData.package_type}
            onChange={(val) =>
              setFormData({ ...formData, package_type: val || "" })
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

          <Text size="sm">
            Upload the PDF scan for <b>{packageToScan?.package_name}</b>.
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

          <Text size="sm">
            Upload Proof of Release (Photo/Signature) for{" "}
            <b>{packageToRelease?.package_name}</b>.
          </Text>
          <FileInput
            label="Proof Image"
            placeholder="Select image"
            accept="image/png,image/jpeg,image/jpg"
            value={releaseFile}
            onChange={setReleaseFile}
            leftSection={<IconUpload size={16} />}
          />

          {/* Show saved release snapshot if available, otherwise show user's default address (read-only preview) */}
          <Box mt="sm">
            {packageToRelease?.release_address ? (
              <Paper withBorder p="sm" radius="md" bg="gray.0">
                <Text fw={600} size="sm">
                  Saved release snapshot
                </Text>
                <Text size="sm" c="dimmed" mt="6px">
                  {packageToRelease.release_address}
                </Text>
                {packageToRelease.release_to_name && (
                  <Text size="xs" c="dimmed" mt="6px">
                    Recipient: {packageToRelease.release_to_name}
                  </Text>
                )}
              </Paper>
            ) : (
              (() => {
                const def = addresses.find((a) => a.is_default) ?? addresses[0];
                if (def) {
                  return (
                    <Paper withBorder p="sm" radius="md" bg="gray.0">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text fw={600} size="sm">
                            {def.label || "Unnamed Address"}
                          </Text>
                          <Text size="xs" c="dimmed">
                            Recipient:{" "}
                            {def.contact_name ||
                              packageToRelease?.registration?.full_name ||
                              "N/A"}
                          </Text>
                        </div>
                        {def.is_default && (
                          <Badge ml="xs" size="xs" color="blue" variant="light">
                            Default
                          </Badge>
                        )}
                      </Group>
                      <Text size="sm" c="dimmed" mt="8px">
                        {def.line1}
                        {def.line2 ? `, ${def.line2}` : ""}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {[def.city, def.region, def.postal]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                      {def.contact_phone && (
                        <Text size="xs" c="dimmed" mt="4px">
                          Phone: {def.contact_phone}
                        </Text>
                      )}
                    </Paper>
                  );
                }
                return (
                  <Text c="dimmed">
                    No shipping address on file for this user.
                  </Text>
                );
              })()
            )}
          </Box>

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

          <Alert color="red" icon={<IconTrash size={16} />}>
            Are you sure you want to mark{" "}
            <b>{packageToDispose?.package_name}</b> as DISPOSED? This action
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
