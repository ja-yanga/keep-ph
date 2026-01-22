"use client";

import "mantine-datatable/styles.layer.css";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import dynamic from "next/dynamic";
import {
  ActionIcon,
  Alert,
  Autocomplete,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Select,
  Stack,
  TextInput,
  Tooltip,
  Text,
  FileInput,
  Tabs,
  SegmentedControl,
} from "@mantine/core";
import { useDisclosure, useDebouncedValue } from "@mantine/hooks";
// Added useSearchParams
import { useSearchParams } from "next/navigation";
import {
  IconEdit,
  IconPlus,
  IconSearch,
  IconTrash,
  IconPackage,
  IconFileText,
  IconLock,
  IconAlertCircle,
  IconScan,
  IconUpload,
  IconTruckDelivery,
  IconCheck,
  IconArchive,
  IconRestore,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";

// Dynamic import for DataTable to reduce initial bundle size
const DataTable = dynamic(
  () => import("mantine-datatable").then((mod) => mod.DataTable),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading table...
      </div>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;

type Registration = {
  id: string;
  full_name: string;
  email: string;
  mailroom_code?: string | null;
  mobile?: string | null; // added so release modal can show phone from registrations API
  // CHANGED: Added specific plan capabilities
  mailroom_plans?: {
    name: string;
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
  };
};

type Locker = {
  id: string;
  locker_code: string;
  is_available: boolean;
};

// We need to know which locker is assigned to which user
type AssignedLocker = {
  id: string;
  registration_id: string;
  locker_id: string;
  status?: "Empty" | "Normal" | "Near Full" | "Full";
  locker?: Locker;
};

type Package = {
  id: string;
  package_name: string;
  registration_id: string;
  locker_id?: string | null;
  package_type: "Document" | "Parcel";
  status: string;
  notes?: string;
  image_url?: string;
  package_photo?: string | null;
  received_at: string;
  registration?: Registration;
  locker?: Locker;
  // Release/address snapshot fields
  release_address_id?: string | null;
  release_address?: string | null;
  release_to_name?: string | null;
};

const PACKAGE_TYPES = ["Document", "Parcel"];
const STATUSES = [
  "STORED",
  "RELEASED",
  "RETRIEVED",
  "DISPOSED",
  "REQUEST_TO_RELEASE",
  "REQUEST_TO_DISPOSE",
  "REQUEST_TO_SCAN",
];

export default function MailroomPackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [lockers, setLockers] = useState<Locker[]>([]);
  const [assignedLockers, setAssignedLockers] = useState<AssignedLocker[]>([]);
  const [archivedPackages, setArchivedPackages] = useState<Package[]>([]);
  const [archivedTotalCount, setArchivedTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Recipient search state for async autocomplete (performance optimization for 20k+ users)
  const [recipientSearch, setRecipientSearch] = useState("");
  const [debouncedRecipientSearch] = useDebouncedValue(recipientSearch, 300);
  const [recipientOptions, setRecipientOptions] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [searchingRecipients, setSearchingRecipients] = useState(false);

  // New Filter States
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [packageToDelete, setPackageToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [formData, setFormData] = useState({
    package_name: "",
    registration_id: "",
    locker_id: "",
    package_type: "", // CHANGED: Default to empty string to force selection
    status: "STORED",
  });
  const [submitting, setSubmitting] = useState(false);

  // NEW: package photo state for Add/Edit modal
  const [packagePhoto, setPackagePhoto] = useState<File | null>(null);

  // Preview src for image display
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (packagePhoto) {
      const url = URL.createObjectURL(packagePhoto);
      setPreviewSrc(url);
      return () => URL.revokeObjectURL(url);
    }
    if (editingPackage) {
      setPreviewSrc(
        (editingPackage as { package_photo?: string; image_url?: string })
          .package_photo ||
          (editingPackage as { package_photo?: string; image_url?: string })
            .image_url ||
          null,
      );
    } else {
      setPreviewSrc(null);
    }
  }, [packagePhoto, editingPackage]);

  // Scan/Release States
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanFile, setScanFile] = useState<File | null>(null);
  const [packageToScan, setPackageToScan] = useState<{
    id: string;
    package_name?: string;
  } | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [releaseModalOpen, setReleaseModalOpen] = useState(false);
  const [releaseFile, setReleaseFile] = useState<File | null>(null);
  const [packageToRelease, setPackageToRelease] = useState<Package | null>(
    null,
  );
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseNote, setReleaseNote] = useState<string>("");
  const [addresses, setAddresses] = useState<
    Array<{
      id: string;
      label?: string;
      contact_name?: string;
      contact_phone?: string;
      line1?: string;
      line2?: string;
      city?: string;
      region?: string;
      postal?: string;
      is_default?: boolean;
    }>
  >([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

  const [disposeModalOpen, setDisposeModalOpen] = useState(false);
  const [packageToDispose, setPackageToDispose] = useState<Package | null>(
    null,
  );
  const [isDisposing, setIsDisposing] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<string>("active");

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [packageToRestore, setPackageToRestore] = useState<Package | null>(
    null,
  );
  const [isRestoring, setIsRestoring] = useState(false);

  const [globalSuccess, setGlobalSuccess] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const searchParams = useSearchParams();

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (!tabParam) return;
    const allowed = ["active", "requests", "released", "disposed", "archive"];
    if (allowed.includes(tabParam)) setActiveTab(tabParam);
  }, [searchParams]);

  // New state for locker capacity
  const [lockerCapacity, setLockerCapacity] = useState<
    "Empty" | "Normal" | "Near Full" | "Full"
  >("Normal");

  // Build SWR key with filters and pagination
  const packagesKey = useMemo(() => {
    const baseUrl = API_ENDPOINTS.admin.mailroom.packages;
    if (activeTab === "archive") return null;

    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("limit", pageSize.toString());

    let statusFilter: string[] = [];
    if (activeTab === "active") statusFilter = ["STORED"];
    else if (activeTab === "requests")
      statusFilter = [
        "REQUEST_TO_RELEASE",
        "REQUEST_TO_DISPOSE",
        "REQUEST_TO_SCAN",
      ];
    else if (activeTab === "released") statusFilter = ["RELEASED", "RETRIEVED"];
    else if (activeTab === "disposed") statusFilter = ["DISPOSED"];

    // Override with explicit status filter if set (Inventory tab)
    if (activeTab === "active" && filterStatus) statusFilter = [filterStatus];

    if (statusFilter.length > 0) {
      params.set("status", statusFilter.join(","));
    }

    return `${baseUrl}?${params.toString()}`;
  }, [page, pageSize, search, activeTab, filterStatus]);

  const fetcher = async (url: string) => {
    // avoid stale cached responses when revalidating
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to fetch ${url}`);
    }
    return res.json().catch(() => ({}));
  };

  const { data: combinedData, isValidating } = useSWR(packagesKey, fetcher, {
    revalidateOnFocus: true,
  });

  const archivedKey =
    activeTab === "archive"
      ? `${API_ENDPOINTS.admin.mailroom.archive}?limit=${pageSize}&offset=${(page - 1) * pageSize}`
      : null;

  const { data: archivedData, isValidating: isArchivedValidating } = useSWR(
    archivedKey,
    fetcher,
  );

  // sync SWR combined response into local state using useMemo to reduce main-thread work
  const normalizedData = useMemo(() => {
    const payload = combinedData ?? {};
    let pkgs: Package[];
    if (Array.isArray(payload.packages)) {
      pkgs = payload.packages;
    } else if (Array.isArray(payload.data)) {
      pkgs = payload.data;
    } else {
      pkgs = [];
    }
    const regs = Array.isArray(payload.registrations)
      ? payload.registrations
      : [];
    const lks = Array.isArray(payload.lockers) ? payload.lockers : [];
    const assigned = Array.isArray(payload.assignedLockers)
      ? payload.assignedLockers
      : [];

    return {
      pkgs,
      regs,
      lks,
      assigned,
      total: payload.meta?.total,
      counts: payload.counts,
    };
  }, [combinedData]);

  useEffect(() => {
    setLoading(!!isValidating || !!isArchivedValidating);

    if (normalizedData.pkgs) {
      setPackages(normalizedData.pkgs);
      setRegistrations(normalizedData.regs);
      setLockers(normalizedData.lks);
      setAssignedLockers(normalizedData.assigned);

      if (normalizedData.total !== undefined) {
        setServerTotalCount(normalizedData.total);
      }
      if (normalizedData.counts) {
        setCounts(normalizedData.counts);
      }
    }

    if (archivedData) {
      setArchivedPackages(archivedData.packages || []);
      setArchivedTotalCount(archivedData.total_count || 0);
    }
  }, [normalizedData, isValidating, archivedData, isArchivedValidating]);

  // helper to refresh combined data (used after mutations)
  const refreshAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        swrMutate(packagesKey),
        archivedKey ? swrMutate(archivedKey) : Promise.resolve(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch is now handled by SWR
    // fetchData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType, activeTab]); // Reset page on tab change

  // NEW: Auto-dismiss global success
  useEffect(() => {
    if (globalSuccess) {
      const timer = setTimeout(() => setGlobalSuccess(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [globalSuccess]);

  // NEW: Clear form errors when any modal opens
  useEffect(() => {
    if (opened || scanModalOpen || releaseModalOpen || disposeModalOpen) {
      setFormError(null);
    }
  }, [opened, scanModalOpen, releaseModalOpen, disposeModalOpen]);

  // Fetch recipient options asynchronously with search (performance optimization for large datasets)
  // Only search when user types at least 2 characters - no default dropdown
  useEffect(() => {
    const searchQuery = debouncedRecipientSearch.trim();

    // Clear options if search is less than 2 characters
    if (searchQuery.length < 2) {
      setRecipientOptions([]);
      setSearchingRecipients(false);
      return;
    }

    // Only fetch if user has typed at least 2 characters
    const fetchRecipients = async () => {
      setSearchingRecipients(true);
      try {
        const url = new URL(
          "/api/admin/mailroom/registrations/search",
          window.location.origin,
        );
        url.searchParams.set("q", searchQuery);
        // Request more results when searching to ensure we find all matches
        url.searchParams.set("limit", "200");

        const res = await fetch(url.toString());
        if (!res.ok) {
          throw new Error("Failed to fetch recipients");
        }

        const json = await res.json();
        const results = (json.data || []) as Registration[];

        const options = results.map((r) => {
          const planName = Array.isArray(r.mailroom_plans)
            ? r.mailroom_plans[0]?.name
            : (r.mailroom_plans as { name?: string })?.name;
          return {
            value: r.id,
            label: `${r.mailroom_code || "No Code"} - ${r.email} (${
              planName || "Unknown Plan"
            })`,
          };
        });

        setRecipientOptions(options);
      } catch (error) {
        console.error("Error fetching recipients:", error);
        setRecipientOptions([]);
      } finally {
        setSearchingRecipients(false);
      }
    };

    fetchRecipients();
  }, [debouncedRecipientSearch]);

  // Memoize clearFilters callback to prevent unnecessary re-renders
  const clearFilters = useCallback(() => {
    setSearch("");
    setFilterStatus(null);
    setFilterType(null);
  }, []);

  const hasFilters = useMemo(
    () => !!(search || filterStatus || filterType),
    [search, filterStatus, filterType],
  );

  const handleOpenModal = (pkg?: Package) => {
    if (pkg) {
      setEditingPackage(pkg);

      // 2. Pre-fill locker capacity from existing assignment if available
      const assignment = assignedLockers.find(
        (a) => a.registration_id === pkg.registration_id,
      );
      if (assignment && assignment.status) {
        setLockerCapacity(assignment.status);
      }

      setFormData({
        package_name: pkg.package_name,
        registration_id: pkg.registration_id,
        locker_id: pkg.locker_id || "",
        package_type: pkg.package_type,
        status: pkg.status,
        // notes: pkg.notes || "",
      });
      // Find registration to populate recipient search
      const reg = registrations.find((r) => r.id === pkg.registration_id);
      let planName: string | undefined;
      if (reg?.mailroom_plans) {
        planName = Array.isArray(reg.mailroom_plans)
          ? reg.mailroom_plans[0]?.name
          : (reg.mailroom_plans as { name?: string })?.name;
      }
      const regLabel = reg
        ? `${reg.mailroom_code || "No Code"} - ${reg.email} (${planName || "Unknown Plan"})`
        : "";
      setRecipientSearch(regLabel);
      // Add current recipient to options so it displays correctly (without triggering search)
      if (reg) {
        setRecipientOptions([
          {
            value: reg.id,
            label: regLabel,
          },
        ]);
      }
      // keep packagePhoto null so existing image is used unless user picks a new one
      setPackagePhoto(null);
    } else {
      setEditingPackage(null);
      setLockerCapacity("Normal");
      setFormData({
        package_name: "",
        registration_id: "",
        locker_id: "",
        package_type: "Parcel",
        status: "STORED",
      });
      setRecipientSearch("");
      setRecipientOptions([]); // Clear options when opening new package modal
      setPackagePhoto(null);
    }
    open();
  };

  const handleRegistrationChange = (regId: string | null) => {
    if (!regId) {
      setFormData({
        ...formData,
        registration_id: "",
        locker_id: "",
        package_type: "",
      });
      return;
    }

    // Find ALL assigned lockers for this recipient
    const assignments = assignedLockers.filter(
      (a) => String(a.registration_id) === String(regId),
    );

    // Find the registration to check plan capabilities
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
    const _reg = registrations.find((r) => r.id === regId);

    // Determine default package type based on plan
    const defaultType = "Document";

    // If there's exactly one assigned locker, auto-select it
    // Otherwise, leave locker_id empty so user can choose from dropdown
    const defaultLockerId =
      assignments.length === 1 ? assignments[0].locker_id : "";

    setFormData({
      ...formData,
      registration_id: regId,
      locker_id: defaultLockerId,
      package_type: defaultType,
    });
  };

  // Helper to get available types for selected user
  const getAvailablePackageTypes = () => {
    if (!formData.registration_id) return [];

    const reg = registrations.find((r) => r.id === formData.registration_id);
    if (!reg?.mailroom_plans) return PACKAGE_TYPES; // Fallback

    const types = [];
    if (reg.mailroom_plans.can_receive_mail) types.push("Document");
    if (reg.mailroom_plans.can_receive_parcels) types.push("Parcel");

    return types;
  };

  const handleSubmit = async () => {
    if (
      !formData.package_name ||
      !formData.registration_id ||
      !formData.package_type
    ) {
      setFormError("Please fill in all required fields");
      return;
    }

    // Status is always STORED for new packages
    // When editing, preserve the original status (status cannot be changed via edit modal)
    const finalStatus = editingPackage ? editingPackage.status : "STORED";

    // Photo is required (either newly selected or existing on editingPackage)
    if (
      !packagePhoto &&
      !(editingPackage?.package_photo || editingPackage?.image_url)
    ) {
      setFormError("Package photo is required");
      return;
    }

    setSubmitting(true);
    setFormError(null); // Clear previous errors

    try {
      // If a new package photo was chosen, upload it first
      let photoUrl: string | null = null;
      if (packagePhoto) {
        const fd = new FormData();
        fd.append("file", packagePhoto);
        // send registration/user id so upload route can place file under that folder
        const userFolder =
          formData.registration_id || editingPackage?.registration_id || "";
        if (userFolder) fd.append("user_id", userFolder);
        const up = await fetch("/api/admin/mailroom/packages/upload", {
          method: "POST",
          body: fd,
        });
        if (!up.ok) {
          const j = await up.json().catch(() => ({}));
          throw new Error(j?.error || "Failed to upload photo");
        }
        const uj = await up.json();
        photoUrl = uj.url;
      }

      const url = editingPackage
        ? `/api/admin/mailroom/packages/${editingPackage.id}`
        : "/api/admin/mailroom/packages";

      const method = editingPackage ? "PUT" : "POST";

      const payload: Record<string, unknown> = {
        ...formData,
        status: finalStatus, // Always STORED for new packages, use formData.status for edits
      };

      // Only send locker_status when ADDING a package
      if (!editingPackage) {
        payload.locker_status = lockerCapacity;
      }

      // include package_photo only if we uploaded one
      if (photoUrl) {
        payload.package_photo = photoUrl;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save");
      const raw = await res.json().catch(() => null);
      const saved = raw?.data ?? raw;

      // optimistic local update: merge returned fields into existing package
      setPackages((cur) => {
        if (!saved?.id) return cur;
        try {
          if (editingPackage) {
            return cur.map((p) =>
              p.id === saved.id ? { ...p, ...(saved as Partial<Package>) } : p,
            );
          } else {
            // prepend new package (server should return joined shape)
            return [saved as Package, ...cur];
          }
        } catch {
          return cur;
        }
      });

      setGlobalSuccess(
        `Package ${editingPackage ? "updated" : "created"} successfully`,
      );

      close();
      await refreshAll();
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save package";
      setFormError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    setPackageToDelete(id);
    openDeleteModal();
  };

  const confirmDelete = async () => {
    if (!packageToDelete) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/mailroom/packages/${packageToDelete}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) throw new Error("Failed to delete");

      await refreshAll();
      closeDeleteModal();
    } catch (error) {
      console.error(error);
      notifications.show({
        title: "Error",
        message: "Failed to delete package",
        color: "red",
      });
    } finally {
      setIsDeleting(false);

      setPackageToDelete(null);
      setGlobalSuccess("Package deleted successfully");
    }
  };

  // --- UPDATED HANDLER FOR DISPOSAL ---
  const handleConfirmDisposal = (pkg: Package) => {
    setPackageToDispose(pkg);
    // Default to "Empty" or "Normal" when disposing, as items are removed
    setLockerCapacity("Normal");
    setDisposeModalOpen(true);
  };

  const handleSubmitDispose = async () => {
    if (!packageToDispose) return;
    setIsDisposing(true);
    setFormError(null);

    try {
      const payload = {
        package_name: packageToDispose.package_name,
        registration_id: packageToDispose.registration_id,
        locker_id: packageToDispose.locker_id,
        package_type: packageToDispose.package_type,
        status: "DISPOSED",
        notes: packageToDispose.notes,

        locker_status: lockerCapacity, // <--- Send the new status
      };

      const res = await fetch(
        `/api/admin/mailroom/packages/${packageToDispose.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to update status");

      setGlobalSuccess("Package marked as DISPOSED and locker status updated");
      setDisposeModalOpen(false);
      await refreshAll();
    } catch (error: unknown) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to dispose package";
      setFormError(errorMessage);
    } finally {
      setIsDisposing(false);
    }
  };

  const handleOpenRestore = (pkg: Package) => {
    setPackageToRestore(pkg);
    setRestoreModalOpen(true);
  };

  const handleSubmitRestore = async () => {
    if (!packageToRestore) return;
    setIsRestoring(true);
    try {
      const res = await fetch(
        API_ENDPOINTS.admin.mailroom.restore(packageToRestore.id),
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to restore package");
      setGlobalSuccess("Package restored successfully");
      setRestoreModalOpen(false);
      await refreshAll();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to restore package";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  // --- SCAN HANDLERS ---
  const handleOpenScan = (pkg: { id: string; package_name?: string }) => {
    setPackageToScan(pkg);
    setScanFile(null);
    setScanModalOpen(true);
  };

  const handleSubmitScan = async () => {
    if (!scanFile || !packageToScan) return;
    setIsUploading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", scanFile);
      formData.append("packageId", packageToScan.id);

      const res = await fetch("/api/admin/mailroom/scans", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      setGlobalSuccess("Document scanned and uploaded successfully");
      setScanModalOpen(false);
      await refreshAll();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setFormError(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  // --- RELEASE HANDLERS ---
  const handleOpenRelease = async (pkg: Package) => {
    setPackageToRelease(pkg);
    setReleaseFile(null);
    setLockerCapacity("Normal");
    setReleaseNote(pkg?.notes || "");
    setReleaseModalOpen(true);

    // fetch saved addresses for the registration's user
    try {
      setAddresses([]);
      setSelectedAddressId(null);
      const userId = pkg?.registration_id; // adapt if registration maps to user_id differently
      if (!userId) return;
      const res = await fetch(
        `/api/user/addresses?userId=${encodeURIComponent(userId)}`,
      );
      if (!res.ok) return;
      const json = await res.json().catch(() => ({}));
      const arr = Array.isArray(json?.data) ? json.data : json || [];
      setAddresses(arr);
      // preselect package snapshot or default
      if (pkg.release_address_id) {
        setSelectedAddressId(pkg.release_address_id);
      } else {
        const def = arr.find((a: { is_default?: boolean }) => a.is_default);
        setSelectedAddressId(def?.id ?? null);
      }
    } catch (e) {
      console.error("failed to load addresses for release modal", e);
    }
  };

  const handleSubmitRelease = async () => {
    if (!releaseFile || !packageToRelease) {
      setFormError("Missing file or package information");
      return;
    }

    if (!packageToRelease.id) {
      setFormError("Package ID is missing. Please try refreshing the page.");
      return;
    }

    // Determine final address id to send (optional):
    // priority: selectedAddressId (if previously set) -> package snapshot -> user's default address
    const finalAddressId =
      selectedAddressId ??
      packageToRelease?.release_address_id ??
      addresses.find((a) => a.is_default)?.id ??
      null;

    setIsReleasing(true);
    setFormError(null);

    try {
      console.log("[release] Submitting release:", {
        packageId: packageToRelease.id,
        packageName: packageToRelease.package_name,
        hasFile: !!releaseFile,
        lockerStatus: lockerCapacity,
      });

      const formData = new FormData();
      formData.append("file", releaseFile);
      formData.append("packageId", packageToRelease.id);
      formData.append("lockerStatus", lockerCapacity);
      if (releaseNote) formData.append("notes", releaseNote);
      // Only append address if available (address is optional)
      if (finalAddressId) {
        formData.append("selectedAddressId", finalAddressId);
        // send an explicit snapshot name: prefer package snapshot -> saved address contact_name -> registration full_name
        const sel = addresses.find((a) => a.id === finalAddressId);
        const snapshotName =
          packageToRelease.release_to_name ??
          sel?.contact_name ??
          packageToRelease?.registration?.full_name ??
          "";
        if (snapshotName) formData.append("release_to_name", snapshotName);
      } else {
        // If no address, still try to send the name from package snapshot or registration
        const snapshotName =
          packageToRelease.release_to_name ??
          packageToRelease?.registration?.full_name ??
          "";
        if (snapshotName) formData.append("release_to_name", snapshotName);
      }

      const res = await fetch("/api/admin/mailroom/release", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const errorMsg = err.error || err.message || "Release failed";
        const errorDetails = err.details ? `: ${err.details}` : "";
        console.error("[release] API error:", {
          status: res.status,
          error: err,
          packageId: packageToRelease.id,
        });
        throw new Error(`${errorMsg}${errorDetails}`);
      }

      setGlobalSuccess("Package released and locker status updated");
      setReleaseModalOpen(false);
      await refreshAll();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Release failed";
      setFormError(errorMessage);
    } finally {
      setIsReleasing(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredPackages = useMemo(() => {
    const q = (search || "").toLowerCase();

    return packages.filter((p) => {
      const pkgName = (p.package_name ?? "").toLowerCase();
      const regName = (p.registration?.full_name ?? "").toLowerCase();
      const regEmail = (p.registration?.email ?? "").toLowerCase();
      const status = (p.status ?? "").toLowerCase();
      const lockerCode = (p.locker?.locker_code ?? "").toLowerCase();

      const matchesSearch =
        pkgName.includes(q) ||
        regName.includes(q) ||
        regEmail.includes(q) ||
        status.includes(q) ||
        lockerCode.includes(q);

      const matchesType = filterType ? p.package_type === filterType : true;

      return matchesSearch && matchesType;
    });
  }, [packages, search, filterType]);

  // Memoize paginated packages
  const paginatedPackages = useMemo(() => {
    return activeTab === "archive" ? archivedPackages : filteredPackages;
  }, [activeTab, archivedPackages, filteredPackages]);

  const totalRecords = useMemo(
    () => (activeTab === "archive" ? archivedTotalCount : serverTotalCount),
    [activeTab, archivedTotalCount, serverTotalCount],
  );

  // Memoize status color function to prevent recreation on each render
  const getStatusColor = useCallback((status: string) => {
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
  }, []);

  // Count requests for badge - memoized to prevent recalculation
  const requestCount = useMemo(() => counts.requests || 0, [counts]);

  // Memoize DataTable columns to prevent recreation on each render
  const tableColumns: DataTableColumn<Package>[] = useMemo(
    () => [
      {
        accessor: "package_name",
        title: "Package",
        width: 200,
        render: (record: unknown) => {
          const pkg = record as Package;
          return (
            <Text fw={500} size="sm">
              {pkg.package_name}
            </Text>
          );
        },
      },
      {
        accessor: "registration.full_name",
        title: "Recipient",
        render: (record: unknown) => {
          const pkg = record as Package;
          return (
            <Stack gap={0}>
              <Text size="sm" fw={500}>
                {pkg.registration?.full_name || "Unknown"}
              </Text>
              <Text size="xs" c="#4A5568">
                {pkg.registration?.email}
              </Text>
            </Stack>
          );
        },
      },
      {
        accessor: "locker.locker_code",
        title: "Locker",
        width: 120,
        render: (record: unknown) => {
          const pkg = record as Package;
          return pkg.locker ? (
            <Badge
              variant="outline"
              color="gray"
              leftSection={<IconLock size={12} aria-hidden="true" />}
            >
              {pkg.locker.locker_code}
            </Badge>
          ) : (
            <Text size="sm" c="#4A5568">
              —
            </Text>
          );
        },
      },
      {
        accessor: "package_type",
        title: "Type",
        width: 120,
        render: (record: unknown) => {
          const pkg = record as Package;
          return (
            <Badge
              variant="filled"
              color="gray"
              leftSection={
                pkg.package_type === "Document" ? (
                  <IconFileText size={12} aria-hidden="true" />
                ) : (
                  <IconPackage size={12} aria-hidden="true" />
                )
              }
            >
              {pkg.package_type}
            </Badge>
          );
        },
      },
      {
        accessor: "status",
        title: "Status",
        width: 180,
        render: (record: unknown) => {
          const pkg = record as Package;
          return (
            <Badge color={getStatusColor(pkg.status)} variant="filled">
              {pkg.status.replace(/_/g, " ")}
            </Badge>
          );
        },
      },
      {
        accessor: "received_at",
        title: activeTab === "archive" ? "Deleted At" : "Received",
        width: 150,
        render: (record: unknown) => {
          const pkg = record as Package;
          return dayjs(pkg.received_at).format("MMM D, YYYY");
        },
      },
      {
        accessor: "actions",
        title: "Actions",
        width: activeTab !== "requests" ? 120 : 165,
        textAlign: "right" as const,
        render: (record: unknown) => {
          const pkg = record as Package;
          return (
            <Group gap="xs" justify="flex-end">
              {/* Archive Actions */}
              {activeTab === "archive" && (
                <>
                  <Tooltip label="Restore package">
                    <Button
                      size="compact-xs"
                      color="green"
                      variant="filled"
                      leftSection={<IconRestore size={14} aria-hidden="true" />}
                      onClick={() => handleOpenRestore(pkg)}
                      aria-label={`Restore package ${pkg.package_name}`}
                    >
                      Restore
                    </Button>
                  </Tooltip>
                </>
              )}

              {/* Standard Actions (Non-Archive) */}
              {activeTab !== "archive" && (
                <>
                  {/* Action Buttons based on Status (Requests Only) */}
                  {pkg.status === "REQUEST_TO_SCAN" && (
                    <Tooltip label="Upload Scanned PDF">
                      <Button
                        size="compact-xs"
                        w={100}
                        color="violet"
                        leftSection={<IconScan size={14} aria-hidden="true" />}
                        onClick={() => handleOpenScan(pkg)}
                        aria-label={`Upload scanned PDF for package ${pkg.package_name}`}
                      >
                        Scan
                      </Button>
                    </Tooltip>
                  )}
                  {pkg.status === "REQUEST_TO_RELEASE" && (
                    <Tooltip label="Confirm Release">
                      <Button
                        size="compact-xs"
                        w={100}
                        color="teal"
                        leftSection={
                          <IconTruckDelivery size={14} aria-hidden="true" />
                        }
                        onClick={() => handleOpenRelease(pkg)}
                        aria-label={`Release package ${pkg.package_name}`}
                      >
                        Release
                      </Button>
                    </Tooltip>
                  )}
                  {pkg.status === "REQUEST_TO_DISPOSE" && (
                    <Tooltip label="Confirm Disposal">
                      <Button
                        size="compact-xs"
                        w={100}
                        color="red"
                        variant="filled"
                        leftSection={<IconTrash size={14} aria-hidden="true" />}
                        onClick={() => handleConfirmDisposal(pkg)}
                        aria-label={`Dispose package ${pkg.package_name}`}
                      >
                        Dispose
                      </Button>
                    </Tooltip>
                  )}

                  {/* Standard Edit/Delete */}
                  {activeTab === "active" && (
                    <Tooltip label="Edit package">
                      <ActionIcon
                        variant="subtle"
                        color="blue"
                        onClick={() => handleOpenModal(pkg)}
                        aria-label={`Edit package ${pkg.package_name}`}
                      >
                        <IconEdit size={16} aria-hidden="true" />
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Tooltip label="Delete package">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => handleDelete(pkg.id)}
                      aria-label={`Delete package ${pkg.package_name}`}
                    >
                      <IconTrash size={16} aria-hidden="true" />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </Group>
          );
        },
      },
    ],
    [activeTab, getStatusColor],
  );

  // helper to extract phone for release snapshot
  const getSnapshotPhone = (pkg: Package | null) => {
    if (!pkg) return null;
    // 1) explicit registration mobile
    const regPhone = pkg.registration?.mobile ?? null;
    if (regPhone) return regPhone;
    // 2) explicit release snapshot field (if any)
    // use bracket access in case field not declared in interface
    const releasePhone =
      (pkg as { release_contact_phone?: string }).release_contact_phone ?? null;
    if (releasePhone) return releasePhone;
    // 3) parse notes JSON for pickup_on_behalf.mobile
    try {
      const n = pkg.notes;
      if (typeof n === "string" && n.trim().startsWith("{")) {
        const parsed = JSON.parse(n);
        if (parsed?.pickup_on_behalf?.mobile)
          return parsed.pickup_on_behalf.mobile;
        if (parsed?.mobile) return parsed.mobile;
      } else if (typeof n === "string" && /^\+?\d/.test(n.trim())) {
        // plain phone string stored in notes
        return n.trim();
      }
    } catch {
      // ignore
    }
    return null;
  };

  // helper to extract pickup-on-behalf object from notes JSON
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for future use
  const getPickupOnBehalf = (pkg: Package | null) => {
    if (!pkg) return null;
    try {
      const n = pkg.notes;
      if (typeof n !== "string") return null;
      const trimmed = n.trim();
      if (!trimmed.startsWith("{")) return null;
      const parsed = JSON.parse(trimmed);
      const pb = parsed?.pickup_on_behalf ?? null;
      if (pb) {
        return {
          name: pb.name ?? null,
          mobile: pb.mobile ?? null,
          contact_mode: pb.contact_mode ?? null,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  // safe notes parser (returns pickup object or null)
  const parsePickupFromNotes = (notes?: string | null) => {
    if (!notes || typeof notes !== "string") return null;
    try {
      const parsed = JSON.parse(notes);
      if (parsed?.pickup_on_behalf) {
        // support both object or boolean-flag style
        const pb =
          typeof parsed.pickup_on_behalf === "object"
            ? parsed.pickup_on_behalf
            : parsed;
        return {
          name: pb.name ?? parsed.name ?? null,
          mobile: pb.mobile ?? parsed.mobile ?? null,
          contact_mode: pb.contact_mode ?? parsed.contact_mode ?? null,
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const packagesTable = (
    <div
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "400px",
      }}
    >
      <DataTable<Package>
        withTableBorder={false}
        borderRadius="lg"
        striped
        highlightOnHover
        records={paginatedPackages}
        fetching={loading}
        verticalSpacing="md"
        minHeight={minTableHeight(pageSize)}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        page={page}
        onPageChange={(p) => setPage(p)}
        recordsPerPageOptions={[10, 20, 50]}
        onRecordsPerPageChange={setPageSize}
        columns={tableColumns}
        aria-label="Packages data table"
        noRecordsText={
          activeTab === "requests" ? "No pending requests" : "No packages found"
        }
      />
    </div>
  );

  return (
    <Stack align="center" gap="lg" w="100%">
      {/* GLOBAL SUCCESS ALERT */}
      {globalSuccess && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setGlobalSuccess(null)}
          w="100%"
        >
          {globalSuccess}
        </Alert>
      )}

      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
        <Group
          justify="space-between"
          mb="md"
          gap="xs"
          align="center"
          wrap="nowrap"
        >
          <Group style={{ flex: 1 }} gap="xs" wrap="nowrap">
            <TextInput
              placeholder="Search packages..."
              leftSection={<IconSearch size={16} aria-hidden="true" />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1 }}
              aria-label="Search packages by name, recipient, email, status, or locker code"
            />
            {/* Only show status filter on active tab */}
            {activeTab === "active" && (
              <Select
                placeholder="Filter by Status"
                data={STATUSES.filter((s) => !s.includes("REQUEST")).map(
                  (s) => ({
                    value: s,
                    label: s.replace(/_/g, " "),
                  }),
                )}
                value={filterStatus}
                onChange={setFilterStatus}
                clearable
                style={{ width: 180 }}
                aria-label="Filter packages by status"
              />
            )}
            <Select
              placeholder="Filter by Type"
              data={PACKAGE_TYPES}
              value={filterType}
              onChange={setFilterType}
              clearable
              style={{ width: 140 }}
              aria-label="Filter packages by type"
            />
            {hasFilters && (
              <Button
                variant="subtle"
                color="red"
                size="sm"
                onClick={clearFilters}
                aria-label="Clear all filters"
              >
                Clear Filters
              </Button>
            )}
          </Group>
          <Button
            leftSection={<IconPlus size={16} aria-hidden="true" />}
            onClick={() => handleOpenModal()}
            color="#1e3a8a"
            aria-label="Add new package"
          >
            Add Package
          </Button>
        </Group>

        <Tabs
          value={activeTab}
          onChange={(value) => setActiveTab(value || "active")}
          mb="md"
          aria-label="Package status tabs"
          keepMounted={false}
        >
          <Tabs.List>
            <Tabs.Tab
              value="active"
              leftSection={<IconPackage size={16} aria-hidden="true" />}
            >
              Active Inventory
            </Tabs.Tab>
            <Tabs.Tab
              value="requests"
              leftSection={<IconAlertCircle size={16} aria-hidden="true" />}
              rightSection={
                requestCount > 0 && (
                  <Badge
                    size="xs"
                    color="red"
                    aria-label={`${requestCount} pending requests`}
                  >
                    {requestCount}
                  </Badge>
                )
              }
            >
              Pending Requests
            </Tabs.Tab>
            <Tabs.Tab
              value="released"
              leftSection={<IconCheck size={16} aria-hidden="true" />}
            >
              Released
            </Tabs.Tab>
            <Tabs.Tab
              value="disposed"
              leftSection={<IconTrash size={16} aria-hidden="true" />}
            >
              Disposed
            </Tabs.Tab>
            <Tabs.Tab
              value="archive"
              leftSection={<IconArchive size={16} aria-hidden="true" />}
            >
              Archive
            </Tabs.Tab>
          </Tabs.List>

          {(
            ["active", "requests", "released", "disposed", "archive"] as const
          ).map((tab) => (
            <Tabs.Panel key={tab} value={tab} pt="xs">
              {packagesTable}
            </Tabs.Panel>
          ))}
        </Tabs>
      </Paper>

      <Modal
        opened={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore Package"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to restore{" "}
            <b>{packageToRestore?.package_name}</b>? It will be returned to its
            previous state (Active or Disposed).
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setRestoreModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="green"
              onClick={handleSubmitRestore}
              loading={isRestoring}
            >
              Restore
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Modals (Keep existing modals) */}
      <Modal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        title="Confirm Deletion"
        centered
      >
        <Stack>
          <Text>
            Are you sure you want to delete this package? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={closeDeleteModal}
              loading={isDeleting}
            >
              Cancel
            </Button>
            <Button color="red" onClick={confirmDelete} loading={isDeleting}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={opened}
        onClose={close}
        title={editingPackage ? "Edit Package" : "Add Package"}
        size="lg"
      >
        <Stack>
          {/* FORM ERROR ALERT */}
          {formError && (
            <Alert
              variant="filled"
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
            label="Package Name"
            placeholder="e.g. My Parcel / Order #1234"
            required
            value={formData.package_name}
            onChange={(e) =>
              setFormData({
                ...formData,
                package_name: e.currentTarget.value,
              })
            }
          />
          <Autocomplete
            label="Recipient"
            placeholder="Type at least 2 characters to search recipients..."
            required
            data={recipientOptions}
            value={
              recipientOptions.find(
                (opt) => opt.value === formData.registration_id,
              )?.label || recipientSearch
            }
            onChange={(val) => {
              setRecipientSearch(val);
              // If exact match found, set the registration_id
              const matched = recipientOptions.find((opt) => opt.label === val);
              if (matched) {
                handleRegistrationChange(matched.value);
              } else if (!val) {
                handleRegistrationChange(null);
                setRecipientOptions([]); // Clear options when cleared
              }
            }}
            onOptionSubmit={(val) => {
              handleRegistrationChange(val);
              const matched = recipientOptions.find((opt) => opt.value === val);
              setRecipientSearch(matched?.label || "");
            }}
            rightSection={
              searchingRecipients ? (
                <Text size="xs" c="#4A5568">
                  Searching...
                </Text>
              ) : undefined
            }
            description={(() => {
              if (recipientSearch.length > 0 && recipientSearch.length < 2) {
                return "Type at least 2 characters to search";
              }
              if (
                recipientSearch.length >= 2 &&
                recipientOptions.length === 0 &&
                !searchingRecipients
              ) {
                return "No recipients found";
              }
              return undefined;
            })()}
            limit={200}
          />
          <Select
            label="Assign Locker"
            placeholder={
              formData.registration_id
                ? "Select assigned locker"
                : "Select a recipient first"
            }
            searchable
            clearable
            disabled={!formData.registration_id}
            data={lockers
              .filter((l) => {
                if (!formData.registration_id) return false;

                // Find the assignment for this locker and user
                // Use String() to ensure proper comparison (handles UUID string vs string)
                const assignment = assignedLockers.find(
                  (a) =>
                    String(a.locker_id) === String(l.id) &&
                    String(a.registration_id) ===
                      String(formData.registration_id),
                );

                // Must be assigned to this user
                return !!assignment;
              })
              .map((l) => {
                const assignment = assignedLockers.find(
                  (a) =>
                    String(a.locker_id) === String(l.id) &&
                    String(a.registration_id) ===
                      String(formData.registration_id),
                );

                const isFull = assignment?.status === "Full";
                const isCurrent = String(l.id) === String(formData.locker_id);

                return {
                  value: l.id,
                  label: `${l.locker_code}${isFull ? " (Full)" : ""}`,
                  disabled: isFull && !isCurrent, // Show but disable if full (unless it's the one currently
                };
              })}
            value={formData.locker_id}
            onChange={(val) =>
              setFormData({ ...formData, locker_id: val || "" })
            }
          />
          <Select
            label="Type"
            required
            placeholder={
              !formData.registration_id
                ? "Select a recipient first"
                : "Select type"
            }
            disabled={!formData.registration_id}
            data={getAvailablePackageTypes()}
            value={formData.package_type}
            onChange={(val) =>
              setFormData({ ...formData, package_type: val || "" })
            }
          />

          {/* Locker Capacity Control - Only show when ADDING a package */}
          {!editingPackage && (
            <Stack gap={4} mt="xs">
              <Text size="sm" fw={500}>
                Update Locker Capacity Status
              </Text>
              <SegmentedControl
                value={lockerCapacity}
                onChange={(val) =>
                  setLockerCapacity(
                    val as "Empty" | "Normal" | "Near Full" | "Full",
                  )
                }
                fullWidth
                data={[
                  { label: "Empty", value: "Empty" },
                  { label: "Normal", value: "Normal" },
                  { label: "Near Full", value: "Near Full" },
                  { label: "Full", value: "Full" },
                ]}
                color={(() => {
                  if (lockerCapacity === "Full") return "red";
                  if (lockerCapacity === "Near Full") return "orange";
                  if (lockerCapacity === "Empty") return "gray";
                  return "blue";
                })()}
              />
              <Text size="xs" c="dimmed">
                This will update the status of the assigned locker for this
                user.
              </Text>
            </Stack>
          )}

          {/* NEW: Package Photo (required) */}
          <FileInput
            label="Package Photo"
            placeholder="Select image"
            accept="image/png,image/jpeg,image/jpg"
            value={packagePhoto}
            onChange={setPackagePhoto}
            leftSection={<IconUpload size={16} />}
            required
          />

          {/* Preview */}
          {previewSrc && (
            <Group justify="center" mt="sm">
              {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic image URLs from storage, not suitable for Next.js Image optimization */}
              <img
                src={previewSrc}
                alt="Package preview"
                style={{
                  maxWidth: 200,
                  maxHeight: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "1px solid rgba(0,0,0,0.06)",
                }}
              />
            </Group>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={submitting}>
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
        title="Upload Scanned Document"
        centered
      >
        <Stack>
          {/* FORM ERROR ALERT */}
          {formError && (
            <Alert
              variant="filled"
              color="red"
              title="Error"
              icon={<IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <Text size="sm">
            Upload the PDF scan for <b>{packageToScan?.package_name}</b>.
          </Text>
          <FileInput
            label="Select PDF"
            placeholder="Click to select file"
            accept="application/pdf"
            value={scanFile}
            onChange={setScanFile}
            leftSection={<IconUpload size={16} />}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setScanModalOpen(false)}>
              Cancel
            </Button>
            <Button
              color="violet"
              onClick={handleSubmitScan}
              loading={isUploading}
              disabled={!scanFile}
            >
              Upload & Complete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={releaseModalOpen}
        onClose={() => setReleaseModalOpen(false)}
        title="Confirm Release"
        centered
      >
        <Stack>
          {/* FORM ERROR ALERT */}
          {formError && (
            <Alert
              variant="filled"
              color="red"
              title="Error"
              icon={<IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <Text size="sm">
            Upload Proof of Release (Photo/Signature) for{" "}
            <b>{packageToRelease?.package_name}</b>.
          </Text>
          <FileInput
            label="Proof Image"
            placeholder="Select image"
            accept="image/png,image/jpeg,image/jpg"
            value={releaseFile}
            onChange={setReleaseFile}
            leftSection={<IconUpload size={16} />}
          />

          {/* Show saved release snapshot if available, otherwise show user's default address (read-only preview) */}
          <Box mt="sm">
            {packageToRelease?.release_address
              ? // --- PATH 1: Saved Release Snapshot (Confirmed/Historical Details)
                (() => {
                  const pickup = parsePickupFromNotes(packageToRelease?.notes);
                  const phone = getSnapshotPhone(packageToRelease);
                  return (
                    <Paper withBorder p="md" radius="md" bg="gray.0">
                      <Stack gap={4}>
                        {/* Title */}
                        <Text fw={700} size="md">
                          Saved Release Snapshot
                        </Text>
                        <Divider />

                        {/* Delivery Address (Label on top, Value below) */}
                        <Stack gap={2}>
                          <Text fw={700} size="sm" c="#4A5568">
                            Delivery Address
                          </Text>
                          <Text size="sm" fw={500}>
                            {packageToRelease.release_address}
                          </Text>
                        </Stack>

                        {/* Recipient and Phone (Side by side) */}
                        <Group grow mt="xs">
                          {packageToRelease.release_to_name && (
                            <Stack gap={2}>
                              <Text fw={700} size="sm" c="#4A5568">
                                Recipient Name
                              </Text>
                              <Text size="sm" fw={500}>
                                {packageToRelease.release_to_name}
                              </Text>
                            </Stack>
                          )}
                          {phone && (
                            <Stack gap={2}>
                              <Text fw={700} size="sm" c="#4A5568">
                                Contact Phone
                              </Text>
                              <Text size="sm" fw={500}>
                                {phone}
                              </Text>
                            </Stack>
                          )}
                        </Group>

                        {/* Pickup-on-behalf details (Nested box for visual separation) */}
                        {pickup && (
                          <Paper
                            p="sm"
                            radius="sm"
                            bg="white"
                            withBorder
                            mt="xs"
                          >
                            <Stack gap={4}>
                              <Text size="sm" fw={700} c="blue">
                                Pickup on Behalf Details
                              </Text>
                              {/* Details as label: value pairs */}
                              {pickup.name && (
                                <Text size="sm" c="#4A5568">
                                  Name:{" "}
                                  <Text span fw={500} c="dark">
                                    {pickup.name}
                                  </Text>
                                </Text>
                              )}
                              {pickup.mobile && (
                                <Text size="sm" c="#4A5568">
                                  Mobile:{" "}
                                  <Text span fw={500} c="dark">
                                    {pickup.mobile}
                                  </Text>
                                </Text>
                              )}
                              {pickup.contact_mode && (
                                <Text size="sm" c="#4A5568">
                                  Contact via:{" "}
                                  <Text span fw={500} c="dark">
                                    {String(pickup.contact_mode).toUpperCase()}
                                  </Text>
                                </Text>
                              )}
                            </Stack>
                          </Paper>
                        )}
                      </Stack>
                    </Paper>
                  );
                })()
              : // --- PATH 2: Default Address (Suggested Details)
                (() => {
                  const def =
                    addresses.find((a) => a.is_default) ?? addresses[0];
                  if (def) {
                    return (
                      <Paper withBorder p="md" radius="md" bg="gray.0">
                        <Stack gap={4}>
                          {/* Title and Badge - Separated */}
                          <Group justify="space-between" align="center">
                            <Text fw={700} size="md">
                              Suggested Address:{" "}
                              {def.label || "Unnamed Address"}
                            </Text>
                            {def.is_default && (
                              <Badge size="sm" color="blue" variant="filled">
                                Default
                              </Badge>
                            )}
                          </Group>
                          <Divider />

                          {/* Recipient (Label on top, Value below) */}
                          <Stack gap={2}>
                            <Text fw={700} size="sm" c="#4A5568">
                              Recipient Name
                            </Text>
                            <Text size="sm" fw={500}>
                              {def.contact_name ||
                                packageToRelease?.registration?.full_name ||
                                "N/A"}
                            </Text>
                          </Stack>

                          {/* Address and Phone (Side by side) */}
                          <Group grow mt="xs">
                            <Stack gap={2}>
                              <Text fw={700} size="sm" c="#4A5568">
                                Address
                              </Text>
                              <Stack gap={0}>
                                <Text size="sm" fw={500}>
                                  {def.line1}
                                  {def.line2 ? `, ${def.line2}` : ""}
                                </Text>
                                <Text size="sm" fw={500}>
                                  {[def.city, def.region, def.postal]
                                    .filter(Boolean)
                                    .join(", ")}
                                </Text>
                              </Stack>
                            </Stack>

                            {def.contact_phone && (
                              <Stack gap={2}>
                                <Text fw={700} size="sm" c="#4A5568">
                                  Contact Phone
                                </Text>
                                <Text size="sm" fw={500}>
                                  {def.contact_phone}
                                </Text>
                              </Stack>
                            )}
                          </Group>
                        </Stack>
                      </Paper>
                    );
                  }
                  return (
                    <Text c="#4A5568">
                      No shipping address on file for this user.
                    </Text>
                  );
                })()}
          </Box>

          {/* Locker info (show which locker this package is in) */}
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Locker
            </Text>
            <Text size="sm" fw={500}>
              {packageToRelease?.locker?.locker_code ??
                packageToRelease?.locker_id ??
                "—"}
            </Text>
          </Stack>

          {/* NEW: Locker Status Selector */}
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Update Locker Capacity Status
            </Text>
            <SegmentedControl
              value={lockerCapacity}
              onChange={(val) =>
                setLockerCapacity(
                  val as "Empty" | "Normal" | "Near Full" | "Full",
                )
              }
              fullWidth
              data={[
                { label: "Empty", value: "Empty" },
                { label: "Normal", value: "Normal" },
                { label: "Near Full", value: "Near Full" },
                { label: "Full", value: "Full" },
              ]}
              color={(() => {
                if (lockerCapacity === "Full") return "red";
                if (lockerCapacity === "Near Full") return "orange";
                if (lockerCapacity === "Empty") return "gray";
                return "blue";
              })()}
            />
            <Text size="xs" c="#4A5568">
              Since items are being removed, you might want to set this to
              &quot;Normal&quot; or &quot;Empty&quot;.
            </Text>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setReleaseModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="teal"
              onClick={handleSubmitRelease}
              loading={isReleasing}
              disabled={!releaseFile}
            >
              Upload Proof & Complete
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* NEW: Dispose Modal */}
      <Modal
        opened={disposeModalOpen}
        onClose={() => setDisposeModalOpen(false)}
        title="Confirm Disposal"
        centered
      >
        <Stack>
          {/* FORM ERROR ALERT */}
          {formError && (
            <Alert
              variant="filled"
              color="red"
              title="Error"
              icon={<IconAlertCircle size={16} />}
              withCloseButton
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <Alert color="red" icon={<IconTrash size={16} />}>
            Are you sure you want to mark{" "}
            <b>{packageToDispose?.package_name}</b> as DISPOSED? This action
            cannot be undone.
          </Alert>

          {/* NEW: Locker Status Selector */}
          <Stack gap={4} mt="xs">
            <Text size="sm" fw={500}>
              Update Locker Capacity Status
            </Text>
            <SegmentedControl
              value={lockerCapacity}
              onChange={(val) =>
                setLockerCapacity(
                  val as "Empty" | "Normal" | "Near Full" | "Full",
                )
              }
              fullWidth
              data={[
                { label: "Empty", value: "Empty" },
                { label: "Normal", value: "Normal" },
                { label: "Near Full", value: "Near Full" },
                { label: "Full", value: "Full" },
              ]}
              color={(() => {
                if (lockerCapacity === "Full") return "red";
                if (lockerCapacity === "Near Full") return "orange";
                if (lockerCapacity === "Empty") return "gray";
                return "blue";
              })()}
            />
            <Text size="xs" c="dimmed">
              Since items are being disposed, you might want to set this to
              &quot;Normal&quot; or &quot;Empty&quot;.
            </Text>
          </Stack>

          <Group justify="flex-end" mt="md">
            <Button
              variant="default"
              onClick={() => setDisposeModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleSubmitDispose}
              loading={isDisposing}
            >
              Confirm Disposal
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
