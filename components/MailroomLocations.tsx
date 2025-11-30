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
  Select, // Ensure Select is imported
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
  code?: string | null; // Add this
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

  // New Filter States
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string | null>(null);

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
      code: "", // Add this
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
      code: "", // Add this
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

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterRegion, filterCity, sortBy]);

  const clearFilters = () => {
    setSearch("");
    setFilterRegion(null);
    setFilterCity(null);
    setSortBy(null);
  };

  const hasFilters = search || filterRegion || filterCity || sortBy;

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/mailroom/locations");
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
        code: values.code || null, // Add this
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
        total_lockers: values.total_lockers || 0,
      };
      const res = await fetch("/api/admin/mailroom/locations", {
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

  // Get unique regions and cities for filter dropdowns
  const regions = useMemo(() => {
    const unique = new Set(locations.map((l) => l.region).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [locations]);

  const cities = useMemo(() => {
    const unique = new Set(locations.map((l) => l.city).filter(Boolean));
    return Array.from(unique).sort() as string[];
  }, [locations]);

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
      code: loc.code ?? "", // Add this
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
        code: values.code || null, // Add this
        region: values.region || null,
        city: values.city || null,
        barangay: values.barangay || null,
        zip: values.zip || null,
      };
      const res = await fetch(
        `/api/admin/mailroom/locations/${editLocation.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
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
    return locations
      .filter((loc) => {
        const matchesSearch =
          !q ||
          String(loc.name ?? "")
            .toLowerCase()
            .includes(q) ||
          String(loc.code ?? "")
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
            .includes(q);

        const matchesRegion = filterRegion ? loc.region === filterRegion : true;
        const matchesCity = filterCity ? loc.city === filterCity : true;

        return matchesSearch && matchesRegion && matchesCity;
      })
      .sort((a, b) => {
        if (sortBy === "name_asc")
          return (a.name || "").localeCompare(b.name || "");
        if (sortBy === "lockers_desc")
          return (b.total_lockers || 0) - (a.total_lockers || 0);
        if (sortBy === "lockers_asc")
          return (a.total_lockers || 0) - (b.total_lockers || 0);
        return 0;
      });
  }, [locations, search, filterRegion, filterCity, sortBy]);

  const paginatedLocations = filteredLocations.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Stack>
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group style={{ flex: 1 }}>
            <TextInput
              placeholder="Search..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 200 }}
            />
            <Select
              placeholder="Region"
              data={regions}
              value={filterRegion}
              onChange={setFilterRegion}
              clearable
              searchable
              style={{ width: 150 }}
            />
            <Select
              placeholder="City"
              data={cities}
              value={filterCity}
              onChange={setFilterCity}
              clearable
              searchable
              style={{ width: 150 }}
            />
            <Select
              placeholder="Sort By"
              data={[
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "lockers_desc", label: "Lockers (High-Low)" },
                { value: "lockers_asc", label: "Lockers (Low-High)" },
              ]}
              value={sortBy}
              onChange={setSortBy}
              clearable
              style={{ width: 180 }}
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
              accessor: "code",
              title: "Code",
              width: 100,
              render: ({ code }: Location) =>
                code ? <Badge variant="outline">{code}</Badge> : "—",
            }, // Add Code column
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
              required
              label="Location Code"
              placeholder="MKT"
              description="Used as prefix for lockers (e.g. MKT-001...100)"
              {...form.getInputProps("code")}
            />
            <TextInput
              required
              label="Region"
              placeholder="NCR"
              {...form.getInputProps("region")}
            />
            <TextInput
              required
              label="City"
              placeholder="Makati"
              {...form.getInputProps("city")}
            />
            <TextInput
              required
              label="Barangay"
              placeholder="Bel-Air"
              {...form.getInputProps("barangay")}
            />
            <TextInput
              required
              label="Zip"
              placeholder="1227"
              {...form.getInputProps("zip")}
            />
            <NumberInput
              label="Total Lockers"
              min={1}
              {...form.getInputProps("total_lockers")}
              required
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
                <Group gap="xs">
                  <Title order={3}>{viewLocation.name}</Title>
                  {viewLocation.code && (
                    <Badge variant="outline" size="lg">
                      {viewLocation.code}
                    </Badge>
                  )}
                </Group>
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
            <TextInput
              label="Location Code"
              required
              {...editForm.getInputProps("code")}
              readOnly
            />
            <TextInput
              label="Region"
              required
              {...editForm.getInputProps("region")}
            />
            <TextInput
              label="City"
              required
              {...editForm.getInputProps("city")}
            />
            <TextInput
              label="Barangay"
              required
              {...editForm.getInputProps("barangay")}
            />
            <TextInput
              label="Zip"
              required
              {...editForm.getInputProps("zip")}
            />
            <TextInput
              label="Total Lockers"
              required
              {...editForm.getInputProps("total_lockers")}
              readOnly
            />
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
