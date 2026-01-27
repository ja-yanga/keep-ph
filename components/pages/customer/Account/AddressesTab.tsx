"use client";
import React, { useEffect, useMemo, useState } from "react";
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
  Divider,
  Container, // Added Divider for visual separation in the card
} from "@mantine/core";
import { IconPlus, IconTrash, IconEdit, IconMapPin } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { useSession } from "@/components/SessionProvider";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setAddressDetails,
  setAddressDetailsLoading,
} from "@/store/slices/userSlice";
import { normalizeAddresses } from "@/utils/normalize-data/addresses";
import {
  T_Address,
  T_TransformedAddress,
  transformAddress,
} from "@/utils/transform/address";

const initialFormState: Omit<T_TransformedAddress, "userId" | "createdAt"> = {
  id: "",
  label: "",
  line1: "",
  line2: "",
  city: "",
  region: "",
  postal: "",
  isDefault: false,
};

export default function AccountAddressesTab() {
  const dispatch = useAppDispatch();
  const { addressDetails } = useAppSelector((state) => state.user);
  const { addresses, loading } = addressDetails;
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Omit<
    T_TransformedAddress,
    "userId" | "createdAt"
  > | null>(null);
  const [editing, setEditing] = useState<Omit<
    T_TransformedAddress,
    "userId" | "createdAt"
  > | null>(null);

  const { session } = useSession();
  const userId = useMemo(
    () => (session?.user?.id as string) || "",
    [session?.user?.id],
  );

  // Using the typed initialFormState ensures consistency
  const [form, setForm] =
    useState<Omit<T_TransformedAddress, "userId" | "createdAt">>(
      initialFormState,
    );

  const load = async () => {
    console.time("addresses.load.total");
    dispatch(setAddressDetailsLoading(true));
    const t0 = performance.now();
    try {
      const res = await fetch(API_ENDPOINTS.user.addresses());
      const json = await res.json();
      // Ensure only items with required T_Address properties get transformed
      const data = normalizeAddresses(json.data);
      const transformed = data
        .filter(
          (item): item is T_Address =>
            typeof item === "object" &&
            item !== null &&
            "user_address_id" in item &&
            "user_address_label" in item &&
            "user_address_line1" in item &&
            "user_address_city" in item &&
            "user_address_region" in item &&
            "user_address_postal" in item &&
            "user_address_is_default" in item,
        )
        .map((item) => transformAddress(item));
      React.startTransition(() => {
        dispatch(setAddressDetails(transformed));
      });

      const t1 = performance.now();
      console.log("addresses.fetch.ms", Math.round(t1 - t0));
    } catch (e) {
      console.error(e);
      notifications.show({
        title: "Error",
        message: "Failed to load addresses.",
        color: "red",
      });
    } finally {
      dispatch(setAddressDetailsLoading(false));
      console.timeEnd("addresses.load.total");
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

  const openEdit = (a: Omit<T_TransformedAddress, "userId" | "createdAt">) => {
    setEditing(a);
    // Use spread to copy all properties
    setForm({ ...a });
    setModalOpen(true);
  };

  const save = async () => {
    // UPDATED VALIDATION
    if (!form.label || !form.line1 || !form.city || !form.region) {
      notifications.show({
        title: "Required fields missing",
        message: "Label, Address line 1, City, and Region are required.",
        color: "red",
      });
      return;
    }

    dispatch(setAddressDetailsLoading(true));

    try {
      const payload: Record<string, unknown> = {
        id: form.id,
        label: form.label.trim(),
        line1: form.line1,
        line2: form.line2,
        city: form.city,
        region: form.region,
        postal: form.postal,
        is_default: addresses.length === 0 ? true : !!form.isDefault,
        user_id: userId,
      };

      let res: Response;
      let url: string;
      let method: "POST" | "PUT";

      if (editing && editing.id) {
        // UPDATE existing address
        url = API_ENDPOINTS.user.addresses(
          encodeURIComponent(String(editing.id)),
        );
        method = "PUT";

        // Remove extraneous fields for PUT request body
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- id, created_at, user_id are intentionally destructured but not used
        const { id, created_at, user_id, ...toSend } = payload;
        res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toSend),
        });
      } else {
        // CREATE new address
        url = API_ENDPOINTS.user.addresses();
        method = "POST";

        // Remove id/created_at for POST request body
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- id, created_at are intentionally destructured but not used
        const { id, created_at, ...toSend } = payload;
        console.log(toSend, "toSend");
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
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save address";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    } finally {
      dispatch(setAddressDetailsLoading(false));
    }
  };

  const remove = async (id: string) => {
    try {
      const res = await fetch(API_ENDPOINTS.user.addresses(id), {
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
    } catch (err: unknown) {
      console.error(err);
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete address";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    }
  };

  return (
    <>
      <Container size="md" px={0}>
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
              {!Array.isArray(addresses) || addresses.length === 0 ? (
                <Paper p="md" withBorder style={{ textAlign: "center" }}>
                  <IconMapPin size={24} color="gray" />
                  <Text c="dimmed" mt="xs">
                    You haven&apos;t saved any addresses yet. Click &quot;Add
                    New Address&quot; to get started.
                  </Text>
                </Paper>
              ) : (
                addresses.map((a, idx) => (
                  <Card
                    key={a.id || `address-${idx}`}
                    p="md"
                    withBorder
                    shadow="sm"
                    // Highlight the default address
                    style={{
                      borderLeft: a.isDefault
                        ? "4px solid var(--mantine-color-blue-6)"
                        : undefined,
                    }}
                  >
                    <Group
                      justify="space-between"
                      align="flex-start"
                      wrap="nowrap"
                    >
                      {/* Address Details Block */}
                      <Stack gap={3} style={{ flexGrow: 1, minWidth: 0 }}>
                        <Group gap="xs" style={{ marginBottom: 4 }}>
                          <Text fw={700} style={{ fontSize: "1.1rem" }}>
                            {a.label || "Unnamed Address"}
                          </Text>
                          {a.isDefault && (
                            <Badge color="blue" variant="light" size="sm">
                              DEFAULT
                            </Badge>
                          )}
                        </Group>

                        <Divider mt={5} mb={5} />

                        {/* Address Lines */}
                        <Text size="sm" style={{ lineHeight: 1.4 }}>
                          {a.line1}
                          {a.line2 ? `, ${a.line2}` : ""}
                        </Text>

                        {/* City, Region, Postal */}
                        <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
                          {[a.city, a.region, a.postal]
                            .filter(Boolean)
                            .map((s) => s.replace(/_/g, " "))
                            .join(", ")}
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
                          onClick={() => {
                            setDeleteTarget(a);
                            setDeleteModalOpen(true);
                          }}
                          aria-label="Delete address"
                          disabled={a.isDefault} // Prevent deleting the default address easily
                          title={
                            a.isDefault
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
                onChange={(e) =>
                  setForm({ ...form, label: e.currentTarget.value })
                }
                description="A label helps you quickly identify this address later."
                required
              />
              <Divider my="xs" />

              {/* Address Lines */}
              <TextInput
                label="Address Line 1 (Street/Brgy/House No.)"
                placeholder="House/Unit Number, Street, Barangay"
                value={form.line1}
                onChange={(e) =>
                  setForm({ ...form, line1: e.currentTarget.value })
                }
                required
              />
              <TextInput
                label="Address Line 2 (Unit/Landmark/Subdivision)"
                placeholder="Building/Unit Name, Landmark (Optional)"
                value={form.line2 ?? ""}
                onChange={(e) =>
                  setForm({ ...form, line2: e.currentTarget.value })
                }
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

              {addresses?.length > 0 && (
                <Checkbox
                  label="Set as default delivery address"
                  checked={form.isDefault}
                  onChange={(e) =>
                    setForm({ ...form, isDefault: e.currentTarget.checked })
                  }
                  mt="xs"
                />
              )}

              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => setModalOpen(false)}
                  disabled={
                    loading ||
                    !form.label ||
                    !form.line1 ||
                    !form.city ||
                    !form.region
                  }
                >
                  Cancel
                </Button>
                <Button
                  onClick={save}
                  loading={loading}
                  disabled={
                    loading ||
                    !form.label ||
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

          <Modal
            opened={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
            title="Delete address"
            centered
            size="sm"
          >
            <Stack>
              <Text>
                {deleteTarget?.label
                  ? `Remove “${deleteTarget.label}”?`
                  : "Remove this address?"}
              </Text>
              <Text c="dimmed" size="sm">
                This action cannot be undone.
              </Text>
              <Group justify="flex-end" mt="md">
                <Button
                  variant="default"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  onClick={async () => {
                    if (!deleteTarget?.id) return;
                    await remove(deleteTarget.id);
                    setDeleteModalOpen(false);
                    setDeleteTarget(null);
                  }}
                  disabled={loading}
                  loading={loading}
                >
                  Delete
                </Button>
              </Group>
            </Stack>
          </Modal>
        </Stack>
      </Container>
    </>
  );
}
