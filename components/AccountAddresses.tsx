"use client";
import React, { useEffect, useState } from "react";
import {
  Stack,
  Title,
  Paper,
  Button,
  Group,
  TextInput,
  ActionIcon,
  Modal,
  Text,
  Badge,
  Loader,
  Grid,
  Card,
  Checkbox,
  Divider, // Added Divider for visual separation in the card
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEdit,
  IconMapPin,
  IconUser, // Added for Contact Name context
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

// Helper type for address data consistency - UPDATED to include contact_name
interface Address {
  id: string;
  label: string;
  contact_name: string; // NEW FIELD
  line1: string;
  line2: string;
  city: string;
  region: string;
  postal: string;
  is_default: boolean;
  user_id?: string;
}

const initialFormState: Address = {
  id: "",
  label: "",
  contact_name: "", // NEW FIELD
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal: "",
  is_default: false,
};

export default function AccountAddresses({ userId }: { userId: string }) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  // Using the typed initialFormState ensures consistency
  const [form, setForm] = useState<Address>(initialFormState);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/user/addresses?userId=${encodeURIComponent(userId)}`
      );
      const json = await res.json();
      // Ensure data is structured and typed correctly
      setAddresses(Array.isArray(json?.data) ? json.data : json || []);
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error",
        message: "Failed to load addresses.",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) load();
  }, [userId]);

  const openAdd = () => {
    setEditing(null);
    setForm(initialFormState);
    setModalOpen(true);
  };

  const openEdit = (a: Address) => {
    setEditing(a);
    // Use spread to copy all properties
    setForm({ ...a });
    setModalOpen(true);
  };

  const save = async () => {
    // UPDATED VALIDATION
    if (
      !form.label ||
      !form.contact_name ||
      !form.line1 ||
      !form.city ||
      !form.region
    ) {
      notifications.show({
        title: "Required fields missing",
        message:
          "Label, Contact Name, Address line 1, City, and Region are required.",
        color: "red",
      });
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        ...form,
        // Ensure label is saved
        label: form.label.trim(),
        user_id: userId,
        // Ensure is_default is always a boolean
        is_default: !!form.is_default,
      };

      let res: Response;
      let url: string;
      let method: "POST" | "PUT";

      if (editing && editing.id) {
        // UPDATE existing address
        url = `/api/user/addresses/${encodeURIComponent(String(editing.id))}`;
        method = "PUT";

        // Remove extraneous fields for PUT request body
        const { id, created_at, user_id, ...toSend } = payload;
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSend),
        });
      } else {
        // CREATE new address
        url = `/api/user/addresses`;
        method = "POST";

        // Remove id/created_at for POST request body
        const { id, created_at, ...toSend } = payload;
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSend),
        });
      }

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Save failed");

      notifications.show({
        title: "Success",
        message: editing
          ? "Address updated successfully."
          : "Address added successfully.",
        color: "green",
      });

      setModalOpen(false);
      load();
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to save address",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    try {
      const res = await fetch(`/api/user/addresses/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      notifications.show({
        title: "Deleted",
        message: "Address successfully removed.",
        color: "green",
      });
      load();
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to delete address",
        color: "red",
      });
    }
  };

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={4}>My Saved Delivery Addresses</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openAdd}>
          Add New Address
        </Button>
      </Group>

      {/* Loading State */}
      {loading && (
        <Group justify="center" p="xl">
          <Loader />
          <Text c="dimmed">Loading addresses...</Text>
        </Group>
      )}

      {/* Addresses List or Empty State */}
      {!loading && (
        <Stack mt="sm">
          {addresses.length === 0 ? (
            <Paper p="md" withBorder style={{ textAlign: "center" }}>
              <IconMapPin size={24} color="gray" />
              <Text c="dimmed" mt="xs">
                You haven't saved any addresses yet. Click "Add New Address" to
                get started.
              </Text>
            </Paper>
          ) : (
            addresses.map((a) => (
              <Card
                key={a.id}
                p="md"
                withBorder
                shadow="sm"
                // Highlight the default address
                style={{
                  borderLeft: a.is_default
                    ? "4px solid var(--mantine-color-blue-6)"
                    : undefined,
                }}
              >
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  {/* Address Details Block */}
                  <Stack gap={3} style={{ flexGrow: 1, minWidth: 0 }}>
                    <Group gap="xs" style={{ marginBottom: 4 }}>
                      <Text fw={700} style={{ fontSize: "1.1rem" }}>
                        {a.label || "Unnamed Address"}
                      </Text>
                      {a.is_default && (
                        <Badge color="blue" variant="light" size="sm">
                          DEFAULT
                        </Badge>
                      )}
                    </Group>

                    {/* ADDED Contact Name for clarity */}
                    {a.contact_name && (
                      <Group gap={4}>
                        <IconUser
                          size={14}
                          style={{ color: "var(--mantine-color-gray-6)" }}
                        />
                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                          Recipient:{" "}
                          <Text span fw={500} inherit>
                            {a.contact_name}
                          </Text>
                        </Text>
                      </Group>
                    )}

                    <Divider mt={5} mb={5} />

                    {/* Address Lines */}
                    <Text size="sm" style={{ lineHeight: 1.4 }}>
                      {a.line1}
                      {a.line2 && <>, {a.line2}</>}
                    </Text>

                    {/* City, Region, Postal */}
                    <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                      {[a.city, a.region, a.postal].filter(Boolean).join(", ")}
                    </Text>
                  </Stack>

                  {/* Actions Block */}
                  <Group gap="xs" wrap="nowrap">
                    <ActionIcon
                      variant="light"
                      color="blue"
                      onClick={() => openEdit(a)}
                      aria-label="Edit address"
                    >
                      <IconEdit size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      onClick={() => remove(a.id)}
                      aria-label="Delete address"
                      disabled={a.is_default} // Prevent deleting the default address easily
                      title={
                        a.is_default
                          ? "Cannot delete default address"
                          : "Delete address"
                      }
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
              </Card>
            ))
          )}
        </Stack>
      )}

      {/* Address Add/Edit Modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Saved Address" : "Add New Address"}
        centered
        size="lg" // Larger modal for the form
      >
        <Stack gap="md">
          {/* Label (Required for identification) */}
          <TextInput
            label="Address Label (e.g., Home, Office)"
            placeholder="A short name for this location"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.currentTarget.value })}
            description="A label helps you quickly identify this address later."
            required
          />
          {/* Contact Name (Recipient) */}
          <TextInput
            label="Contact Name (Recipient)"
            placeholder="Name of the person receiving the delivery"
            value={form.contact_name}
            onChange={(e) =>
              setForm({ ...form, contact_name: e.currentTarget.value })
            }
            required
          />
          <Divider my="xs" />

          {/* Address Lines */}
          <TextInput
            label="Address Line 1 (Street/Brgy/House No.)"
            placeholder="House/Unit Number, Street, Barangay"
            value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.currentTarget.value })}
            required
          />
          <TextInput
            label="Address Line 2 (Unit/Landmark/Subdivision)"
            placeholder="Building/Unit Name, Landmark (Optional)"
            value={form.line2}
            onChange={(e) => setForm({ ...form, line2: e.currentTarget.value })}
          />

          {/* City, Region, Postal Code arranged in a Grid */}
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="City"
                placeholder="e.g., Quezon City"
                value={form.city}
                onChange={(e) =>
                  setForm({ ...form, city: e.currentTarget.value })
                }
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              <TextInput
                label="Region/Province"
                placeholder="e.g., Metro Manila"
                value={form.region}
                onChange={(e) =>
                  setForm({ ...form, region: e.currentTarget.value })
                }
                required
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 4 }}>
              {/* Postal Code uses numeric input mode */}
              <TextInput
                label="Postal Code"
                placeholder="e.g., 1100"
                value={form.postal}
                onChange={(e) =>
                  setForm({ ...form, postal: e.currentTarget.value })
                }
                type="number"
                inputMode="numeric"
                required
              />
            </Grid.Col>
          </Grid>

          <Checkbox
            label="Set as default delivery address"
            checked={form.is_default}
            onChange={(e) =>
              setForm({ ...form, is_default: e.currentTarget.checked })
            }
            mt="xs"
          />

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              loading={loading}
              disabled={
                loading ||
                !form.label ||
                !form.contact_name ||
                !form.line1 ||
                !form.city ||
                !form.region
              }
            >
              Save Address
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
