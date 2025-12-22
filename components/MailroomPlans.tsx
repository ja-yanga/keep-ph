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
  Select,
  Switch,
  ThemeIcon,
  Alert, // Added Alert
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconEdit,
  IconEye,
  IconRefresh,
  IconSearch,
  IconDatabase,
  IconMail,
  IconPackage,
  IconScan,
  IconCheck,
  IconX,
  IconAlertCircle, // Added IconAlertCircle
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";

type Plan = {
  id: string;
  name: string;
  price: number;
  description?: string | null;
  storage_limit?: number | null;
  can_receive_mail: boolean;
  can_receive_parcels: boolean;
  can_digitize: boolean;
};

export default function MailroomPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [sortBy, setSortBy] = useState<string | null>(null);

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

  // NEW: Alert States
  const [formError, setFormError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);

  const editForm = useForm({
    initialValues: {
      name: "",
      price: 0,
      description: "",
      storage_limit: 0,
      can_receive_mail: true,
      can_receive_parcels: false,
      can_digitize: true,
    },
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  // Reset form error when modals open/close
  useEffect(() => {
    if (editOpen) {
      setFormError(null);
    }
  }, [editOpen]);

  // Auto-dismiss global success alert after 5 seconds
  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => {
        setGlobalSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  const clearFilters = () => {
    setSearch("");
    setSortBy(null);
  };

  const hasFilters = search || sortBy;

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

    // Convert stored MB to GB for the form
    let limitGB = 0;
    if (p.storage_limit) {
      limitGB = p.storage_limit / 1024;
    }

    editForm.setValues({
      name: p.name ?? "",
      price: p.price ?? 0,
      description: p.description ?? "",
      storage_limit: limitGB,
      can_receive_mail: p.can_receive_mail ?? true,
      can_receive_parcels: p.can_receive_parcels ?? false,
      can_digitize: p.can_digitize ?? true,
    });
    setEditOpen(true);
  };

  // edit handler
  const handleEdit = editForm.onSubmit(async (values) => {
    if (!editPlan) return;

    setEditing(true);
    setFormError(null); // Clear previous errors
    try {
      // Convert form GB back to MB for storage
      let finalStorageMB = null;
      if (values.storage_limit && values.storage_limit > 0) {
        finalStorageMB = values.storage_limit * 1024;
      }

      const payload = {
        name: values.name,
        price: values.price,
        description: values.description || null,
        storage_limit: finalStorageMB,
        can_receive_mail: values.can_receive_mail,
        can_receive_parcels: values.can_receive_parcels,
        can_digitize: values.can_digitize,
      };
      const res = await fetch(`/api/admin/mailroom/plans/${editPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update plan");
      }

      // Success: Close modal and show global success
      setGlobalSuccess("Plan updated successfully!");
      setEditOpen(false);
      setEditPlan(null);
      fetchData();
    } catch (err: unknown) {
      console.error("edit error", err);
      // Error: Keep modal open and show error inside
      setFormError(err?.message ?? "Failed to update plan");
    } finally {
      setEditing(false);
    }
  });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(val);

  // Helper to format storage for display
  const formatStorage = (mb: number | null | undefined) => {
    if (!mb) return "Unlimited";
    // Always display in GB if >= 1GB (which is 1024 MB)
    if (mb >= 1024) {
      const gb = mb / 1024;
      // Show up to 2 decimal places, remove trailing zeros
      return `${parseFloat(gb.toFixed(2))} GB`;
    }
    return `${mb} MB`;
  };

  // Helper to render capability icons
  const renderCapabilities = (plan: Plan) => (
    <Group gap="xs">
      <Tooltip label="Receives Mail">
        <ThemeIcon
          variant="light"
          color={plan.can_receive_mail ? "blue" : "gray"}
          size="sm"
        >
          <IconMail size={12} />
        </ThemeIcon>
      </Tooltip>
      <Tooltip label="Receives Parcels">
        <ThemeIcon
          variant="light"
          color={plan.can_receive_parcels ? "orange" : "gray"}
          size="sm"
        >
          <IconPackage size={12} />
        </ThemeIcon>
      </Tooltip>
      <Tooltip label="Digitization">
        <ThemeIcon
          variant="light"
          color={plan.can_digitize ? "cyan" : "gray"}
          size="sm"
        >
          <IconScan size={12} />
        </ThemeIcon>
      </Tooltip>
    </Group>
  );

  const filteredPlans = plans
    .filter((p) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        String(p.name ?? "")
          .toLowerCase()
          .includes(q) ||
        String(p.description ?? "")
          .toLowerCase()
          .includes(q);

      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      return 0;
    });

  const paginatedPlans = filteredPlans.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <Stack>
      {/* GLOBAL SUCCESS ALERT */}
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper p="md" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group style={{ flex: 1 }}>
            <TextInput
              placeholder="Search plans..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ width: 250 }}
            />
            <Select
              placeholder="Sort By"
              data={[
                { value: "name_asc", label: "Name (A-Z)" },
                { value: "price_asc", label: "Price (Low-High)" },
                { value: "price_desc", label: "Price (High-Low)" },
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
              width: 180,
              render: ({ name }: Plan) => <Text fw={500}>{name}</Text>,
            },
            {
              accessor: "capabilities", // Virtual column
              title: "Capabilities",
              width: 120,
              render: (plan: Plan) => renderCapabilities(plan),
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
              accessor: "storage_limit",
              title: "Storage Limit",
              width: 150,
              render: ({ storage_limit }: Plan) => (
                <Group gap={4}>
                  <IconDatabase size={14} color="gray" />
                  <Text size="sm">{formatStorage(storage_limit)}</Text>
                </Group>
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

            <SimpleGrid cols={2}>
              <Paper
                withBorder
                p="md"
                radius="md"
                bg="var(--mantine-color-gray-0)"
              >
                <Stack gap="xs">
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Storage Limit
                  </Text>
                  <Group gap="xs">
                    <IconDatabase size={20} />
                    <Text size="lg" fw={600}>
                      {formatStorage(viewPlan.storage_limit)}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </SimpleGrid>

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

            <Paper withBorder p="md" radius="md">
              <Text size="xs" c="dimmed" tt="uppercase" fw={700} mb="sm">
                Capabilities
              </Text>
              <Stack gap="xs">
                <Group>
                  {viewPlan.can_receive_mail ? (
                    <IconCheck size={18} color="green" />
                  ) : (
                    <IconX size={18} color="gray" />
                  )}
                  <Text size="sm">Receive Mail</Text>
                </Group>
                <Group>
                  {viewPlan.can_receive_parcels ? (
                    <IconCheck size={18} color="green" />
                  ) : (
                    <IconX size={18} color="gray" />
                  )}
                  <Text size="sm">Receive Parcels</Text>
                </Group>
                <Group>
                  {viewPlan.can_digitize ? (
                    <IconCheck size={18} color="green" />
                  ) : (
                    <IconX size={18} color="gray" />
                  )}
                  <Text size="sm">Digitization Service</Text>
                </Group>
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
        size="lg"
      >
        <form onSubmit={handleEdit}>
          <Stack gap="md">
            {/* ERROR ALERT INSIDE MODAL */}
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
              label="Plan Name"
              placeholder="e.g. Personal Plan"
              required
              readOnly
              {...editForm.getInputProps("name")}
            />

            <SimpleGrid cols={2}>
              <NumberInput
                label="Price"
                placeholder="0.00"
                min={0}
                required
                leftSection={
                  <Text size="sm" c="dimmed">
                    ₱
                  </Text>
                }
                {...editForm.getInputProps("price")}
              />

              <NumberInput
                label="Storage Limit (GB)"
                placeholder="1"
                min={1}
                decimalScale={2}
                fixedDecimalScale={false}
                {...editForm.getInputProps("storage_limit")}
                required
              />
            </SimpleGrid>

            <Textarea
              label="Description"
              placeholder="Plan features and details..."
              minRows={4}
              {...editForm.getInputProps("description")}
            />

            <Paper
              withBorder
              p="md"
              radius="md"
              bg="var(--mantine-color-gray-0)"
            >
              <Text size="sm" fw={500} mb="md">
                Plan Capabilities
              </Text>
              <Stack gap="sm">
                <Switch
                  label="Can Receive Mail"
                  description="Allows receiving letters and documents"
                  {...editForm.getInputProps("can_receive_mail", {
                    type: "checkbox",
                  })}
                />
                <Switch
                  label="Can Receive Parcels"
                  description="Allows receiving packages and boxes"
                  {...editForm.getInputProps("can_receive_parcels", {
                    type: "checkbox",
                  })}
                />
                <Switch
                  label="Digitization Service"
                  description="Allows scanning and uploading mail contents"
                  {...editForm.getInputProps("can_digitize", {
                    type: "checkbox",
                  })}
                />
              </Stack>
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={editing} color="blue">
                Save Changes
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
