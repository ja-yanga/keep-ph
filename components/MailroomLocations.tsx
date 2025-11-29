"use client";

import "mantine-datatable/styles.layer.css";

import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  TextInput,
  Title,
  Tooltip,
  NumberInput,
  Text,
  Badge,
  ActionIcon,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconRefresh,
  IconEye,
  IconEdit,
  IconSearch,
  IconPlus,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";

type Location = {
  id: string;
  name: string;
  region?: string | null;
  city?: string | null;
  barangay?: string | null;
  zip?: string | null;
  total_lockers?: number | null;
};

export default function MailroomLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // create modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // view/edit modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewLocation, setViewLocation] = useState<Location | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [editing, setEditing] = useState(false);

  const form = useForm({
    initialValues: {
      name: "",
      region: "",
      city: "",
      barangay: "",
      zip: "",
      total_lockers: 0,
    },
  });

  const editForm = useForm({
    initialValues: {
      name: "",
      region: "",
      city: "",
      barangay: "",
      zip: "",
      total_lockers: 0,
    },
  });

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
      const res = await fetch("/api/mailroom/locations");
      if (!res.ok) {
        throw new Error("Failed to load locations");
      }
      const json = await res.json();
      setLocations(json.data ?? []);
    } catch (err) {
      console.error("Load error", err);
      notifications.show({
        title: "Error",
        message: "Failed to load locations",
        color: "red",
      });
      setLocations([]);
    } finally {
      setLoading(false);
    }
  };

  // create handler
  const handleCreate = form.onSubmit(async (values) => {
    setCreating(true);
    try {
      const payload = {
        name: values.name,
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
        total_lockers: values.total_lockers || 0,
      };
      const res = await fetch("/api/mailroom/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to create location");
      }

      notifications.show({
        title: "Success",
        message: "Location created successfully",
        color: "green",
      });

      setCreateOpen(false);
      form.reset();
      fetchData();
    } catch (err: any) {
      console.error("create error", err);
      notifications.show({
        title: "Error",
        message: err?.message ?? "Failed to create location",
        color: "red",
      });
    } finally {
      setCreating(false);
    }
  });

  // open view modal
  const openView = (loc: Location) => {
    setViewLocation(loc);
    setViewOpen(true);
  };

  // open edit modal and populate form
  const openEdit = (loc: Location) => {
    setEditLocation(loc);
    editForm.setValues({
      name: loc.name ?? "",
      region: loc.region ?? "",
      city: loc.city ?? "",
      barangay: loc.barangay ?? "",
      zip: loc.zip ?? "",
      total_lockers: loc.total_lockers ?? 0,
    });
    setEditOpen(true);
  };

  // edit handler
  const handleEdit = editForm.onSubmit(async (values) => {
    if (!editLocation) return;
    if (!editLocation.id) {
      notifications.show({
        title: "Error",
        message: "Missing location id. Cannot save changes.",
        color: "red",
      });
      return;
    }

    setEditing(true);
    try {
      const payload = {
        name: values.name,
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
      };
      const res = await fetch(`/api/mailroom/locations/${editLocation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to update location");
      }

      notifications.show({
        title: "Success",
        message: "Location updated successfully",
        color: "green",
      });

      setEditOpen(false);
      setEditLocation(null);
      fetchData();
    } catch (err: any) {
      console.error("edit error", err);
      notifications.show({
        title: "Error",
        message: err?.message ?? "Failed to update location",
        color: "red",
      });
    } finally {
      setEditing(false);
    }
  });

  const filteredLocations = useMemo(() => {
    const q = search.trim().toLowerCase();
    return locations.filter((loc) => {
      if (!q) return true;
      return (
        String(loc.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(loc.region ?? "")
          .toLowerCase()
          .includes(q) ||
        String(loc.city ?? "")
          .toLowerCase()
          .includes(q) ||
        String(loc.barangay ?? "")
          .toLowerCase()
          .includes(q) ||
        String(loc.zip ?? "")
          .toLowerCase()
          .includes(q)
      );
    });
  }, [locations, search]);

  const paginatedLocations = filteredLocations.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Stack>
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search by name, region, city, barangay or zip..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Group>
            <Tooltip label="Refresh list">
              <Button variant="light" onClick={fetchData}>
                <IconRefresh size={16} />
              </Button>
            </Tooltip>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setCreateOpen(true)}
            >
              Create
            </Button>
          </Group>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginatedLocations}
          fetching={loading}
          minHeight={200}
          totalRecords={filteredLocations.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={setPageSize}
          columns={[
            { accessor: "name", title: "Name", width: 200 },
            {
              accessor: "region",
              title: "Region",
              render: ({ region }: Location) => region ?? "—",
            },
            {
              accessor: "city",
              title: "City",
              render: ({ city }: Location) => city ?? "—",
            },
            {
              accessor: "barangay",
              title: "Barangay",
              render: ({ barangay }: Location) => barangay ?? "—",
            },
            {
              accessor: "zip",
              title: "Zip",
              width: 100,
              render: ({ zip }: Location) => zip ?? "—",
            },
            {
              accessor: "total_lockers",
              title: "Total Lockers",
              width: 120,
              textAlign: "center",
              render: ({ total_lockers }: Location) => (
                <Badge color="blue" variant="light">
                  {total_lockers ?? 0}
                </Badge>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              width: 100,
              textAlign: "right",
              render: (loc: Location) => (
                <Group gap="xs" justify="flex-end">
                  <Tooltip label="View">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => openView(loc)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Edit">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => openEdit(loc)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          noRecordsText="No locations found"
        />
      </Paper>

      {/* Create modal */}
      <Modal
        opened={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Mailroom Location"
        centered
      >
        <form onSubmit={handleCreate}>
          <Stack>
            <TextInput
              required
              label="Name"
              placeholder="Main Office - Makati"
              {...form.getInputProps("name")}
            />
            <TextInput
              label="Region"
              placeholder="NCR"
              {...form.getInputProps("region")}
            />
            <TextInput
              label="City"
              placeholder="Makati"
              {...form.getInputProps("city")}
            />
            <TextInput
              label="Barangay"
              placeholder="Bel-Air"
              {...form.getInputProps("barangay")}
            />
            <TextInput
              label="Zip"
              placeholder="1227"
              {...form.getInputProps("zip")}
            />
            <NumberInput
              label="Total Lockers"
              min={0}
              {...form.getInputProps("total_lockers")}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={creating}>
                Create
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {/* View modal */}
      <Modal
        opened={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Location Details"
        centered
        size="lg"
      >
        {viewLocation && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Location Name
                </Text>
                <Title order={3}>{viewLocation.name}</Title>
              </Box>
              <Badge size="lg" variant="light" color="blue">
                {viewLocation.total_lockers ?? 0} Lockers
              </Badge>
            </Group>

            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <SimpleGrid cols={2} spacing="md" verticalSpacing="lg">
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Region
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.region || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    City
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.city || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Barangay
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.barangay || "—"}
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Zip Code
                  </Text>
                  <Text fw={500} size="sm">
                    {viewLocation.zip || "—"}
                  </Text>
                </Box>
              </SimpleGrid>
            </Paper>

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setViewOpen(false)}>
                Close
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Edit modal */}
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Location"
        centered
      >
        <form onSubmit={handleEdit}>
          <Stack>
            <TextInput
              label="Name"
              required
              {...editForm.getInputProps("name")}
            />
            <TextInput label="Region" {...editForm.getInputProps("region")} />
            <TextInput label="City" {...editForm.getInputProps("city")} />
            <TextInput
              label="Barangay"
              {...editForm.getInputProps("barangay")}
            />
            <TextInput label="Zip" {...editForm.getInputProps("zip")} />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={editing}>
                Save
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
