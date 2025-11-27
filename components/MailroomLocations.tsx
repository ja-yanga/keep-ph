"use client";
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Button,
  Loader,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Group,
  Badge,
  Divider,
  Space,
  Tooltip,
  Modal,
  NumberInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconRefresh, IconEye, IconEdit } from "@tabler/icons-react";

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
  const [locations, setLocations] = useState<Location[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  // sorting
  const [sortBy, setSortBy] = useState<string | null>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let mounted = true;
    const loadLocations = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mailroom/locations");
        if (!mounted) return;
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json?.error || "Failed to load locations");
          setLocations([]);
          return;
        }
        const json = await res.json();
        setLocations(json.data ?? []);
      } catch (err) {
        console.error("Load error", err);
        setError("Failed to load locations");
        setLocations([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadLocations();
    return () => {
      mounted = false;
    };
  }, []);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const filtered = useMemo(() => {
    if (!locations) return [];
    const q = search.trim().toLowerCase();
    const out = locations.filter((loc) => {
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

    if (!sortBy) return out;
    const sorted = out.slice().sort((a, b) => {
      const va = (a as any)[sortBy];
      const vb = (b as any)[sortBy];
      if (va == null && vb == null) return 0;
      if (va == null) return sortDir === "asc" ? -1 : 1;
      if (vb == null) return sortDir === "asc" ? 1 : -1;
      if (sortBy === "total_lockers") {
        const na = Number(va ?? 0);
        const nb = Number(vb ?? 0);
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return sorted;
  }, [locations, search, sortBy, sortDir]);

  const refresh = () => {
    setLocations(null);
    setError(null);
    setLoading(true);
    fetch("/api/mailroom/locations")
      .then((res) => res.json())
      .then((json) => setLocations(json.data ?? []))
      .catch(() => setLocations([]))
      .finally(() => setLoading(false));
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
      // created successfully
      setCreateOpen(false);
      form.reset();
      refresh();
    } catch (err: any) {
      console.error("create error", err);
      alert(err?.message ?? "Failed to create location");
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
      console.error("editLocation missing id", editLocation);
      alert("Missing location id. Cannot save changes.");
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
        total_lockers: values.total_lockers ?? 0,
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
      setEditOpen(false);
      setEditLocation(null);
      refresh();
    } catch (err: any) {
      console.error("edit error", err);
      alert(err?.message ?? "Failed to update location");
    } finally {
      setEditing(false);
    }
  });

  return (
    <Stack gap="lg">
      <Box>
        <Title order={1} size="xl">
          Mailroom Locations
        </Title>
      </Box>

      <Group align="apart" gap="sm">
        <Group gap="sm" style={{ flex: 1 }}>
          <TextInput
            placeholder="Search by name, region, city, barangay or zip..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 280 }}
          />
          <Tooltip label="Refresh list">
            <Button leftSection={<IconRefresh size={16} />} onClick={refresh}>
              Refresh
            </Button>
          </Tooltip>
          <Space w="sm" />
        </Group>

        {/* Create */}
        <Button variant="outline" onClick={() => setCreateOpen(true)}>
          Create
        </Button>
      </Group>

      <Divider />

      <Box
        style={{
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.06)",
          background: "white",
          overflow: "hidden",
        }}
      >
        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("name")}
              >
                Name{" "}
                {sortBy === "name" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("region")}
              >
                Region{" "}
                {sortBy === "region" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("city")}
              >
                City{" "}
                {sortBy === "city" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("barangay")}
              >
                Barangay{" "}
                {sortBy === "barangay" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("zip")}
              >
                Zip {sortBy === "zip" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("total_lockers")}
              >
                Total Lockers{" "}
                {sortBy === "total_lockers"
                  ? sortDir === "asc"
                    ? "▲"
                    : "▼"
                  : null}
              </Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {loading || locations === null ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Loader />
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text color="red">{error}</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text color="dimmed">No locations found</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((loc) => (
                <Table.Tr key={loc.id}>
                  <Table.Td>{loc.name}</Table.Td>
                  <Table.Td>{loc.region ?? "—"}</Table.Td>
                  <Table.Td>{loc.city ?? "—"}</Table.Td>
                  <Table.Td>{loc.barangay ?? "—"}</Table.Td>
                  <Table.Td>{loc.zip ?? "—"}</Table.Td>
                  <Table.Td>
                    <Badge color="blue">{loc.total_lockers ?? 0}</Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" align="right">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconEye size={14} />}
                        onClick={() => openView(loc)}
                      >
                        View
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        leftSection={<IconEdit size={14} />}
                        onClick={() => openEdit(loc)}
                      >
                        Edit
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Box>

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
            <Group align="right" mt="sm">
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
        title="Location"
        centered
      >
        <Stack gap="xs">
          <Text>{viewLocation?.name}</Text>
          <Text color="dimmed">Region: {viewLocation?.region ?? "—"}</Text>
          <Text color="dimmed">City: {viewLocation?.city ?? "—"}</Text>
          <Text color="dimmed">Barangay: {viewLocation?.barangay ?? "—"}</Text>
          <Text color="dimmed">Zip: {viewLocation?.zip ?? "—"}</Text>
          <Text color="dimmed">
            Total lockers: {viewLocation?.total_lockers ?? 0}
          </Text>
          <Group align="right" mt="sm">
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </Group>
        </Stack>
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
            <NumberInput
              label="Total Lockers"
              min={0}
              {...editForm.getInputProps("total_lockers")}
            />
            <Group align="right" mt="sm">
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
