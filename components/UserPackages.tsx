"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Checkbox,
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
  // injected from parent to avoid duplicate fetches
  scanMap?: Record<string, string>;
  scans?: any[];
}

export default function UserPackages({
  packages,
  lockers,
  planCapabilities,
  isStorageFull = false,
  onRefresh,
  scanMap: providedScanMap,
  scans: providedScans,
}: UserPackagesProps) {
  const theme = useMantineTheme();
  const [localPackages, setLocalPackages] = useState<any[]>(packages);
  const [search, setSearch] = useState("");

  // map of tracking_number|package_id -> file_url
  const [scanMap, setScanMap] = useState<Record<string, string>>({});

  // derive registrationId deterministically (primitive) to use in deps
  const registrationId = useMemo(() => {
    const regPkg =
      packages.find((p: any) => p.registration_id) ||
      packages.find((p: any) => p.package?.registration_id);
    return (
      (regPkg && (regPkg.registration_id || regPkg.package?.registration_id)) ||
      null
    );
  }, [packages]); // still depends on packages but yields a primitive id

  // if parent provided scans/scanMap, use them and skip fetching locally
  useEffect(() => {
    if (providedScanMap) {
      setScanMap(providedScanMap);
      return;
    }
    if (providedScans) {
      const map: Record<string, string> = {};
      providedScans.forEach((s: any) => {
        if (s.package_id) map[s.package_id] = s.file_url;
      });
      setScanMap(map);
      return;
    }
    // otherwise keep existing fetch logic (unchanged) or no-op here
  }, [providedScanMap, providedScans]);

  useEffect(() => {
    setLocalPackages(packages);
  }, [packages]);

  // always sync when parent prop changes (prevents stale/incorrect data)
  useEffect(() => {
    setLocalPackages(Array.isArray(packages) ? packages.slice() : []);
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

  // preview modal state (was missing)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewIsScan, setPreviewIsScan] = useState<boolean>(false);

  // pagination for package lists
  const [inboxPage, setInboxPage] = useState<number>(1);
  const [historyPage, setHistoryPage] = useState<number>(1);
  const perPage = 3;

  // addresses / release fields
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null
  );
  const [releaseToName, setReleaseToName] = useState<string>("");
  // recipient is not editable in modal — derived from selected address.contact_name or package user
  const { session } = useSession();

  // pickup-on-behalf fields (stored in mailroom_packages.notes as JSON)
  const [pickupOnBehalf, setPickupOnBehalf] = useState<boolean>(false);
  const [behalfName, setBehalfName] = useState<string>("");
  const [behalfMobile, setBehalfMobile] = useState<string>("");
  const [behalfContactMode, setBehalfContactMode] = useState<
    "sms" | "viber" | "whatsapp"
  >("sms");

  // validate Philippines mobile: starts with 09 and total 11 digits (e.g. 09121231234)
  const isBehalfMobileValid = /^09\d{9}$/.test(behalfMobile);

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

      // try to parse previous notes JSON for pickup-on-behalf data
      setPickupOnBehalf(false);
      setBehalfName("");
      setBehalfMobile("");
      setBehalfContactMode("sms");
      try {
        const n = pkg?.notes;
        if (typeof n === "string" && n.trim().startsWith("{")) {
          const parsed = JSON.parse(n);
          if (parsed?.pickup_on_behalf) {
            setPickupOnBehalf(true);
            setBehalfName(parsed.name ?? "");
            setBehalfMobile(parsed.mobile ?? "");
            setBehalfContactMode(parsed.contact_mode ?? "sms");
          }
        }
      } catch {
        /* ignore invalid notes */
      }

      // If package has a saved release_address_id use it,
      // otherwise immediately select user's default address (if already loaded).
      const pkgDefaultId = pkg?.release_address_id ?? null;
      const userDefaultId =
        !pkgDefaultId && Array.isArray(addresses)
          ? addresses.find((a) => a.is_default)?.id ?? null
          : null;
      // if pickup on behalf was previously selected, prefer clearing address to indicate pickup
      setSelectedAddressId(
        pkgDefaultId ?? (pickupOnBehalf ? null : userDefaultId)
      );
      // if we selected a default address, prefill releaseToName from it when possible
      if (!pkgDefaultId && userDefaultId) {
        const sel = addresses.find((a) => a.id === userDefaultId);
        if (sel?.contact_name) setReleaseToName(sel.contact_name);
      }
    } else {
      setReleaseToName("");
      setSelectedAddressId(null);
      setPickupOnBehalf(false);
      setBehalfName("");
      setBehalfMobile("");
      setBehalfContactMode("sms");
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

      const body: any = { status: newStatus };
      if (actionType === "RELEASE") {
        body.selected_address_id = selectedAddressId || null;
        body.release_to_name = finalReleaseToName || releaseToName || null;
        // include pickup-on-behalf data in notes as JSON when selected
        if (pickupOnBehalf) {
          body.notes = JSON.stringify({
            pickup_on_behalf: true,
            name: behalfName,
            mobile: behalfMobile,
            contact_mode: behalfContactMode,
          });
        } else {
          // clear prior pickup notes on normal release
          body.notes = null;
        }
      } else if (!["DISPOSE", "SCAN"].includes(actionType || "")) {
        // include notes for other actions, but do NOT include notes for DISPOSE/SCAN per request
        body.notes = notes;
      }

      const res = await fetch(`/api/user/packages/${selectedPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed to update package");

      // prefer server-returned updated package to keep local state consistent
      const serverJson = await res.json().catch(() => null);
      const updatedFromServer =
        serverJson?.data ?? serverJson?.package ?? serverJson ?? null;
      if (updatedFromServer && updatedFromServer.id) {
        applyUpdatedPackage(updatedFromServer);
        // ensure selectedPackage reference is updated if modal remains open
        if (selectedPackage?.id === updatedFromServer.id) {
          setSelectedPackage((prev: any) => ({
            ...(prev ?? {}),
            ...updatedFromServer,
          }));
        }
      } else {
        // fallback optimistic update if server didn't return object
        setLocalPackages((current) =>
          current.map((p) =>
            p.id === selectedPackage.id
              ? {
                  ...p,
                  status: newStatus,
                  notes: actionType === "RELEASE" ? body.notes ?? "" : p.notes,
                  release_to_name:
                    actionType === "RELEASE"
                      ? releaseToName
                      : p.release_to_name,
                  release_address: releaseAddressString,
                  updated_at: new Date().toISOString(),
                }
              : p
          )
        );
      }

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
                notes: actionType === "RELEASE" ? body.notes ?? "" : p.notes,
                release_to_name:
                  actionType === "RELEASE" ? releaseToName : p.release_to_name,
                release_address: releaseAddressString, // Use the structured string
              }
            : p
        )
      );

      // ensure pagination stays on a valid page after the update
      // reset to first page so the updated lists are visible immediately
      setInboxPage(1);
      setHistoryPage(1);

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

  // Download currently previewed scan (works with data URLs, same-origin, or fetches blob)
  const downloadScan = async (): Promise<void> => {
    if (!previewImage) return;
    const fallbackName = (
      previewTitle ||
      selectedPackage?.package_name ||
      "scan"
    ).replace(/\s+/g, "_");
    try {
      const a = document.createElement("a");
      a.href = previewImage;
      a.target = "_blank";

      let willDownloadDirectly = false;
      if (previewImage.startsWith("data:")) willDownloadDirectly = true;
      try {
        const url = new URL(previewImage, location.href);
        if (url.origin === location.origin) willDownloadDirectly = true;
      } catch {
        // ignore invalid URL
      }

      if (willDownloadDirectly) {
        a.download = fallbackName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }

      const res = await fetch(previewImage, { credentials: "include" });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
      a.download = fallbackName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      console.error("download failed", err);
      notifications.show({
        title: "Download failed",
        message: err?.message || String(err),
        color: "red",
      });
    }
  };

  // Request rescan for the selected package (PATCH -> status: REQUEST_TO_SCAN)
  const requestRescanFromModal = async (): Promise<void> => {
    if (!selectedPackage) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/user/packages/${selectedPackage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: "REQUEST_TO_SCAN" }),
      });
      if (!res.ok) throw new Error("Failed to request rescan");

      setLocalPackages((current) =>
        current.map((p) =>
          p.id === selectedPackage.id ? { ...p, status: "REQUEST_TO_SCAN" } : p
        )
      );

      notifications.show({
        title: "Rescan requested",
        message: "Your rescan request has been submitted to admin.",
        color: "green",
      });
      setImageModalOpen(false);
    } catch (err: any) {
      notifications.show({
        title: "Error",
        message: err?.message || "Failed to request rescan",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // --- Render Component for a Single Package Card ---
  const PackageCard = ({ pkg }: { pkg: any }) => {
    // debug: ensure each package has its own photo/url
    console.debug(
      "PackageCard",
      pkg.id,
      pkg.package_photo,
      pkg.image_url,
      pkg.release_proof_url
    );

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
      scanMap[pkg.id] || // prefer id-keyed map first
      scanMap[`name:${pkg.package_name}`] ||
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

        {/* Package photo thumbnail (click to preview) */}
        {pkg.package_photo && (
          <Box mb="sm">
            <img
              key={`${pkg.id}-${pkg.package_photo}`}
              src={pkg.package_photo}
              alt="Package photo"
              onClick={() => {
                setSelectedPackage(pkg);
                setPreviewTitle("Package Photo");
                setPreviewImage(pkg.package_photo);
                setPreviewIsScan(false);
                setImageModalOpen(true);
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
              style={{
                width: 140,
                height: 96,
                objectFit: "cover",
                borderRadius: 8,
                cursor: "pointer",
                display: "block",
                margin: "0 auto",
              }}
            />
          </Box>
        )}

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
                      setSelectedPackage(pkg); // <-- ensure modal actions know which package
                      setPreviewTitle("View Scan");
                      setPreviewImage(scanUrl);
                      // this preview is a scan
                      setPreviewIsScan(true);
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
                  setSelectedPackage(pkg);
                  setPreviewTitle("Proof of Release");
                  setPreviewImage(pkg.release_proof_url || pkg.image_url);
                  // proof image is not a scan
                  setPreviewIsScan(false);
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

  // use this helper after receiving updatedPkg from server
  function applyUpdatedPackage(updatedPkg: any) {
    setLocalPackages((prev) =>
      prev.map((p) => (p.id === updatedPkg.id ? { ...p, ...updatedPkg } : p))
    );
  }

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
              onChange={(e) => {
                setSearch(e.currentTarget.value);
                setInboxPage(1);
                setHistoryPage(1);
              }}
              leftSection={<IconSearch size={16} />}
              size="md"
              __clearable
            />
          </Box>

          <Tabs.Panel value="inbox">
            {filteredActivePackages.length > 0 ? (
              <>
                {(() => {
                  const total = filteredActivePackages.length;
                  const start = (inboxPage - 1) * perPage;
                  const pageItems = filteredActivePackages.slice(
                    start,
                    start + perPage
                  );
                  return (
                    <>
                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                        {pageItems.map((pkg) => (
                          <PackageCard key={pkg.id} pkg={pkg} />
                        ))}
                      </SimpleGrid>
                      {total > perPage && (
                        <Group
                          justify="space-between"
                          mt="md"
                          align="center"
                          style={{ width: "100%" }}
                        >
                          <Text size="sm" c="dimmed">
                            Showing {Math.min(start + 1, total)}–
                            {Math.min(start + pageItems.length, total)} of{" "}
                            {total}
                          </Text>
                          <Group>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={inboxPage === 1}
                              onClick={() =>
                                setInboxPage((p) => Math.max(1, p - 1))
                              }
                            >
                              Previous
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={start + perPage >= total}
                              onClick={() => setInboxPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </Group>
                        </Group>
                      )}
                    </>
                  );
                })()}
              </>
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
              <>
                {(() => {
                  const total = filteredHistoryPackages.length;
                  const start = (historyPage - 1) * perPage;
                  const pageItems = filteredHistoryPackages.slice(
                    start,
                    start + perPage
                  );
                  return (
                    <>
                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
                        {pageItems.map((pkg) => (
                          <PackageCard key={pkg.id} pkg={pkg} />
                        ))}
                      </SimpleGrid>
                      {total > perPage && (
                        <Group
                          justify="apart"
                          mt="md"
                          align="center"
                          style={{ width: "100%" }}
                        >
                          <Text size="sm" c="dimmed">
                            Showing {Math.min(start + 1, total)}–
                            {Math.min(start + pageItems.length, total)} of{" "}
                            {total}
                          </Text>
                          <Group>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={historyPage === 1}
                              onClick={() =>
                                setHistoryPage((p) => Math.max(1, p - 1))
                              }
                            >
                              Previous
                            </Button>
                            <Button
                              size="xs"
                              variant="outline"
                              disabled={start + perPage >= total}
                              onClick={() => setHistoryPage((p) => p + 1)}
                            >
                              Next
                            </Button>
                          </Group>
                        </Group>
                      )}
                    </>
                  );
                })()}
              </>
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

              {/* Pickup on behalf option */}
              <Group align="center" mt="sm" mb="sm" gap="sm">
                <Checkbox
                  checked={pickupOnBehalf}
                  onChange={(e) => {
                    const val = !!e.currentTarget.checked;
                    setPickupOnBehalf(val);
                    // if opting for pickup on behalf, clear selected address (not shipping)
                    if (val) setSelectedAddressId(null);
                  }}
                  label="Pickup on behalf"
                />
              </Group>

              {pickupOnBehalf && (
                <Stack>
                  <TextInput
                    label="Name of person picking up (required)"
                    placeholder="Full name"
                    value={behalfName}
                    onChange={(e) => setBehalfName(e.currentTarget.value)}
                    required
                  />
                  <TextInput
                    label="Mobile number (required)"
                    placeholder="0912XXXXXXX"
                    value={behalfMobile}
                    onChange={(e) => {
                      // allow digits only and trim to 11 chars
                      const digits = e.currentTarget.value
                        .replace(/\D/g, "")
                        .slice(0, 11);
                      setBehalfMobile(digits);
                    }}
                    required
                    maxLength={11}
                    error={
                      behalfMobile.length > 0 && !isBehalfMobileValid
                        ? "Mobile must start with 09 and be 11 digits (e.g. 09121231234)"
                        : undefined
                    }
                  />
                  <Select
                    label="Preferred contact method"
                    data={[
                      { value: "sms", label: "SMS" },
                      { value: "viber", label: "Viber" },
                      { value: "whatsapp", label: "WhatsApp" },
                    ]}
                    value={behalfContactMode}
                    onChange={(v: any) =>
                      setBehalfContactMode(v as "sms" | "viber" | "whatsapp")
                    }
                  />
                </Stack>
              )}
            </>
          )}

          {/* Note section for other actions */}
          {/* Notes removed for DISPOSE and SCAN requests as requested */}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={submitAction}
              loading={submitting}
              // Disable if it's a release action and no shipping address selected or pickup fields invalid
              disabled={
                actionType === "RELEASE" &&
                ((!selectedAddressId && !pickupOnBehalf) ||
                  (pickupOnBehalf && (!behalfName || !isBehalfMobileValid)))
              }
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
          setPreviewIsScan(false);
        }}
        title={previewTitle ?? "Preview"}
        size="xl"
        centered
        overlayProps={{ blur: 3, backgroundOpacity: 0.45 }}
      >
        {previewImage ? (
          <>
            {/\.pdf(\?.*)?$/i.test(previewImage) ? (
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
            )}

            <Group justify="flex-end" mt="sm" gap="xs">
              {/* Only show Request Rescan when preview is a scanned document */}
              {previewIsScan && (
                <Button
                  size="xs"
                  color="violet"
                  onClick={requestRescanFromModal}
                  loading={submitting}
                  disabled={
                    typeof selectedPackage?.status === "string" &&
                    selectedPackage.status.includes("REQUEST")
                  }
                >
                  Request Rescan
                </Button>
              )}
            </Group>
          </>
        ) : (
          <Text c="dimmed">No preview available</Text>
        )}
      </Modal>
    </>
  );
}
