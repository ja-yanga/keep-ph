"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  ActionIcon,
  Tooltip,
  Modal,
  Textarea,
  Tabs,
  ThemeIcon,
  SimpleGrid,
  Box,
  Divider,
} from "@mantine/core";
import {
  IconPackage,
  IconTruckDelivery,
  IconTrash,
  IconScan,
  IconEye,
  IconLock,
  IconCheck,
  IconPhoto,
  IconBox,
  IconHistory,
  IconInbox,
  IconFileText, // ADDED: Import for document icon
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

interface UserPackagesProps {
  packages: any[];
  lockers: any[];
  planCapabilities: {
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
    can_digitize: boolean;
  };
  isStorageFull?: boolean;
  onRefresh?: () => void | Promise<void>;
}

export default function UserPackages({
  packages,
  lockers,
  planCapabilities,
  isStorageFull = false,
  onRefresh,
}: UserPackagesProps) {
  const [localPackages, setLocalPackages] = useState<any[]>(packages);

  useEffect(() => {
    setLocalPackages(packages);
  }, [packages]);

  // Split packages into Active (Inbox) and History
  const { activePackages, historyPackages } = useMemo(() => {
    const active: any[] = [];
    const history: any[] = [];

    localPackages.forEach((pkg) => {
      if (["RELEASED", "RETRIEVED", "DISPOSED"].includes(pkg.status)) {
        history.push(pkg);
      } else {
        active.push(pkg);
      }
    });

    // Sort active by newest first
    active.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    // Sort history by newest updated
    history.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return { activePackages: active, historyPackages: history };
  }, [localPackages]);

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
        body: JSON.stringify({ status: newStatus, notes: notes }),
      });

      if (!res.ok) throw new Error("Failed to update package");

      setLocalPackages((current) =>
        current.map((p) =>
          p.id === selectedPackage.id ? { ...p, status: newStatus } : p
        )
      );

      notifications.show({
        title: "Success",
        message: "Request submitted successfully",
        color: "green",
      });

      setActionModalOpen(false);

      if (onRefresh) {
        try {
          const maybePromise = onRefresh();
          if (
            maybePromise &&
            typeof (maybePromise as any).then === "function"
          ) {
            await maybePromise;
          }
        } catch (e) {
          // swallow errors from parent refresh but log for debugging
          console.error("onRefresh failed:", e);
        }
      }
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err.message,
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Component for a Single Package Card ---
  const PackageCard = ({ pkg }: { pkg: any }) => {
    const tracking = pkg.tracking_number || "—";
    const type = pkg.package_type || "Parcel";
    const status = pkg.status || "STORED";
    const receivedDate = pkg.received_at;

    // ADDED: Check if it is a document
    const isDocument = type === "Document";

    // Resolve locker code
    let lockerCode = pkg.locker?.locker_code;
    if (!lockerCode && pkg.locker_id && Array.isArray(lockers)) {
      const assigned = lockers.find(
        (l: any) =>
          l.id === pkg.locker_id ||
          l.locker_id === pkg.locker_id ||
          l.locker?.id === pkg.locker_id
      );
      if (assigned)
        lockerCode = assigned.locker_code || assigned.locker?.locker_code;
    }

    let statusColor = "blue";
    if (["RELEASED", "RETRIEVED"].includes(status)) statusColor = "green";
    else if (status === "DISPOSED") statusColor = "red";
    else if (status.includes("REQUEST")) statusColor = "orange";

    return (
      <Paper p="md" radius="md" withBorder shadow="xs" bg="white">
        <Group justify="space-between" align="flex-start" mb="xs">
          <Group gap="xs">
            {/* CHANGED: Conditional Icon and Color */}
            <ThemeIcon
              variant="light"
              color={isDocument ? "violet" : "blue"}
              size="lg"
              radius="md"
            >
              {isDocument ? (
                <IconFileText size={20} />
              ) : (
                <IconPackage size={20} />
              )}
            </ThemeIcon>
            <Box>
              <Text fw={600} size="sm" lh={1.2}>
                {tracking}
              </Text>
              <Text size="xs" c="dimmed">
                {type}
              </Text>
            </Box>
          </Group>
          <Badge color={statusColor} variant="light">
            {status.replace(/_/g, " ")}
          </Badge>
        </Group>

        <Divider my="sm" variant="dashed" />

        <Group justify="space-between" mb="md">
          <Box>
            <Text size="xs" c="dimmed">
              Locker
            </Text>
            <Group gap={4}>
              <IconLock size={12} color="gray" />
              <Text size="sm" fw={500}>
                {lockerCode || "—"}
              </Text>
            </Group>
          </Box>
          <Box ta="right">
            <Text size="xs" c="dimmed">
              Received
            </Text>
            <Text size="sm" fw={500}>
              {receivedDate ? new Date(receivedDate).toLocaleDateString() : "—"}
            </Text>
          </Box>
        </Group>

        {/* Actions Area */}
        {status === "STORED" && (
          <Stack gap="xs">
            <SimpleGrid cols={2} spacing="xs">
              <Button
                variant="light"
                color="blue"
                fullWidth
                size="xs"
                leftSection={<IconTruckDelivery size={14} />}
                disabled={isStorageFull}
                onClick={() => handleActionClick(pkg, "RELEASE")}
              >
                Release
              </Button>

              <Button
                variant="light"
                color="red"
                fullWidth
                size="xs"
                leftSection={<IconTrash size={14} />}
                disabled={isStorageFull}
                onClick={() => handleActionClick(pkg, "DISPOSE")}
              >
                Dispose
              </Button>
            </SimpleGrid>

            {/* Scan button appears as an extra option for documents */}
            {isDocument && planCapabilities.can_digitize && (
              <Button
                variant="light"
                color="violet"
                fullWidth
                size="xs"
                leftSection={<IconScan size={14} />}
                disabled={isStorageFull}
                onClick={() => handleActionClick(pkg, "SCAN")}
              >
                Request Scan
              </Button>
            )}
          </Stack>
        )}

        {status === "RELEASED" && (
          <Group grow>
            <Button
              size="xs"
              variant="filled"
              color="green"
              leftSection={<IconCheck size={14} />}
              onClick={() => handleActionClick(pkg, "CONFIRM_RECEIVED")}
            >
              Confirm Receipt
            </Button>
            {(pkg.release_proof_url || pkg.image_url) && (
              <Button
                size="xs"
                variant="default"
                leftSection={<IconEye size={14} />}
                onClick={() => {
                  setPreviewImage(pkg.release_proof_url || pkg.image_url);
                  setImageModalOpen(true);
                }}
              >
                View Proof
              </Button>
            )}
          </Group>
        )}

        {status.includes("REQUEST") && (
          <Text size="xs" c="orange" ta="center" mt="xs">
            Request is being processed by admin.
          </Text>
        )}
      </Paper>
    );
  };

  return (
    <>
      <Paper p="lg" radius="md" withBorder shadow="sm">
        <Tabs defaultValue="inbox" variant="pills" radius="md">
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <IconPackage size={20} color="gray" />
              <Title order={4}>Packages</Title>
            </Group>
            <Tabs.List>
              <Tabs.Tab value="inbox" leftSection={<IconInbox size={14} />}>
                Inbox ({activePackages.length})
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={14} />}>
                History
              </Tabs.Tab>
            </Tabs.List>
          </Group>

          <Tabs.Panel value="inbox">
            {activePackages.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {activePackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </SimpleGrid>
            ) : (
              <Stack
                align="center"
                py="xl"
                bg="gray.0"
                style={{ borderRadius: 8 }}
              >
                <IconInbox size={40} color="gray" />
                <Text c="dimmed">
                  Your inbox is empty. No pending packages.
                </Text>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="history">
            {historyPackages.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {historyPackages.map((pkg) => (
                  <PackageCard key={pkg.id} pkg={pkg} />
                ))}
              </SimpleGrid>
            ) : (
              <Stack
                align="center"
                py="xl"
                bg="gray.0"
                style={{ borderRadius: 8 }}
              >
                <IconHistory size={40} color="gray" />
                <Text c="dimmed">No history available yet.</Text>
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
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
