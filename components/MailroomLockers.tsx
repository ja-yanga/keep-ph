"use client";

// Add this import to fix the table layout and pagination styles
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
  Title,
  Tooltip,
  Switch,
  Box,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconLock,
  IconLockOpen,
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

export default function MailroomLockers() {
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [editingLocker, setEditingLocker] = useState<Locker | null>(null);
  const [formData, setFormData] = useState({
    locker_code: "",
    location_id: "",
    is_available: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [lockersRes, locationsRes] = await Promise.all([
        fetch("/api/admin/mailroom/lockers"),
        fetch("/api/mailroom/locations"),
      ]);

      if (lockersRes.ok) {
        const data = await lockersRes.json();
        setLockers(data);
      }
      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(Array.isArray(data.data) ? data.data : data);
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

  const handleOpenModal = (locker?: Locker) => {
    if (locker) {
      setEditingLocker(locker);
      setFormData({
        locker_code: locker.locker_code,
        location_id: locker.location_id,
        is_available: locker.is_available,
      });
    } else {
      setEditingLocker(null);
      setFormData({
        locker_code: "",
        location_id: "",
        is_available: true,
      });
    }
    open();
  };

  const handleSubmit = async () => {
    if (!formData.locker_code || !formData.location_id) {
      notifications.show({
        title: "Validation Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    setSubmitting(true);
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

      if (!res.ok) throw new Error("Failed to save");

      notifications.show({
        title: "Success",
        message: `Locker ${editingLocker ? "updated" : "created"} successfully`,
        color: "green",
      });

      close();
      fetchData(); // Refresh list
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to save locker",
        color: "red",
      });
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

      notifications.show({
        title: "Success",
        message: "Locker deleted successfully",
        color: "green",
      });
      fetchData();
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
    return (
      l.locker_code.toLowerCase().includes(q) ||
      l.location?.name.toLowerCase().includes(q)
    );
  });

  const paginatedLockers = filteredLockers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Stack align="center">
      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search lockers..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Button
            leftSection={<IconPlus size={16} />}
            onClick={() => handleOpenModal()}
          >
            Add Locker
          </Button>
        </Group>

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
            placeholder="Select mailroom location"
            required
            data={locations.map((l) => ({ value: l.id, label: l.name }))}
            value={formData.location_id}
            onChange={(val) =>
              setFormData({ ...formData, location_id: val || "" })
            }
            disabled={!!editingLocker} // Disable location change on edit to simplify logic
          />
          <Switch
            label="Available"
            checked={formData.is_available}
            onChange={(e) =>
              setFormData({
                ...formData,
                is_available: e.currentTarget.checked,
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
    </Stack>
  );
}
