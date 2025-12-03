"use client";

import React, { useState, useEffect } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  ActionIcon,
  Tooltip,
  Modal,
  Textarea,
} from "@mantine/core";
import {
  IconPackage,
  IconFileText,
  IconTruckDelivery,
  IconTrash,
  IconScan,
  IconEye, // <--- Import IconEye
  IconLock,
  IconCheck,
  IconPhoto,
  IconBox,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { DataTable } from "mantine-datatable";
import dayjs from "dayjs";

interface UserPackagesProps {
  packages: any[];
  lockers: any[];
  planCapabilities: {
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
    can_digitize: boolean;
  };
  isStorageFull?: boolean; // <--- Added prop definition
  onRefresh: () => void;
}

interface Package {
  id: string;
  tracking_number: string;
  sender: string;
  package_type: string;
  status: string;
  release_proof_url?: string | null;
}

export default function UserPackages({
  packages,
  lockers,
  planCapabilities,
  isStorageFull = false,
  onRefresh,
}: UserPackagesProps) {
  // 1. Local State for immediate UI updates
  const [localPackages, setLocalPackages] = useState<any[]>(packages);

  // 2. Sync local state if parent props change (e.g. after the background refresh finishes)
  useEffect(() => {
    setLocalPackages(packages);
  }, [packages]);

  // Action State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [actionType, setActionType] = useState<
    "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Image Preview State
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Action Handlers
  const handleActionClick = (
    pkg: any,
    type: "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED"
  ) => {
    setSelectedPackage(pkg);
    setActionType(type);
    setNotes("");
    setActionModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedPackage || !actionType) return;
    setSubmitting(true);

    try {
      let newStatus = null;
      if (actionType === "RELEASE") newStatus = "REQUEST_TO_RELEASE";
      if (actionType === "DISPOSE") newStatus = "REQUEST_TO_DISPOSE";
      if (actionType === "SCAN") newStatus = "REQUEST_TO_SCAN";
      if (actionType === "CONFIRM_RECEIVED") newStatus = "RETRIEVED";

      if (!newStatus) return;

      const res = await fetch(`/api/user/packages/${selectedPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus, notes: notes }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to update package");
      }

      // 3. Update Local State Immediately
      setLocalPackages((current) =>
        current.map((p) =>
          p.id === selectedPackage.id ? { ...p, status: newStatus } : p
        )
      );

      notifications.show({
        title: "Success",
        message:
          actionType === "CONFIRM_RECEIVED"
            ? "Package marked as retrieved"
            : "Request submitted successfully",
        color: "green",
      });

      setActionModalOpen(false);

      // 4. Trigger background refresh to ensure server sync
      onRefresh();
    } catch (err: any) {
      console.error(err);
      notifications.show({
        title: "Error",
        message: err.message || "Failed to submit action",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
    <>
      <Paper p="lg" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconPackage size={20} color="gray" />
            <Title order={4}>Packages</Title>
          </Group>
          <Badge variant="light" size="lg">
            {localPackages.length} Items
          </Badge>
        </Group>
        <ScrollArea style={{ maxHeight: 400 }}>
          <Table verticalSpacing="sm" striped highlightOnHover withTableBorder>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Tracking #</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>Locker</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Received</Table.Th>
                <Table.Th>Action</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {localPackages.length > 0 ? (
                localPackages.map((p: any) => {
                  const tracking = p.tracking_number || "—";
                  const type = p.package_type || "Parcel";

                  // Resolve locker code
                  let lockerCode = p.locker?.locker_code;
                  if (!lockerCode && p.locker_id && Array.isArray(lockers)) {
                    const assigned = lockers.find(
                      (l: any) =>
                        l.id === p.locker_id ||
                        l.locker_id === p.locker_id ||
                        l.locker?.id === p.locker_id
                    );
                    if (assigned) {
                      lockerCode =
                        assigned.locker_code || assigned.locker?.locker_code;
                    }
                  }
                  lockerCode = lockerCode || "—";

                  const status = p.status || "STORED";
                  const receivedDate = p.received_at;

                  let statusColor = "blue";
                  if (["RELEASED", "RETRIEVED"].includes(status))
                    statusColor = "green";
                  else if (status === "DISPOSED") statusColor = "red";
                  else if (status.includes("REQUEST")) statusColor = "orange";

                  return (
                    <Table.Tr key={p.id}>
                      <Table.Td>
                        <Text fw={500} size="sm">
                          {tracking}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray" size="sm">
                          {type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        {lockerCode !== "—" ? (
                          <Badge
                            variant="outline"
                            color="gray"
                            size="sm"
                            leftSection={<IconLock size={10} />}
                          >
                            {lockerCode}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Badge color={statusColor} variant="light" size="sm">
                          {status.replace(/_/g, " ")}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {receivedDate
                            ? new Date(receivedDate).toLocaleDateString()
                            : "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {status === "STORED" && (
                            <>
                              <Tooltip
                                label={
                                  isStorageFull
                                    ? "Storage Full"
                                    : "Request Release"
                                }
                              >
                                {/* Wrapper required for Tooltip to work on disabled elements */}
                                <span
                                  style={{
                                    cursor: isStorageFull
                                      ? "not-allowed"
                                      : undefined,
                                  }}
                                >
                                  <ActionIcon
                                    variant="light"
                                    color="blue"
                                    size="sm"
                                    disabled={isStorageFull}
                                    onClick={() =>
                                      handleActionClick(p, "RELEASE")
                                    }
                                  >
                                    <IconTruckDelivery size={14} />
                                  </ActionIcon>
                                </span>
                              </Tooltip>

                              <Tooltip
                                label={
                                  isStorageFull
                                    ? "Storage Full"
                                    : "Request Disposal"
                                }
                              >
                                <span
                                  style={{
                                    cursor: isStorageFull
                                      ? "not-allowed"
                                      : undefined,
                                  }}
                                >
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    size="sm"
                                    disabled={isStorageFull}
                                    onClick={() =>
                                      handleActionClick(p, "DISPOSE")
                                    }
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </span>
                              </Tooltip>

                              {type === "Document" &&
                                planCapabilities.can_digitize && (
                                  <Tooltip
                                    label={
                                      isStorageFull
                                        ? "Storage Full"
                                        : "Request Scan"
                                    }
                                  >
                                    <span
                                      style={{
                                        cursor: isStorageFull
                                          ? "not-allowed"
                                          : undefined,
                                      }}
                                    >
                                      <ActionIcon
                                        variant="light"
                                        color="violet"
                                        size="sm"
                                        disabled={isStorageFull}
                                        onClick={() =>
                                          handleActionClick(p, "SCAN")
                                        }
                                      >
                                        <IconScan size={14} />
                                      </ActionIcon>
                                    </span>
                                  </Tooltip>
                                )}
                            </>
                          )}

                          {status === "RELEASED" && (
                            <>
                              <Button
                                size="compact-xs"
                                variant="light"
                                color="green"
                                leftSection={<IconCheck size={12} />}
                                onClick={() =>
                                  handleActionClick(p, "CONFIRM_RECEIVED")
                                }
                              >
                                Confirm
                              </Button>

                              {/* FIXED: Check for proof_url instead of image_url */}
                              {(p.release_proof_url || p.image_url) && (
                                <Tooltip label="View Proof of Release">
                                  <ActionIcon
                                    variant="light"
                                    color="teal"
                                    size="sm"
                                    onClick={() => {
                                      // Use proof_url if available, fallback to image_url
                                      setPreviewImage(
                                        p.release_proof_url || p.image_url
                                      );
                                      setImageModalOpen(true);
                                    }}
                                  >
                                    <IconEye size={14} />
                                  </ActionIcon>
                                </Tooltip>
                              )}
                            </>
                          )}

                          {status === "RETRIEVED" &&
                            (p.release_proof_url || p.image_url) && (
                              <Tooltip label="View Proof of Release">
                                <ActionIcon
                                  variant="subtle"
                                  color="gray"
                                  size="sm"
                                  onClick={() => {
                                    setPreviewImage(
                                      p.release_proof_url || p.image_url
                                    );
                                    setImageModalOpen(true);
                                  }}
                                >
                                  <IconPhoto size={14} />
                                </ActionIcon>
                              </Tooltip>
                            )}

                          {status.includes("REQUEST") && (
                            <Badge size="sm" color="orange" variant="light">
                              Pending
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={6}>
                    <Stack align="center" py="xl">
                      <IconBox size={40} color="var(--mantine-color-gray-3)" />
                      <Text c="dimmed">No packages found</Text>
                    </Stack>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* Action Confirmation Modal */}
      <Modal
        opened={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title={
          actionType === "CONFIRM_RECEIVED"
            ? "Confirm Receipt"
            : `Request ${actionType?.replace(/_/g, " ")}`
        }
        centered
      >
        <Stack>
          <Text size="sm">
            {actionType === "CONFIRM_RECEIVED"
              ? "Are you sure you have received this package? This will mark it as RETRIEVED."
              : `Are you sure you want to request to ${actionType?.toLowerCase()} this package?`}
          </Text>

          {actionType !== "CONFIRM_RECEIVED" && (
            <Textarea
              label="Additional Notes (Optional)"
              placeholder="e.g. Please deliver on weekend..."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button color="blue" onClick={submitAction} loading={submitting}>
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        opened={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        title="Proof of Release"
        size="lg"
      >
        {previewImage && (
          <img
            src={previewImage}
            alt="Proof"
            style={{ width: "100%", borderRadius: 8 }}
          />
        )}
      </Modal>
    </>
  );
}
