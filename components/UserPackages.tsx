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
  TextInput,
  Select,
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
  IconHistory,
  IconInbox,
  IconFileText,
  IconSearch,
  IconEdit,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSession } from "@/components/SessionProvider";

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
  const [search, setSearch] = useState("");

  // map of tracking_number|package_id -> file_url
  const [scanMap, setScanMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!packages || packages.length === 0) {
      setScanMap({});
      return;
    }

    const regPkg =
      packages.find((p: any) => p.registration_id) ||
      packages.find((p: any) => p.package?.registration_id);
    const registrationId =
      (regPkg && (regPkg.registration_id || regPkg.package?.registration_id)) ||
      null;

    if (!registrationId) {
      setScanMap({});
      return;
    }

    let mounted = true;
    (async () => {
      try {
        // existing scans logic
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
          const pkgName = s.package?.package_name;
          if (pkgName) map[pkgName] = file;
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
      // Treat only retrieved/disposed as history. RELEASED stays in inbox (active).
      if (["RETRIEVED", "DISPOSED"].includes(pkg.status)) {
        history.push(pkg);
      } else {
        active.push(pkg);
      }
    });

    active.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    history.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    return { activePackages: active, historyPackages: history };
  }, [localPackages]);

  // --- SEARCH FILTERS ---
  const filteredActivePackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePackages;
    return activePackages.filter(
      (pkg) =>
        (pkg.package_name?.toLowerCase().includes(q) ?? false) ||
        (pkg.package_type?.toLowerCase().includes(q) ?? false)
    );
  }, [activePackages, search]);

  const filteredHistoryPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historyPackages;
    return historyPackages.filter(
      (pkg) =>
        (pkg.package_name?.toLowerCase().includes(q) ?? false) ||
        (pkg.package_type?.toLowerCase().includes(q) ?? false)
    );
  }, [historyPackages, search]);

  // Action State
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any | null>(null);
  const [actionType, setActionType] = useState<
    "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // addresses / release fields
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [releaseToName, setReleaseToName] = useState<string>("");
  // recipient is not editable in modal — derived from selected address.contact_name or package user
  const { session } = useSession();

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
    // prefill notes only for non-release actions; release will use addresses + name
    setNotes(type === "RELEASE" ? "" : pkg?.notes || "");
    // prefill release-related fields when requesting release
    if (type === "RELEASE") {
      // prefill from package snapshot, fallback to user's name; do not force editing
      const userName =
        `${pkg?.user?.first_name ?? ""} ${pkg?.user?.last_name ?? ""}`.trim() ||
        "";
      setReleaseToName(pkg?.release_to_name ?? userName);
      // selectedAddressId will be set after addresses load; set a tentative value
      setSelectedAddressId(pkg?.release_address_id ?? null);
    } else {
      setReleaseToName("");
      setSelectedAddressId(null);
    }
    setActionModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedPackage || !actionType) return;

    // For RELEASE: derive a final name from (in order): releaseToName, selected address contact_name, package user name.
    let finalReleaseToName = releaseToName;
    if (actionType === "RELEASE") {
      if (!finalReleaseToName && selectedAddressId) {
        const sel = addresses.find((a) => a.id === selectedAddressId);
        finalReleaseToName = sel?.contact_name ?? finalReleaseToName;
      }
      if (!finalReleaseToName) {
        const userName = `${selectedPackage?.user?.first_name ?? ""} ${
          selectedPackage?.user?.last_name ?? ""
        }`.trim();
        finalReleaseToName = userName || finalReleaseToName;
      }
      if (!finalReleaseToName) {
        notifications.show({
          title: "Required field missing",
          message:
            "Recipient name is required. Pick an address with a contact or enter a name.",
          color: "red",
        });
        return;
      }
      // ensure we use the resolved name going forward
      setReleaseToName(finalReleaseToName);
    }

    setSubmitting(true);

    try {
      let newStatus = null;
      if (actionType === "RELEASE") newStatus = "REQUEST_TO_RELEASE";
      if (actionType === "DISPOSE") newStatus = "REQUEST_TO_DISPOSE";
      if (actionType === "SCAN") newStatus = "REQUEST_TO_SCAN";
      if (actionType === "CONFIRM_RECEIVED") newStatus = "RETRIEVED";

      if (!newStatus) return;

      const body = {
        status: newStatus,
        ...(actionType === "RELEASE"
          ? {
              selected_address_id: selectedAddressId || null,
              release_to_name: finalReleaseToName || releaseToName || null,
            }
          : { notes }),
      };

      const res = await fetch(`/api/user/packages/${selectedPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update package");

      // Find the selected address object to populate the local state's release_address string
      let releaseAddressString = selectedPackage.release_address || null;
      if (actionType === "RELEASE" && selectedAddressId) {
        const selectedAddress = addresses.find(
          (a) => a.id === selectedAddressId
        );
        if (selectedAddress) {
          // Construct a readable snapshot of the address for local state
          releaseAddressString = [
            selectedAddress.label || selectedAddress.contact_name,
            selectedAddress.line1,
            selectedAddress.line2,
            selectedAddress.city,
            selectedAddress.region,
            selectedAddress.postal,
          ]
            .filter(Boolean)
            .join(", ");
        }
      }

      setLocalPackages((current) =>
        current.map((p) =>
          p.id === selectedPackage.id
            ? {
                ...p,
                status: newStatus,
                // persist changes locally: release clears old notes and stores release info
                notes: actionType === "RELEASE" ? "" : p.notes,
                release_to_name:
                  actionType === "RELEASE" ? releaseToName : p.release_to_name,
                release_address: releaseAddressString, // Use the structured string
              }
            : p
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
    const packageName = pkg.package_name || "—";
    const type = pkg.package_type || "Parcel";
    const status = pkg.status || "STORED";
    const receivedDate = pkg.received_at;

    const isDocument = type === "Document";

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

    const scanUrl =
      pkg.scan_url ||
      pkg.digital_scan_url ||
      pkg.scanned_file_url ||
      scanMap[pkg.package_name] ||
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
                {packageName}
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

  // add/fix effect: fetch addresses when selectedPackage changes (robust userId resolution)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!selectedPackage) {
          if (mounted) {
            setAddresses([]);
            setSelectedAddressId(null);
          }
          return;
        }

        // resolve userId from package, fallback to session user
        let userId: string | null =
          selectedPackage?.user?.id ?? selectedPackage?.user_id ?? null;
        if (!userId && session?.user?.id) userId = session.user.id;

        // fallback: try reading registration -> user if registration_id exists via a registration endpoint
        if (!userId && selectedPackage?.registration_id) {
          try {
            const r = await fetch(
              `/api/registrations?id=${encodeURIComponent(
                selectedPackage.registration_id
              )}`,
              { credentials: "include" }
            );
            if (r.ok) {
              const j = await r.json().catch(() => ({}));
              userId = j?.data?.user_id ?? j?.user_id ?? userId;
            }
          } catch (e) {
            // ignore - fallback remains null
          }
        }

        if (!userId) {
          if (mounted) {
            setAddresses([]);
            // keep selectedAddressId as-is (might be from pkg)
          }
          return;
        }

        const res = await fetch(
          `/api/user/addresses?userId=${encodeURIComponent(userId)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          if (mounted) setAddresses([]);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const arr = Array.isArray(json?.data) ? json.data : json || [];
        if (!mounted) return;

        setAddresses(arr);

        // If package already had a release_address_id prefer that,
        // otherwise preselect the user's default address (is_default)
        const pkgDefaultId = selectedPackage?.release_address_id ?? null;
        if (pkgDefaultId) {
          setSelectedAddressId(pkgDefaultId);
        } else {
          const def = arr.find((a: any) => a.is_default);
          setSelectedAddressId(def?.id ?? null);
        }
      } catch (e) {
        console.error("failed to load addresses", e);
        if (mounted) {
          setAddresses([]);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [selectedPackage?.id, session?.user?.id]);

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
                Inbox ({filteredActivePackages.length})
              </Tabs.Tab>
              <Tabs.Tab value="history" leftSection={<IconHistory size={14} />}>
                History
              </Tabs.Tab>
            </Tabs.List>
          </Group>

          {/* --- SEARCH BAR --- */}
          <Box mb="md">
            <TextInput
              placeholder="Search by package name or package type..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<IconSearch size={16} />}
              size="md"
              __clearable
            />
          </Box>

          <Tabs.Panel value="inbox">
            {filteredActivePackages.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {filteredActivePackages.map((pkg) => (
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
                <Text c="dimmed">No matching packages found.</Text>
              </Stack>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="history">
            {filteredHistoryPackages.length > 0 ? (
              <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                {filteredHistoryPackages.map((pkg) => (
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
                <Text c="dimmed">No matching history packages found.</Text>
              </Stack>
            )}
          </Tabs.Panel>
        </Tabs>
      </Paper>

      {/* --- Action Modal --- */}
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

          {/* Release Fields */}
          {actionType === "RELEASE" && (
            <>
              {/* IMPROVED ADDRESS SELECTOR (Required) */}
              <Select
                label="Shipping Address (required)"
                placeholder="Select a saved address for shipping"
                required
                searchable
                clearable={false}
                maxDropdownHeight={320}
                data={addresses.map((a) => ({
                  value: a.id,
                  label: [
                    a.label || "Unnamed Address",
                    a.line1,
                    a.city,
                    a.postal,
                    a.is_default ? "(Default)" : "",
                  ]
                    .filter(Boolean)
                    .join(", "),
                }))}
                value={selectedAddressId}
                onChange={(v) => {
                  setSelectedAddressId(v);
                  const sel = addresses.find((x) => x.id === v);
                  if (sel?.contact_name) setReleaseToName(sel.contact_name);
                }}
                renderOption={({ option }) => {
                  const a = addresses.find((addr) => addr.id === option.value);
                  if (!a) return null;
                  return (
                    <Stack gap={2}>
                      <Group
                        justify="space-between"
                        align="center"
                        wrap="nowrap"
                      >
                        <Text
                          fw={600}
                          size="sm"
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {a.label || "Unnamed Address"}
                        </Text>
                        {a.is_default && (
                          <Badge variant="light" color="blue" size="sm">
                            DEFAULT
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed">
                        Recipient: {a.contact_name || "N/A"}
                      </Text>
                      <Text size="xs" c="gray.7">
                        {a.line1}
                        {a.line2 ? `, ${a.line2}` : ""}
                      </Text>
                      <Text size="xs" c="gray.7">
                        {[a.city, a.region, a.postal, a.country]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </Stack>
                  );
                }}
              />

              {/* Combined selected-address preview (includes Recipient) */}
              <Box mt="md">
                {selectedAddressId ? (
                  (() => {
                    const sel = addresses.find(
                      (a) => a.id === selectedAddressId
                    );
                    if (!sel) return <Text c="dimmed">Loading address...</Text>;
                    const fallbackUserName = `${
                      selectedPackage?.user?.first_name ?? ""
                    } ${selectedPackage?.user?.last_name ?? ""}`.trim();
                    return (
                      <Paper withBorder p="sm" radius="md" bg="gray.0">
                        <Group justify="space-between" align="center">
                          <div>
                            <Text fw={600} size="sm">
                              {sel.label || "Unnamed Address"}
                            </Text>
                            <Text size="xs" c="dimmed">
                              Recipient:{" "}
                              {sel.contact_name || fallbackUserName || "N/A"}
                            </Text>
                          </div>
                          {sel.is_default && (
                            <Badge
                              ml="xs"
                              size="xs"
                              color="blue"
                              variant="light"
                            >
                              Default
                            </Badge>
                          )}
                        </Group>

                        <Text size="sm" c="dimmed" mt="8px">
                          {sel.line1}
                          {sel.line2 ? `, ${sel.line2}` : ""}
                        </Text>
                        <Text size="sm" c="dimmed">
                          {[sel.city, sel.region, sel.postal, sel.country]
                            .filter(Boolean)
                            .join(", ")}
                        </Text>
                        {sel.contact_phone && (
                          <Text size="xs" c="dimmed" mt="4px">
                            Phone: {sel.contact_phone}
                          </Text>
                        )}
                      </Paper>
                    );
                  })()
                ) : selectedPackage?.release_address ? (
                  <Paper withBorder p="sm" radius="md" bg="gray.0">
                    <Text fw={600} size="sm">
                      Saved release snapshot
                    </Text>
                    <Text size="sm" c="dimmed">
                      {selectedPackage.release_address}
                    </Text>
                    {selectedPackage.release_to_name && (
                      <Text size="xs" c="dimmed" mt="4px">
                        Recipient: {selectedPackage.release_to_name}
                      </Text>
                    )}
                  </Paper>
                ) : (
                  <Text c="dimmed">No shipping address selected.</Text>
                )}
              </Box>
            </>
          )}

          {/* Note section for other actions */}
          {["DISPOSE", "SCAN"].includes(actionType!) && (
            <Textarea
              label="Notes (Optional)"
              placeholder="Add any specific instructions for the admin."
              value={notes}
              onChange={(e) => setNotes(e.currentTarget.value)}
            />
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={submitAction}
              loading={submitting}
              // Disable if it's a release action and no shipping address selected
              disabled={actionType === "RELEASE" && !selectedAddressId}
            >
              Confirm
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* --- Preview Modal --- */}
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
          /\.pdf(\?.*)?$/i.test(previewImage) ? (
            <iframe
              src={previewImage}
              title={previewTitle ?? "Preview"}
              style={{ width: "100%", height: "70vh", border: "none" }}
            />
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
