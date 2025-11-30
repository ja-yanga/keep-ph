"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  TextInput,
  Tooltip,
  Switch,
  Textarea,
  Text,
  FileInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
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
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";

interface Registration {
  id: string;
  full_name: string;
  email: string;
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
  mailroom_full: boolean;
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
  const [assignedLockers, setAssignedLockers] = useState<AssignedLocker[]>([]); // Track assignments
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
    mailroom_full: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // --- NEW STATE FOR SCANNING ---
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [packageToScan, setPackageToScan] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType]);

  const clearFilters = () => {
    setSearch("");
    setFilterStatus(null);
    setFilterType(null);
  };

  const hasFilters = search || filterStatus || filterType;

  const fetchData = async () => {
    setLoading(true);
    try {
      // We need to fetch assigned lockers to know who owns what
      const [packagesRes, registrationsRes, lockersRes, assignedRes] =
        await Promise.all([
          fetch("/api/admin/mailroom/packages"),
          fetch("/api/mailroom/registrations"),
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
      setFormData({
        tracking_number: pkg.tracking_number,
        registration_id: pkg.registration_id,
        locker_id: pkg.locker_id || "",
        package_type: pkg.package_type,
        status: pkg.status,
        notes: pkg.notes || "",
        mailroom_full: pkg.mailroom_full,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        tracking_number: "",
        registration_id: "",
        locker_id: "",
        package_type: "Parcel",
        status: "STORED",
        notes: "",
        mailroom_full: false,
      });
    }
    open();
  };

  // Auto-select locker when user changes
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

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
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
            <Select
              placeholder="Filter by Status"
              data={STATUSES.map((s) => ({
                value: s,
                label: s.replace(/_/g, " "),
              }))}
              value={filterStatus}
              onChange={setFilterStatus}
              clearable
              style={{ width: 200 }}
            />
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
              width: 150,
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
              width: 100,
              textAlign: "right",
              render: (pkg: Package) => (
                <Group gap="xs" justify="flex-end">
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
                  {pkg.status === "REQUEST_TO_SCAN" && (
                    <Tooltip label="Upload Scanned PDF">
                      <Button
                        size="xs"
                        color="violet"
                        leftSection={<IconScan size={14} />}
                        onClick={() => handleOpenScan(pkg)}
                      >
                        Upload Scan
                      </Button>
                    </Tooltip>
                  )}
                </Group>
              ),
            },
          ]}
          noRecordsText="No packages found"
        />
      </Paper>

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
            label="Recipient (Registration)"
            placeholder="Select recipient"
            required
            searchable
            data={registrations.map((r) => ({
              value: r.id,
              label: `${r.full_name} (${r.email})`,
            }))}
            value={formData.registration_id}
            onChange={(val) => handleRegistrationChange(val)}
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
                // Only show lockers if a user is selected
                if (!formData.registration_id) return false;

                // Check if this locker is assigned to the selected user
                const isAssigned = assignedLockers.some(
                  (a) =>
                    a.locker_id === l.id &&
                    a.registration_id === formData.registration_id
                );

                // Also include the currently selected locker (even if unassigned/overflow)
                // so it doesn't disappear from the input when editing
                const isSelected = l.id === formData.locker_id;

                return isAssigned || isSelected;
              })
              .map((l) => ({
                value: l.id,
                label: l.locker_code, // Clean label without "Occupied" status
              }))}
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
          <Textarea
            label="Notes"
            placeholder="Additional details..."
            minRows={2}
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.currentTarget.value })
            }
          />
          <Switch
            label="Mailroom Full?"
            checked={formData.mailroom_full}
            onChange={(e) =>
              setFormData({
                ...formData,
                mailroom_full: e.currentTarget.checked,
              })
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

      {/* --- SCAN UPLOAD MODAL --- */}
      <Modal
        opened={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Upload Scanned Document"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Upload the PDF scan for package:{" "}
            <b>{packageToScan?.tracking_number}</b>
          </Text>

          <FileInput
            label="Select PDF File"
            placeholder="Click to select file"
            accept="application/pdf"
            leftSection={<IconUpload size={14} />}
            value={scanFile}
            onChange={setScanFile}
            clearable
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setScanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={handleSubmitScan}
              loading={isUploading}
            >
              Upload Scan
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
