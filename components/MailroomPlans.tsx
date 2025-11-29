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
  Stack,
  TextInput,
  Title,
  Tooltip,
  Box,
  NumberInput,
  Textarea,
  Text,
  SimpleGrid,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconEye,
  IconRefresh,
  IconSearch,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";

type Plan = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
};

export default function MailroomPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [viewPlan, setViewPlan] = useState<Plan | null>(null);

  // Edit modal state
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
      const res = await fetch("/api/admin/mailroom/plans");
      if (!res.ok) {
        throw new Error("Failed to load plans");
      }
      const json = await res.json();
      setPlans(json.data ?? []);
    } catch (err) {
      console.error("Load error", err);
      notifications.show({
        title: "Error",
        message: "Failed to load plans",
        color: "red",
      });
      setPlans([]);
    } finally {
      setLoading(false);
    }
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

    setEditing(true);
    try {
      const payload = {
        name: values.name,
        price: values.price,
        description: values.description || null,
      };
      const res = await fetch(`/api/admin/mailroom/plans/${editPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update plan");
      }

      notifications.show({
        title: "Success",
        message: "Plan updated successfully",
        color: "green",
      });

      setEditOpen(false);
      setEditPlan(null);
      fetchData();
    } catch (err: any) {
      console.error("edit error", err);
      notifications.show({
        title: "Error",
        message: err?.message ?? "Failed to update plan",
        color: "red",
      });
    } finally {
      setEditing(false);
    }
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val);

  const filteredPlans = plans.filter((p) => {
    const q = search.trim().toLowerCase();
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

  const paginatedPlans = filteredPlans.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Stack>
      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <TextInput
            placeholder="Search plans..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, maxWidth: 400 }}
          />
          <Tooltip label="Refresh list">
            <Button
              variant="light"
              leftSection={<IconRefresh size={16} />}
              onClick={fetchData}
            >
              Refresh
            </Button>
          </Tooltip>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="sm"
          withColumnBorders
          striped
          highlightOnHover
          records={paginatedPlans}
          fetching={loading}
          minHeight={200}
          totalRecords={filteredPlans.length}
          recordsPerPage={pageSize}
          page={page}
          onPageChange={(p) => setPage(p)}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={setPageSize}
          columns={[
            {
              accessor: "name",
              title: "Name",
              width: 200,
              render: ({ name }: Plan) => <Text fw={500}>{name}</Text>,
            },
            {
              accessor: "price",
              title: "Price",
              width: 150,
              render: ({ price }: Plan) => (
                <Badge color="green" variant="light" size="lg">
                  {formatCurrency(price)}
                </Badge>
              ),
            },
            {
              accessor: "description",
              title: "Description",
              render: ({ description }: Plan) => (
                <Text lineClamp={1} size="sm" c="dimmed">
                  {description ?? "—"}
                </Text>
              ),
            },
            {
              accessor: "actions",
              title: "Actions",
              width: 100,
              textAlign: "right",
              render: (plan: Plan) => (
                <Group gap="xs" justify="flex-end">
                  <Tooltip label="View Details">
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => openView(plan)}
                    >
                      <IconEye size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Edit">
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      onClick={() => openEdit(plan)}
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              ),
            },
          ]}
          noRecordsText="No plans found"
        />
      </Paper>

      {/* View modal */}
      <Modal
        opened={viewOpen}
        onClose={() => setViewOpen(false)}
        title="Plan Details"
        centered
        size="lg"
      >
        {viewPlan && (
          <Stack gap="md">
            <Group justify="space-between" align="flex-start">
              <Box>
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Plan Name
                </Text>
                <Title order={3}>{viewPlan.name}</Title>
              </Box>
              <Badge size="lg" variant="light" color="green">
                {formatCurrency(viewPlan.price)}
              </Badge>
            </Group>

            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Stack gap="xs">
                <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                  Description
                </Text>
                <Text size="sm">{viewPlan.description || "—"}</Text>
              </Stack>
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
