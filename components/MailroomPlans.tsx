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
  Textarea,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconRefresh, IconEye, IconEdit } from "@tabler/icons-react";

type Plan = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
};

export default function MailroomPlans() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // view/edit modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editPlan, setEditPlan] = useState<Plan | null>(null);
  const [editing, setEditing] = useState(false);

  const editForm = useForm({
    initialValues: {
      name: "",
      price: 0,
      description: "",
    },
  });

  // sorting
  const [sortBy, setSortBy] = useState<string | null>("price");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    let mounted = true;
    const loadPlans = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/mailroom/plans");
        if (!mounted) return;
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          setError(json?.error || "Failed to load plans");
          setPlans([]);
          return;
        }
        const json = await res.json();
        setPlans(json.data ?? []);
      } catch (err) {
        console.error("Load error", err);
        setError("Failed to load plans");
        setPlans([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadPlans();
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
    if (!plans) return [];
    const q = search.trim().toLowerCase();
    const out = plans.filter((p) => {
      if (!q) return true;
      return (
        String(p.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.description ?? "")
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
      if (sortBy === "price") {
        const na = Number(va ?? 0);
        const nb = Number(vb ?? 0);
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(va).toLowerCase();
      const sb = String(vb).toLowerCase();
      return sortDir === "asc" ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
    return sorted;
  }, [plans, search, sortBy, sortDir]);

  const refresh = () => {
    setPlans(null);
    setError(null);
    setLoading(true);
    fetch("/api/mailroom/plans")
      .then((res) => res.json())
      .then((json) => setPlans(json.data ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  };

  // open view modal
  const openView = (p: Plan) => {
    setViewPlan(p);
    setViewOpen(true);
  };

  // open edit modal and populate form
  const openEdit = (p: Plan) => {
    setEditPlan(p);
    editForm.setValues({
      name: p.name ?? "",
      price: p.price ?? 0,
      description: p.description ?? "",
    });
    setEditOpen(true);
  };

  // edit handler
  const handleEdit = editForm.onSubmit(async (values) => {
    if (!editPlan) return;
    if (!editPlan.id) {
      console.error("editPlan missing id", editPlan);
      alert("Missing plan id. Cannot save changes.");
      return;
    }

    setEditing(true);
    try {
      const payload = {
        name: values.name,
        price: values.price,
        description: values.description || null,
      };
      const res = await fetch(`/api/mailroom/plans/${editPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || "Failed to update plan");
      }
      setEditOpen(false);
      setEditPlan(null);
      refresh();
    } catch (err: any) {
      console.error("edit error", err);
      alert(err?.message ?? "Failed to update plan");
    } finally {
      setEditing(false);
    }
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val);

  return (
    <Stack gap="lg">
      <Box>
        <Title order={1} size="xl">
          Service Plans
        </Title>
      </Box>

      <Group align="apart" gap="sm">
        <Group gap="sm" style={{ flex: 1 }}>
          <TextInput
            placeholder="Search by name or description..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 280 }}
          />
          <Tooltip label="Refresh list">
            <Button leftSection={<IconRefresh size={16} />} onClick={refresh}>
              Refresh
            </Button>
          </Tooltip>
        </Group>
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
                onClick={() => toggleSort("price")}
              >
                Price{" "}
                {sortBy === "price" ? (sortDir === "asc" ? "▲" : "▼") : null}
              </Table.Th>
              <Table.Th
                style={{ cursor: "pointer" }}
                onClick={() => toggleSort("description")}
              >
                Description{" "}
                {sortBy === "description"
                  ? sortDir === "asc"
                    ? "▲"
                    : "▼"
                  : null}
              </Table.Th>
              <Table.Th>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>

          <Table.Tbody>
            {loading || plans === null ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Loader />
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : error ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text c="red">{error}</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : filtered.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={4}>
                  <Box style={{ padding: 24, textAlign: "center" }}>
                    <Text c="dimmed">No plans found</Text>
                  </Box>
                </Table.Td>
              </Table.Tr>
            ) : (
              filtered.map((p) => (
                <Table.Tr key={p.id}>
                  <Table.Td>
                    <Text fw={500}>{p.name}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="green" variant="light" size="lg">
                      {formatCurrency(p.price)}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text lineClamp={1} size="sm" c="dimmed">
                      {p.description ?? "—"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" align="right">
                      <Button
                        size="xs"
                        variant="light"
                        leftSection={<IconEye size={14} />}
                        onClick={() => openView(p)}
                      >
                        View
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        leftSection={<IconEdit size={14} />}
                        onClick={() => openEdit(p)}
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

      {/* View modal */}
      <Modal
        opened={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Plan Details"
        centered
      >
        <Stack gap="md">
          <Box>
            <Text size="sm" c="dimmed">
              Name
            </Text>
            <Text fw={600} size="lg">
              {viewPlan?.name}
            </Text>
          </Box>
          <Box>
            <Text size="sm" c="dimmed">
              Price
            </Text>
            <Text fw={600} size="lg" c="green.7">
              {viewPlan ? formatCurrency(viewPlan.price) : "—"}
            </Text>
          </Box>
          <Box>
            <Text size="sm" c="dimmed">
              Description
            </Text>
            <Text>{viewPlan?.description ?? "—"}</Text>
          </Box>
          <Group justify="flex-end" mt="sm">
            <Button onClick={() => setViewOpen(false)}>Close</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit modal */}
      <Modal
        opened={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Plan"
        centered
      >
        <form onSubmit={handleEdit}>
          <Stack>
            <TextInput
              label="Name"
              required
              {...editForm.getInputProps("name")}
            />
            <NumberInput
              label="Price (PHP)"
              min={0}
              required
              {...editForm.getInputProps("price")}
            />
            <Textarea
              label="Description"
              minRows={3}
              {...editForm.getInputProps("description")}
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
