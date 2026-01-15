"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  Text,
  Title,
  Modal,
  Tabs,
  ThemeIcon,
  SimpleGrid,
  Box,
  Divider,
  TextInput,
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
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSession } from "@/components/SessionProvider";
import { fetchFromAPI } from "@/utils/fetcher";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import PackageActionModal from "./PackageActionModal";

type PackageShape = {
  id: string;
  registration_id?: string;
  mailbox_item_id?: string;
  mailbox_item_name?: string;
  mailbox_item_photo?: string | null;
  mailbox_item_type?: string;
  mailbox_item_table?: unknown;
  package?: { registration_id?: string; package_name?: string };
  package_name?: string;
  package_type?: string;
  package_photo?: string;
  package_files?: Array<{
    id?: string;
    url?: string;
    mailbox_item_id?: string;
  }>;
  mailbox_item_locker_code?: string;
  location_locker_code?: string;
  locker_id?: string;
  locker?: { locker_code?: string };
  status?: string;
  mailbox_item_status?: string;
  created_at?: unknown;
  updated_at?: unknown;
  received_at?: unknown;
  notes?: unknown;
  release_address_id?: string;
  release_to_name?: string;
  selected_address_id?: string;
  [key: string]: unknown;
};

type UserPackagesProps = {
  packages: PackageShape[];
  lockers: Array<{ id: string; locker_code?: string }>;
  planCapabilities: {
    can_receive_mail: boolean;
    can_receive_parcels: boolean;
    can_digitize: boolean;
  };
  isStorageFull?: boolean;
  onRefreshAction?: () => void | Promise<void>;
  scanMap?: Record<string, string>;
  scans?: Array<{
    package_id?: string;
    file_url?: string;
    mailbox_item_id?: string;
  }>;
};

export default function UserPackages({
  packages,
  lockers,
  planCapabilities,
  isStorageFull = false,
  onRefreshAction,
  scanMap: providedScanMap,
  scans: providedScans,
}: UserPackagesProps) {
  const theme = useMantineTheme();
  const [localPackages, setLocalPackages] = useState<PackageShape[]>(() =>
    normalizeIncomingPackages(packages),
  );
  const [search, setSearch] = useState("");
  const [scanMap, setScanMap] = useState<Record<string, string>>({});

  // UI state
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PackageShape | null>(
    null,
  );
  const [actionType, setActionType] = useState<
    "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED" | null
  >(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // preview
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string | null>(null);
  const [previewIsScan, setPreviewIsScan] = useState<boolean>(false);

  // pagination
  const [inboxPage, setInboxPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const perPage = 3;

  // addresses / release fields
  const [addresses, setAddresses] = useState<
    Array<{
      id: string;
      label?: string;
      contact_name?: string;
      line1?: string;
      city?: string;
      region?: string;
      postal?: string;
      is_default?: boolean;
      users?: Record<string, unknown> | null;
    }>
  >([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [releaseToName, setReleaseToName] = useState<string>("");

  const { session } = useSession();

  // pickup-on-behalf
  const [pickupOnBehalf, setPickupOnBehalf] = useState(false);
  const [behalfName, setBehalfName] = useState("");
  const [behalfMobile, setBehalfMobile] = useState("");
  const [behalfContactMode, setBehalfContactMode] = useState<
    "sms" | "viber" | "whatsapp"
  >("sms");
  const isBehalfMobileValid = /^09\d{9}$/.test(behalfMobile);

  // derive name helper (shared for handlers) — no `any`
  const deriveNameFromPackageRecord = (pkg: unknown): string => {
    if (!pkg || typeof pkg !== "object") return "";
    const p = pkg as Record<string, unknown>;

    const snap = p["release_to_name"] ?? p["releaseToName"];
    if (typeof snap === "string" && snap.trim()) return snap.trim();

    const pickUserObj = (): Record<string, unknown> | null => {
      const candidates = [
        p["user"],
        p["users"],
        p["user_data"],
        p["mailbox_item_user"],
        p["user_table"],
      ];
      for (const c of candidates) {
        if (c && typeof c === "object" && !Array.isArray(c)) {
          return c as Record<string, unknown>;
        }
      }
      return null;
    };

    const userObj = pickUserObj();

    const kyc =
      (userObj &&
        typeof userObj["user_kyc_table"] === "object" &&
        (userObj["user_kyc_table"] as Record<string, unknown>)) ??
      (typeof p["user_kyc_table"] === "object" &&
        (p["user_kyc_table"] as Record<string, unknown>));

    if (kyc) {
      const fn =
        (typeof kyc["user_kyc_first_name"] === "string" &&
          (kyc["user_kyc_first_name"] as string).trim()) ||
        (typeof kyc["user_kyc_firstname"] === "string" &&
          (kyc["user_kyc_firstname"] as string).trim()) ||
        "";
      const ln =
        (typeof kyc["user_kyc_last_name"] === "string" &&
          (kyc["user_kyc_last_name"] as string).trim()) ||
        (typeof kyc["user_kyc_lastname"] === "string" &&
          (kyc["user_kyc_lastname"] as string).trim()) ||
        "";
      if (fn || ln) return `${fn} ${ln}`.trim();
    }

    if (userObj) {
      const fn =
        (typeof userObj["first_name"] === "string" &&
          (userObj["first_name"] as string).trim()) ||
        (typeof userObj["users_first_name"] === "string" &&
          (userObj["users_first_name"] as string).trim()) ||
        "";
      const ln =
        (typeof userObj["last_name"] === "string" &&
          (userObj["last_name"] as string).trim()) ||
        (typeof userObj["users_last_name"] === "string" &&
          (userObj["users_last_name"] as string).trim()) ||
        "";
      const name = `${fn} ${ln}`.trim();
      if (name) return name;
    }

    const fnTop =
      typeof p["user_kyc_first_name"] === "string"
        ? (p["user_kyc_first_name"] as string).trim()
        : "";
    const lnTop =
      typeof p["user_kyc_last_name"] === "string"
        ? (p["user_kyc_last_name"] as string).trim()
        : "";
    if (fnTop || lnTop) return `${fnTop} ${lnTop}`.trim();

    const email =
      (typeof p["users_email"] === "string" &&
        (p["users_email"] as string).trim()) ||
      (typeof p["users_email_address"] === "string" &&
        (p["users_email_address"] as string).trim()) ||
      "";
    if (email) {
      const at = email.indexOf("@");
      return at > 0 ? email.slice(0, at) : email;
    }

    const mobile =
      typeof p["mobile_number"] === "string"
        ? (p["mobile_number"] as string).trim()
        : "";
    return mobile || "";
  };

  // type guard shared across the component (define once)
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  // fetch registration and return user_kyc first/last if available
  const fetchRegistrationKyc = async (
    regId: string,
  ): Promise<{ first: string; last: string } | null> => {
    if (!regId) return null;
    try {
      const json = await fetchFromAPI<Record<string, unknown>>(
        API_ENDPOINTS.mailroom.registration(regId),
      );
      const payload = (json?.data ?? json) as unknown;

      let reg: Record<string, unknown> | null = null;
      if (
        Array.isArray(payload) &&
        payload.length > 0 &&
        isRecord(payload[0])
      ) {
        reg = payload[0];
      } else if (isRecord(payload)) {
        reg = payload;
      } else {
        reg = null;
      }
      if (!reg || typeof reg !== "object") return null;

      const usersTable = reg.users_table ?? reg.users ?? null;

      let kyc: Record<string, unknown> | null = null;
      if (
        Array.isArray(usersTable) &&
        usersTable.length > 0 &&
        isRecord(usersTable[0])
      ) {
        const firstUser = usersTable[0] as Record<string, unknown>;
        if (isRecord(firstUser.user_kyc_table)) {
          kyc = firstUser.user_kyc_table as Record<string, unknown>;
        }
      } else if (isRecord(usersTable)) {
        const ut = usersTable as Record<string, unknown>;
        if (isRecord(ut.user_kyc_table)) {
          kyc = ut.user_kyc_table as Record<string, unknown>;
        }
      } else if (isRecord(reg.user_kyc_table)) {
        kyc = reg.user_kyc_table as Record<string, unknown>;
      }
      if (!kyc) return null;
      const first = String(kyc.user_kyc_first_name ?? "").trim();
      const last = String(kyc.user_kyc_last_name ?? "").trim();
      return { first, last };
    } catch {
      return null;
    }
  };

  // apply incoming scans or map if provided
  useEffect(() => {
    if (providedScanMap) {
      setScanMap(providedScanMap);
      return;
    }
    if (providedScans) {
      const map: Record<string, string> = {};
      const latestUploadedAt: Record<string, string> = {};

      providedScans.forEach((s) => {
        const item = s as Record<string, unknown>;
        const mailboxItemId = item["mailbox_item_id"] as string | undefined;
        const packageId = item["package_id"] as string | undefined;
        const url = (item["mailroom_file_url"] ?? item["file_url"]) as
          | string
          | undefined;
        const uploadedAt = item["mailroom_file_uploaded_at"] as
          | string
          | undefined;

        if (!url) return;

        const ids = [mailboxItemId, packageId].filter(Boolean) as string[];
        ids.forEach((id) => {
          if (
            !map[id] ||
            (uploadedAt &&
              (!latestUploadedAt[id] || uploadedAt > latestUploadedAt[id]))
          ) {
            map[id] = url;
            if (uploadedAt) latestUploadedAt[id] = uploadedAt;
          }
        });
      });
      setScanMap(map);
    }
  }, [providedScanMap, providedScans]);

  // keep localPackages merged with server packages but preserve optimistic markers
  useEffect(() => {
    const normalized = normalizeIncomingPackages(packages);
    setLocalPackages((prev) => {
      const prevMap = (prev ?? []).reduce<Record<string, PackageShape>>(
        (m, p) => {
          if (p.id) m[p.id] = p;
          return m;
        },
        {},
      );

      return normalized.map((p) => {
        const id = p.id;
        const prevEntry = id ? prevMap[id] : undefined;
        if (
          prevEntry &&
          (prevEntry as Record<string, unknown>).__pending_request
        ) {
          return prevEntry;
        }
        return p;
      });
    });
  }, [packages]);

  const toTime = (v: unknown): number => {
    if (v === undefined || v === null) return 0;
    const s =
      typeof v === "string" || typeof v === "number" || v instanceof Date
        ? v
        : String(v);
    const d = new Date(s as string | number | Date);
    const t = d.getTime();
    return Number.isFinite(t) ? t : 0;
  };

  const { activePackages, historyPackages } = useMemo(() => {
    const active: PackageShape[] = [];
    const history: PackageShape[] = [];

    localPackages.forEach((pkg) => {
      const pkgStatus = pkg.mailbox_item_status ?? pkg.status ?? "STORED";
      if (["RETRIEVED", "DISPOSED"].includes(pkgStatus)) {
        history.push(pkg);
      } else {
        active.push(pkg);
      }
    });

    active.sort((a, b) => toTime(b.created_at) - toTime(a.created_at));
    history.sort((a, b) => toTime(b.updated_at) - toTime(a.updated_at));

    return { activePackages: active, historyPackages: history };
  }, [localPackages]);

  const filteredActivePackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activePackages;
    return activePackages.filter((pkg) => {
      const name = (pkg.mailbox_item_name ?? pkg.package_name ?? "")
        .toString()
        .toLowerCase();
      const type = (pkg.mailbox_item_type ?? pkg.package_type ?? "")
        .toString()
        .toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [activePackages, search]);

  const filteredHistoryPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historyPackages;
    return historyPackages.filter((pkg) => {
      const name = (pkg.mailbox_item_name ?? pkg.package_name ?? "")
        .toString()
        .toLowerCase();
      const type = (pkg.mailbox_item_type ?? pkg.package_type ?? "")
        .toString()
        .toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [historyPackages, search]);

  // prepare address select options
  const addressSelectData = useMemo(() => {
    return addresses
      .filter((a) => Boolean(a && a.id))
      .map((a) => {
        const labelParts = [
          a.label || "Unnamed Address",
          a.line1,
          a.city,
          a.postal,
          a.is_default ? "(Default)" : "",
        ].filter(Boolean);
        return {
          value: String(a.id),
          label: labelParts.join(", "),
        };
      });
  }, [addresses]);

  // When user clicks an action button
  const handleActionClick = async (
    pkg: PackageShape,
    type: "RELEASE" | "DISPOSE" | "SCAN" | "CONFIRM_RECEIVED",
  ) => {
    setSelectedPackage(pkg);
    setActionType(type);

    // compute notes state
    let notesValue = "";
    if (type !== "RELEASE" && typeof pkg.notes === "string") {
      notesValue = pkg.notes;
    }
    setNotes(notesValue);

    // reset behalf state
    setPickupOnBehalf(false);
    setBehalfName("");
    setBehalfMobile("");
    setBehalfContactMode("sms");

    // parse existing notes for pickup-on-behalf
    try {
      const n = pkg.notes;
      if (typeof n === "string" && n.trim().startsWith("{")) {
        const parsed = JSON.parse(n) as Record<string, unknown> | null;
        if (parsed?.pickup_on_behalf) {
          setPickupOnBehalf(true);
          setBehalfName((parsed.name ?? "") as string);
          setBehalfMobile((parsed.mobile ?? "") as string);
          setBehalfContactMode(
            (parsed.contact_mode ?? "sms") as "sms" | "viber" | "whatsapp",
          );
        }
      }
    } catch {
      // ignore invalid notes
    }

    // For RELEASE, ensure addresses loaded and releaseToName prefilled
    if (type === "RELEASE") {
      const pkgRecord = pkg as Record<string, unknown>;
      const rawPkgDefault = (pkgRecord.release_address_id ??
        pkgRecord.releaseAddressId) as unknown;
      const pkgDefaultId =
        typeof rawPkgDefault === "string" && rawPkgDefault.trim()
          ? (rawPkgDefault as string)
          : null;

      if (addresses.length > 0) {
        const userDefaultId = !pkgDefaultId
          ? (addresses.find((a) => a.is_default)?.id ?? null)
          : null;
        setSelectedAddressId(pkgDefaultId ?? userDefaultId);

        let selectedName: string | undefined;
        const rawRelName =
          pkg.release_to_name ?? (pkg as Record<string, unknown>).releaseToName;
        if (typeof rawRelName === "string" && rawRelName.trim()) {
          selectedName = rawRelName.trim();
        } else {
          const found = addresses.find(
            (a) => a.id === (pkgDefaultId ?? userDefaultId),
          );
          if (
            found &&
            typeof found.contact_name === "string" &&
            found.contact_name.trim()
          ) {
            selectedName = found.contact_name.trim();
          }
        }

        const fallbackUserName =
          deriveNameFromPackageRecord(pkg as Record<string, unknown>) || "";
        // ensure prefill completed before opening modal (avoid render race)
        let resolved = selectedName ?? fallbackUserName;
        if (!resolved) {
          const regId = String(
            (pkg as Record<string, unknown>).mailroom_registration_id ??
              (pkg as Record<string, unknown>).registration_id ??
              "",
          );
          const k = await fetchRegistrationKyc(regId);
          if (k && (k.first || k.last))
            resolved = `${k.first} ${k.last}`.trim();
        }
        await Promise.resolve(); // ensure state queue (optional)
        setReleaseToName(resolved ?? "");
        // open modal after releaseToName set
        setActionModalOpen(true);
        return;
      }

      // fetch addresses if missing
      try {
        let userId: string | null = (pkg as Record<string, unknown>)["user"]
          ? ((
              (pkg as Record<string, unknown>)["user"] as Record<
                string,
                unknown
              >
            )["id"] as string | null)
          : null;
        userId =
          userId ??
          ((pkg as Record<string, unknown>)["user_id"] as string | null);
        if (!userId && session?.user?.id) userId = session.user.id;

        if (!userId && pkg.registration_id) {
          const r = await fetch(
            `/api/mailroom/registrations/${encodeURIComponent(
              String(pkg.registration_id),
            )}`,
            { credentials: "include" },
          );
          if (r.ok) {
            const j = await r.json().catch(() => null);
            userId = (j?.data?.user_id ?? j?.user_id ?? userId) as
              | string
              | null;
          }
        }

        if (!userId) {
          setAddresses([]);
          setActionModalOpen(true);
          return;
        }

        const addressUrl = API_ENDPOINTS.user.addresses();
        const json = await fetchFromAPI<Record<string, unknown>>(addressUrl);

        let rawArr: unknown[] = [];
        if (Array.isArray(json?.data)) rawArr = json.data;
        else if (Array.isArray(json)) rawArr = json;
        else rawArr = [];

        const normalized = rawArr

          .map((a: unknown) => {
            const obj = a as Record<string, unknown>;
            let usersObj: Record<string, unknown> | null = null;
            if (obj["users_table"] && typeof obj["users_table"] === "object") {
              usersObj = obj["users_table"] as Record<string, unknown>;
            } else if (obj["users"] && typeof obj["users"] === "object") {
              usersObj = obj["users"] as Record<string, unknown>;
            }

            return {
              id: String(obj.user_address_id ?? obj.id ?? ""),
              label: (obj.user_address_label as string | undefined) ?? "",
              contact_name:
                (obj.user_address_contact_name as string | undefined) ??
                (obj.contact_name as string | undefined) ??
                "",
              line1:
                (obj.user_address_line1 as string | undefined) ??
                (obj.line1 as string | undefined) ??
                "",
              line2:
                (obj.user_address_line2 as string | undefined) ??
                (obj.line2 as string | undefined) ??
                "",
              city:
                (obj.user_address_city as string | undefined) ??
                (obj.city as string | undefined) ??
                "",
              region:
                (obj.user_address_region as string | undefined) ??
                (obj.region as string | undefined) ??
                "",
              postal:
                (obj.user_address_postal as string | undefined) ??
                (obj.postal as string | undefined) ??
                "",
              is_default: Boolean(
                obj.user_address_is_default ?? obj.is_default,
              ),
              users: usersObj,
            };
          })
          .filter((a) => a.id);

        setAddresses(normalized);

        const userDefaultId = !pkgDefaultId
          ? (normalized.find((a) => a.is_default)?.id ?? null)
          : null;
        setSelectedAddressId(pkgDefaultId ?? userDefaultId);

        const chosenAddr = normalized.find(
          (a) => a.id === (pkgDefaultId ?? userDefaultId),
        );
        let resolvedName: string | undefined;

        const snap =
          pkg.release_to_name ?? (pkg as Record<string, unknown>).releaseToName;
        if (typeof snap === "string" && snap.trim()) {
          resolvedName = snap.trim();
        }

        if (
          !resolvedName &&
          chosenAddr &&
          typeof chosenAddr.contact_name === "string" &&
          chosenAddr.contact_name.trim()
        ) {
          resolvedName = chosenAddr.contact_name.trim();
        }

        if (
          !resolvedName &&
          chosenAddr?.users &&
          typeof chosenAddr.users === "object"
        ) {
          const u = chosenAddr.users as Record<string, unknown>;
          const kyc =
            u["user_kyc_table"] && typeof u["user_kyc_table"] === "object"
              ? (u["user_kyc_table"] as Record<string, unknown>)
              : undefined;
          const fn =
            kyc && typeof kyc["user_kyc_first_name"] === "string"
              ? (kyc["user_kyc_first_name"] as string).trim()
              : "";
          const ln =
            kyc && typeof kyc["user_kyc_last_name"] === "string"
              ? (kyc["user_kyc_last_name"] as string).trim()
              : "";
          if (fn || ln) resolvedName = `${fn} ${ln}`.trim();
          if (!resolvedName) {
            const fn2 =
              typeof u["first_name"] === "string"
                ? (u["first_name"] as string).trim()
                : "";
            const ln2 =
              typeof u["last_name"] === "string"
                ? (u["last_name"] as string).trim()
                : "";
            if (fn2 || ln2) resolvedName = `${fn2} ${ln2}`.trim();
            if (!resolvedName) {
              const email =
                typeof u["users_email"] === "string"
                  ? (u["users_email"] as string).trim()
                  : "";
              if (email) {
                const at = email.indexOf("@");
                resolvedName = at > 0 ? email.slice(0, at) : email;
              } else if (typeof u["mobile_number"] === "string") {
                resolvedName = (u["mobile_number"] as string).trim();
              }
            }
          }
        }

        if (!resolvedName) {
          resolvedName =
            deriveNameFromPackageRecord(pkg as Record<string, unknown>) ||
            undefined;
        }

        setReleaseToName(resolvedName ?? "");
      } catch {
        setAddresses([]);
      }
    }

    setActionModalOpen(true);
  };

  const submitAction = async () => {
    if (!selectedPackage || !actionType) {
      notifications.show({
        title: "Missing data",
        message: "No package selected",
        color: "red",
      });
      return;
    }

    const pkgId = String(
      selectedPackage.id ??
        selectedPackage.mailbox_item_id ??
        selectedPackage.package_id ??
        "",
    );
    if (!pkgId) {
      notifications.show({
        title: "Error",
        message: "Could not identify package",
        color: "red",
      });
      return;
    }

    let finalReleaseToName = releaseToName || "";
    if (actionType === "RELEASE") {
      if (!finalReleaseToName && selectedAddressId) {
        const sel = addresses.find((a) => a.id === selectedAddressId);
        if (
          sel &&
          typeof sel.contact_name === "string" &&
          sel.contact_name.trim()
        ) {
          finalReleaseToName = sel.contact_name.trim();
        }
      }

      if (!finalReleaseToName) {
        finalReleaseToName = deriveNameFromPackageRecord(
          selectedPackage as Record<string, unknown>,
        ).trim();
      }

      if (!finalReleaseToName) {
        const regId = String(
          (selectedPackage as Record<string, unknown>)
            ?.mailroom_registration_id ??
            (selectedPackage as Record<string, unknown>)?.registration_id ??
            (
              (selectedPackage as Record<string, unknown>)?.package as
                | Record<string, unknown>
                | undefined
            )?.registration_id ??
            "",
        );
        if (regId) {
          try {
            const r = await fetch(
              `/api/mailroom/registrations/${encodeURIComponent(regId)}`,
              { credentials: "include" },
            );
            if (r.ok) {
              const j = await r.json().catch(() => null);
              const regPayload = j?.data ?? j ?? null;
              if (regPayload && typeof regPayload === "object") {
                const nameFromReg = deriveNameFromPackageRecord(
                  regPayload as Record<string, unknown>,
                );
                if (nameFromReg) finalReleaseToName = nameFromReg.trim();
              }
            }
          } catch {
            // ignore registration fetch errors
          }
        }
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

      setReleaseToName(finalReleaseToName);
    }

    setSubmitting(true);

    try {
      let newStatus: string | null = null;
      if (actionType === "RELEASE") newStatus = "REQUEST_TO_RELEASE";
      if (actionType === "DISPOSE") newStatus = "REQUEST_TO_DISPOSE";
      if (actionType === "SCAN") newStatus = "REQUEST_TO_SCAN";
      if (actionType === "CONFIRM_RECEIVED") newStatus = "RETRIEVED";
      if (!newStatus) return;

      const body: Record<string, unknown> = { status: newStatus };
      if (actionType === "RELEASE") {
        body.selected_address_id = selectedAddressId ?? null;
        body.release_to_name = finalReleaseToName ?? null;
        body.notes = pickupOnBehalf
          ? JSON.stringify({
              pickup_on_behalf: true,
              name: behalfName,
              mobile: behalfMobile,
              contact_mode: behalfContactMode,
            })
          : null;
      } else if (actionType === "DISPOSE" || actionType === "SCAN") {
        body.notes = null;
      } else {
        body.notes = notes || null;
      }

      const url = API_ENDPOINTS.user.packages(pkgId);

      // optimistic local update and mark pending
      setLocalPackages((current) =>
        current.map((p) =>
          p.id === pkgId ||
          (p.mailbox_item_id && String(p.mailbox_item_id) === pkgId)
            ? {
                ...p,
                mailbox_item_status: newStatus,
                status: newStatus,
                mailbox_item_updated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                __pending_request: true,
                release_to_name:
                  (body.release_to_name as string) ?? p.release_to_name,
                selected_address_id:
                  (body.selected_address_id as string) ?? p.selected_address_id,
              }
            : p,
        ),
      );

      const serverJson = await fetchFromAPI<Record<string, unknown>>(url, {
        method: "PATCH",
        body,
      });
      const updatedFromServer =
        serverJson?.mailbox_item ?? serverJson?.data ?? serverJson ?? null;

      if (updatedFromServer && typeof updatedFromServer === "object") {
        const u = updatedFromServer as Record<string, unknown>;
        if (!u.id && (u.mailbox_item_id || u.id))
          u.id = u.mailbox_item_id ?? u.id;
        if (u.id) {
          applyUpdatedPackage({
            id: String(u.id),
            ...(u as Record<string, unknown>),
          });
          if (
            selectedPackage?.id === (u.mailbox_item_id ?? u.id) ||
            pkgId === (u.mailbox_item_id ?? u.id)
          ) {
            setSelectedPackage(
              (prev) => ({ ...(prev ?? {}), ...u }) as PackageShape,
            );
          }
        }
      } else {
        setLocalPackages((cur) =>
          cur.map((p) =>
            p.id === pkgId ||
            (p.mailbox_item_id && String(p.mailbox_item_id) === pkgId)
              ? {
                  ...p,
                  mailbox_item_status: newStatus,
                  status: newStatus,
                  mailbox_item_updated_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  release_to_name:
                    (body.release_to_name as string) ?? p.release_to_name,
                  selected_address_id:
                    (body.selected_address_id as string) ??
                    p.selected_address_id,
                }
              : p,
          ),
        );
        setSelectedPackage((prev) =>
          prev
            ? ({
                ...prev,
                mailbox_item_status: newStatus,
                status: newStatus,
                release_to_name:
                  (body.release_to_name as string) ?? prev.release_to_name,
                selected_address_id:
                  (body.selected_address_id as string) ??
                  prev.selected_address_id,
              } as PackageShape)
            : prev,
        );
      }

      setInboxPage(1);
      setHistoryPage(1);

      notifications.show({
        title: "Success",
        message: "Request submitted successfully",
        color: "green",
      });

      // attempt to refresh parent and then poll server in background to ensure server state applied
      const tryRefreshParent = async () => {
        if (!onRefreshAction) return;
        try {
          const r = onRefreshAction();
          if (r instanceof Promise) await r;
        } catch {
          // ignore refresh errors
        }
      };

      const pollForServerUpdate = async (
        pkgIdParam: string,
        expectedStatus: string,
        attempts = 6,
        intervalMs = 1000,
      ) => {
        for (let i = 0; i < attempts; i += 1) {
          await tryRefreshParent();
          // fetch fresh list as a fallback if parent didn't refresh
          try {
            const j = await fetchFromAPI<Record<string, unknown>>(
              API_ENDPOINTS.user.packages(),
            );
            const arr = (j?.data || j) as PackageShape[];

            if (Array.isArray(arr)) {
              const normalized = normalizeIncomingPackages(
                arr as PackageShape[],
              );
              setLocalPackages(normalized);
              const found = normalized.find((p) => getPkgId(p) === pkgIdParam);
              const srvStatus = found
                ? (found.mailbox_item_status ?? found.status)
                : undefined;
              if (srvStatus === expectedStatus) {
                if (found && found.id) applyUpdatedPackage(found);
                return true;
              }
            }
          } catch {
            // ignore fetch error
          }
          // wait then retry
          await new Promise((res) => setTimeout(res, intervalMs));
        }
        return false;
      };

      void pollForServerUpdate(pkgId, body.status as string);
      setActionModalOpen(false);
    } catch (err) {
      notifications.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Action failed",
        color: "red",
      });
      // revert optimistic marker
      setLocalPackages((cur) =>
        cur.map((p) =>
          p.id === (selectedPackage?.id ?? "")
            ? (() => {
                const copy = { ...p };
                delete (copy as Record<string, unknown>).__pending_request;
                return copy;
              })()
            : p,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const requestRescanFromModal = async (): Promise<void> => {
    if (!selectedPackage) return;
    setSubmitting(true);
    try {
      await fetchFromAPI(API_ENDPOINTS.user.packages(selectedPackage.id), {
        method: "PATCH",
        body: { status: "REQUEST_TO_SCAN" },
      });

      setLocalPackages((current) =>
        current.map((p) =>
          p.id === selectedPackage.id ? { ...p, status: "REQUEST_TO_SCAN" } : p,
        ),
      );
      notifications.show({
        title: "Rescan requested",
        message: "Your rescan request has been submitted to admin.",
        color: "green",
      });
      setImageModalOpen(false);
    } catch (err) {
      notifications.show({
        title: "Error",
        message:
          err instanceof Error ? err.message : "Failed to request rescan",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  function applyUpdatedPackage(updatedPkg: {
    id: string;
    [key: string]: unknown;
  }) {
    setLocalPackages((prev) =>
      prev.map((p) =>
        p.id === updatedPkg.id
          ? {
              ...p,
              ...(updatedPkg as Record<string, unknown>),
              __pending_request: undefined,
            }
          : p,
      ),
    );
  }

  const PackageCard = ({ pkg }: { pkg: PackageShape }) => {
    const isPending = Boolean(
      (pkg as Record<string, unknown>).__pending_request,
    );
    const tryString = (v: unknown): string | null =>
      typeof v === "string" && v.trim().length > 0 ? v : null;

    const topMailboxName = tryString(pkg.mailbox_item_name);
    let packageName = topMailboxName ?? tryString(pkg.package_name) ?? "—";

    const mb = pkg.mailbox_item_table;
    if (!topMailboxName && mb && typeof mb === "object") {
      const arr = Array.isArray(mb) ? (mb as Array<unknown>) : [mb];
      if (arr.length > 0 && typeof arr[0] === "object") {
        const first = arr[0] as Record<string, unknown>;
        packageName =
          tryString(first.mailbox_item_name) ??
          tryString(first.mailbox_item_title) ??
          tryString(first.name) ??
          packageName;
      }
    }

    const type = pkg.package_type ?? pkg.mailbox_item_type ?? "Parcel";
    const status = pkg.mailbox_item_status ?? pkg.status ?? "STORED";
    const receivedDate = pkg.received_at;
    const isDocument = type === "Document";

    let lockerCode =
      pkg.locker?.locker_code ??
      pkg.location_locker_code ??
      pkg.mailbox_item_locker_code;
    if (!lockerCode && pkg.locker_id && Array.isArray(lockers)) {
      const assigned = lockers.find((l) => l.id === pkg.locker_id);
      if (assigned) lockerCode = assigned.locker_code;
    }

    // Check for scans in mailroom_file_table if embedded in the package
    const embeddedFiles = (pkg as Record<string, unknown>).mailroom_file_table;
    let embeddedScanUrl: string | null = null;
    if (Array.isArray(embeddedFiles)) {
      type MailroomFile = {
        mailroom_file_type: string;
        mailroom_file_url: string;
        mailroom_file_uploaded_at: string;
      };
      // Find the latest SCANNED file
      const scannedFiles = (embeddedFiles as MailroomFile[])
        .filter((f) => f?.mailroom_file_type === "SCANNED")
        .sort(
          (a, b) =>
            new Date(b.mailroom_file_uploaded_at).getTime() -
            new Date(a.mailroom_file_uploaded_at).getTime(),
        );
      if (scannedFiles.length > 0) {
        embeddedScanUrl = scannedFiles[0].mailroom_file_url;
      }
    }

    const scanUrl =
      embeddedScanUrl ??
      ((pkg as Record<string, unknown>).scan_url as string | undefined) ??
      ((pkg as Record<string, unknown>).digital_scan_url as
        | string
        | undefined) ??
      ((pkg as Record<string, unknown>).scanned_file_url as
        | string
        | undefined) ??
      scanMap[pkg.id] ??
      scanMap[String(pkg.mailbox_item_id)] ??
      scanMap[String(pkg.package_id)] ??
      null;

    // prefer current schema fields for release proof; fallback removed
    const getString = (v: unknown): string | null =>
      typeof v === "string" && v.trim() ? v : null;

    // only use mailroom files that are explicitly marked RELEASED
    const rawMailroomFiles =
      (pkg as Record<string, unknown>).mailroom_file_table ??
      (pkg as Record<string, unknown>).mailroom_files;
    let mailroomReleaseUrl: string | null = null;
    if (Array.isArray(rawMailroomFiles) && rawMailroomFiles.length > 0) {
      const recs = rawMailroomFiles
        .filter((r) => r && typeof r === "object")
        .map((r) => r as Record<string, unknown>);
      const released = recs.find(
        (r) => String(r.mailroom_file_type ?? "").toUpperCase() === "RELEASED",
      );
      if (released) {
        mailroomReleaseUrl = getString(released.mailroom_file_url);
      }
    }

    // show proof only when there's an explicit RELEASED mailroom file
    const releaseProofUrl: string | null = mailroomReleaseUrl;

    let statusColor = "blue";
    if (["RELEASED", "RETRIEVED"].includes(status)) {
      statusColor = "green";
    } else if (status === "DISPOSED") {
      statusColor = "red";
    } else if (String(status).includes("REQUEST")) {
      const s = String(status).toUpperCase();
      if (s.includes("DISPOSE")) statusColor = "red";
      else if (s.includes("RELEASE")) statusColor = "green";
      else if (s.includes("SCAN")) statusColor = "blue";
      else statusColor = "orange";
    }

    // Helper to ensure image URL is always a full URL
    const ensureFullUrl = (
      urlOrPath: string | undefined | null,
    ): string | undefined => {
      if (!urlOrPath) return undefined;
      const str = String(urlOrPath).trim();
      if (!str) return undefined;

      // If it's already a full URL (starts with http:// or https://), return as is
      if (str.startsWith("http://") || str.startsWith("https://")) {
        return str;
      }

      // Otherwise, it's a path - construct the full URL
      const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
      const bucket = "PACKAGES-PHOTO";
      // Remove leading slash if present
      const cleanPath = str.startsWith("/") ? str.slice(1) : str;
      return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath}`;
    };

    const smallImageSrc =
      ensureFullUrl(pkg.mailbox_item_photo as string | undefined) ??
      ensureFullUrl(pkg.package_photo as string | undefined) ??
      ensureFullUrl(
        (pkg.package_files && pkg.package_files[0]?.url) as string | undefined,
      );

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

        {smallImageSrc && (
          <Box
            mb="sm"
            style={{
              width: 140,
              height: 96,
              margin: "0 auto",
              position: "relative",
            }}
          >
            <Image
              src={smallImageSrc}
              alt="Package photo"
              fill
              style={{ objectFit: "cover", borderRadius: 8, cursor: "pointer" }}
              unoptimized
              onClick={() => {
                setSelectedPackage(pkg);
                setPreviewTitle("Package Photo");
                setPreviewImage(smallImageSrc);
                setPreviewIsScan(false);
                setImageModalOpen(true);
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
                {lockerCode ?? "—"}
              </Text>
            </Group>
          </Box>
          <Box ta="right">
            <Text size="xs" c="dimmed">
              Received
            </Text>
            <Text size="sm" fw={500}>
              {receivedDate
                ? new Date(receivedDate as string).toLocaleDateString()
                : "—"}
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
                onClick={() => handleActionClick(pkg, "DISPOSE")}
              >
                Dispose
              </Button>
            </SimpleGrid>

            {isPending && (
              <Text size="xs" c="orange" ta="center" mt="xs">
                Request is being processed by admin.
              </Text>
            )}

            {isDocument && planCapabilities.can_digitize && (
              <Stack gap="xs">
                {scanUrl && (
                  <Button
                    variant="default"
                    color="violet"
                    fullWidth
                    size="xs"
                    leftSection={<IconEye size={14} />}
                    onClick={() => {
                      setSelectedPackage(pkg);
                      setPreviewTitle("View Scan");
                      setPreviewImage(scanUrl);
                      setPreviewIsScan(true);
                      setImageModalOpen(true);
                    }}
                  >
                    View Scan
                  </Button>
                )}
                {!isPending && (
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

            {releaseProofUrl && (
              <Button
                size="sm"
                variant="default"
                leftSection={<IconEye size={14} />}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setPreviewTitle("Proof of Release");
                  setPreviewImage(releaseProofUrl);
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

        {(String(status).includes("REQUEST") || isPending) && (
          <Text size="xs" c="orange" ta="center" mt="xs">
            Request is being processed by admin.
          </Text>
        )}
      </Paper>
    );
  };

  useEffect(() => {
    setLocalPackages(normalizeIncomingPackages(packages));
  }, [packages]);

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
                    start + perPage,
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
                    start + perPage,
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

      <PackageActionModal
        opened={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        actionType={actionType}
        selectedPackage={selectedPackage}
        addresses={addresses}
        addressSelectData={addressSelectData}
        selectedAddressId={selectedAddressId}
        setSelectedAddressId={setSelectedAddressId}
        releaseToName={releaseToName}
        setReleaseToName={setReleaseToName}
        pickupOnBehalf={pickupOnBehalf}
        setPickupOnBehalf={setPickupOnBehalf}
        behalfName={behalfName}
        setBehalfName={setBehalfName}
        behalfMobile={behalfMobile}
        setBehalfMobile={setBehalfMobile}
        behalfContactMode={behalfContactMode}
        setBehalfContactMode={setBehalfContactMode}
        isBehalfMobileValid={isBehalfMobileValid}
        submitting={submitting}
        submitAction={submitAction}
      />

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
              <Box
                style={{ width: "100%", height: "70vh", position: "relative" }}
              >
                <Image
                  src={previewImage}
                  alt={previewTitle ?? "Preview"}
                  fill
                  style={{ objectFit: "contain", borderRadius: 8 }}
                  unoptimized
                />
              </Box>
            )}

            <Group justify="flex-end" mt="sm" gap="xs">
              {previewIsScan && (
                <Button
                  size="xs"
                  color="violet"
                  onClick={requestRescanFromModal}
                  loading={submitting}
                  disabled={(() => {
                    const selStatus = (selectedPackage?.mailbox_item_status ??
                      selectedPackage?.status) as string | undefined;
                    return (
                      typeof selStatus === "string" &&
                      selStatus.includes("REQUEST")
                    );
                  })()}
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

// Helper: canonical id and normalization
const getPkgId = (p: Record<string, unknown> | undefined): string =>
  String(
    p?.id ?? p?.mailbox_item_id ?? p?.mailboxItemId ?? p?.package_id ?? "",
  );

const normalizeIncomingPackages = (arr?: PackageShape[]) =>
  (Array.isArray(arr) ? arr : []).map((p) => ({
    ...p,
    id: String(
      (p as Record<string, unknown>).id ??
        (p as Record<string, unknown>).mailbox_item_id ??
        "",
    ),
    mailbox_item_status:
      (p as Record<string, unknown>).mailbox_item_status ??
      (p as Record<string, unknown>).status ??
      "STORED",
  })) as PackageShape[];
