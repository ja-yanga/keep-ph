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
  useMantineTheme,
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
  const theme = useMantineTheme();
  const [localPackages, setLocalPackages] = useState<any[]>(packages);

  // map of tracking_number|package_id -> file_url
  const [scanMap, setScanMap] = useState<Record<string, string>>({});

  // Fetch scans once packages are available and build lookup map
  useEffect(() => {
    if (!packages || packages.length === 0) {
      setScanMap({});
      return;
    }

    // derive a registrationId from packages (if present)
    const regPkg =
      packages.find((p: any) => p.registration_id) ||
      packages.find((p: any) => p.package?.registration_id);
    const registrationId =
      (regPkg && (regPkg.registration_id || regPkg.package?.registration_id)) ||
      null;

    if (!registrationId) {
      // no registration id available — avoid calling the API that requires it
      setScanMap({});
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/user/scans?registrationId=${encodeURIComponent(
            registrationId
          )}`,
          { credentials: "include" }
        );
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        const scansArr = Array.isArray(data?.scans) ? data.scans : [];

        const map: Record<string, string> = {};
        scansArr.forEach((s: any) => {
          const file = s.file_url;
          // prefer package.tracking_number if available
          const tracking = s.package?.tracking_number;
          if (tracking) map[tracking] = file;
          if (s.package_id) map[s.package_id] = file;
        });

        if (mounted) setScanMap(map);
      } catch (err) {
        console.error("failed to load scans for packages", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [packages]);

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
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);

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

    // Resolve scan URL using package fields or the fetched scanMap
    const scanUrl =
      pkg.scan_url ||
      pkg.digital_scan_url ||
      pkg.scanned_file_url ||
      scanMap[pkg.tracking_number] ||
      scanMap[pkg.id] ||
      null;
    const hasScan = Boolean(scanUrl);

    let statusColor = "blue";
    if (["RELEASED", "RETRIEVED"].includes(status)) statusColor = "green";
    else if (status === "DISPOSED") statusColor = "red";
    else if (status.includes("REQUEST")) statusColor = "orange";

    return (
      <Paper p="md" radius="md" withBorder shadow="xs" bg="white">
        <Group justify="space-between" align="flex-start" mb="xs">
          <Group style={{ gap: theme.spacing.xs }}>
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
              <>
                {hasScan ? (
                  <Button
                    variant="default"
                    color="violet"
                    fullWidth
                    size="xs"
                    leftSection={<IconEye size={14} />}
                    onClick={() => {
                      setPreviewTitle("View Scan");
                      setPreviewImage(scanUrl);
                      setImageModalOpen(true);
                    }}
                  >
                    View Scan
                  </Button>
                ) : (
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
              </>
            )}
          </Stack>
        )}

        {status === "RELEASED" && (
          // don't force equal widths; allow buttons to size and prevent label clipping
          <Group style={{ gap: theme.spacing.xs }}>
            <Button
              size="sm"
              variant="filled"
              color="green"
              leftSection={<IconCheck size={14} />}
              onClick={() => handleActionClick(pkg, "CONFIRM_RECEIVED")}
              style={{ whiteSpace: "nowrap", minWidth: 130 }}
            >
              Confirm Receipt
            </Button>

            {(pkg.release_proof_url || pkg.image_url) && (
              <Button
                size="sm"
                variant="default"
                leftSection={<IconEye size={14} />}
                onClick={() => {
                  setPreviewTitle("Proof of Release");
                  setPreviewImage(pkg.release_proof_url || pkg.image_url);
                  setImageModalOpen(true);
                }}
                style={{ whiteSpace: "nowrap", minWidth: 110 }}
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

          {/* {actionType !== "CONFIRM_RECEIVED" && (
            <Textarea
              label="Additional Notes (Optional)"
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />
          )} */}

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

      {/* Preview Modal (images or PDFs) */}
      <Modal
        opened={imageModalOpen}
        onClose={() => {
          setImageModalOpen(false);
          setPreviewImage(null);
          setPreviewTitle(null);
        }}
        title={previewTitle ?? "Preview"}
        size="xl"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.45 }}
      >
        {previewImage ? (
          // PDF -> iframe, otherwise show image
          /\.pdf(\?.*)?$/i.test(previewImage) ? (
            <div style={{ width: "100%" }}>
              <iframe
                src={previewImage}
                title={previewTitle ?? "Preview"}
                style={{ width: "100%", height: "70vh", border: "none" }}
              />
            </div>
          ) : (
            <img
              src={previewImage}
              alt={previewTitle ?? "Preview"}
              style={{
                width: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: 8,
              }}
            />
          )
        ) : (
          <Text c="dimmed">No preview available</Text>
        )}
      </Modal>
    </>
  );
}
