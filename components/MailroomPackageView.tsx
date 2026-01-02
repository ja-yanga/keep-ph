"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconUser,
  IconMapPin,
  IconCalendar,
  IconLock,
  IconCreditCard,
  IconMail,
  IconPackage,
  IconScan,
  IconCopy,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import Link from "next/link";
import UserPackages from "./UserPackages";
import UserScans from "./UserScans";
import type { RawRow } from "@/utils/types";
import PrivateMainLayout from "./Layout/PrivateMainLayout";

function addMonths(iso?: string | null, months = 0): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export type MailroomPackageViewItem = RawRow | null;

type MailroomPackageViewProps = {
  item: MailroomPackageViewItem;
  loading: boolean;
  error: string | null;
  /**
   * Rename to indicate a Server Action or atomic action prop.
   * If you pass a client-side function from a parent, Next will error.
   * Either pass a Server Action here or omit the prop.
   */
  onRefreshAction?: () => Promise<void> | void;
};

export default function MailroomPackageView({
  item,
  loading,
  error,
  onRefreshAction,
}: MailroomPackageViewProps) {
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [isStorageFull, setIsStorageFull] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localItem, setLocalItem] = useState<MailroomPackageViewItem>(
    item ?? null,
  );

  useEffect(() => {
    setLocalItem(item ?? null);
  }, [item?.id, item]);

  const source = localItem ?? item;

  const firstOf = <T,>(v: T | T[] | undefined | null): T | null => {
    if (v === undefined || v === null) return null;
    return Array.isArray(v) ? ((v[0] as T) ?? null) : (v as T);
  };

  const getProp = <T,>(
    obj: Record<string, unknown> | null,
    key: string,
  ): T | undefined =>
    obj ? (obj[key] as unknown as T | undefined) : undefined;

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const getString = (
    obj: Record<string, unknown> | undefined,
    ...keys: string[]
  ): string | undefined => {
    if (!obj) return undefined;
    for (const k of keys) {
      const v = obj[k];
      if (typeof v === "string") return v;
      if (typeof v === "number") return String(v);
    }
    return undefined;
  };

  const src = (source as Record<string, unknown> | null) ?? null;
  const regId = getProp<string>(src, "id") ?? null;

  const [scans, setScans] = useState<
    Array<{ package_id?: string; file_url?: string }>
  >([]);
  const [scanMap, setScanMap] = useState<Record<string, string>>({});
  const [scansUsage, setScansUsage] = useState<{
    used_mb?: number;
    limit_mb?: number;
    percentage?: number;
  } | null>(null);

  const handleRefresh = async (): Promise<void> => {
    setRefreshKey((prev) => prev + 1);
    try {
      if (typeof onRefreshAction === "function") {
        const res = onRefreshAction();
        if (res !== undefined && res instanceof Promise) {
          await res;
        }
      }
    } catch (e) {
      console.warn("parent onRefresh failed", e);
    }

    const id =
      getProp<string>(src, "id") ??
      getProp<string>(
        (item ?? localItem) as Record<string, unknown> | null,
        "id",
      );
    if (id) {
      const fresh = await fetchRegistration(String(id));
      if (fresh) setLocalItem(fresh);
    }
  };

  const fetchRegistration = async (
    id?: string,
  ): Promise<MailroomPackageViewItem | null> => {
    if (!id) return null;
    try {
      const res = await fetch(
        `/api/mailroom/registrations/${encodeURIComponent(id)}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) return null;
      const json = await res.json().catch(() => null);
      const payload = (json?.data ?? json) as Record<string, unknown> | null;

      if (payload) {
        const usersTable = payload.users_table ?? payload.users ?? null;
        let userKyc: unknown = null;
        if (Array.isArray(usersTable)) {
          userKyc = usersTable[0]?.user_kyc_table ?? null;
        } else if (usersTable && typeof usersTable === "object") {
          userKyc =
            (usersTable as Record<string, unknown>)["user_kyc_table"] ?? null;
        }
        if (!userKyc && payload["user_kyc_table"]) {
          userKyc = payload["user_kyc_table"];
        }
      }

      return payload as MailroomPackageViewItem | null;
    } catch (e) {
      console.error("failed to fetch registration", e);
      return null;
    }
  };

  const plan = useMemo(() => {
    const rawPlan = (firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_plan_table",
      ),
    ) ??
      firstOf(
        getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
          src,
          "mailroom_plans",
        ),
      ) ??
      null) as Record<string, unknown> | null;

    const can_digitize =
      Boolean(getProp<boolean>(rawPlan, "mailroom_plan_can_digitize")) ||
      Boolean(getProp<boolean>(rawPlan, "can_digitize")) ||
      Boolean(getProp<boolean>(rawPlan, "canDigitize"));

    const can_receive_mail =
      Boolean(getProp<boolean>(rawPlan, "mailroom_plan_can_receive_mail")) ||
      Boolean(getProp<boolean>(rawPlan, "can_receive_mail"));

    const can_receive_parcels =
      Boolean(getProp<boolean>(rawPlan, "mailroom_plan_can_receive_parcels")) ||
      Boolean(getProp<boolean>(rawPlan, "can_receive_parcels"));

    const mailroom_plan_name =
      (rawPlan &&
        (getProp<string>(rawPlan, "mailroom_plan_name") ??
          getProp<string>(rawPlan, "name") ??
          getProp<string>(rawPlan, "plan_name"))) ??
      null;

    return {
      ...(rawPlan ?? {}),
      can_digitize,
      can_receive_mail,
      can_receive_parcels,
      mailroom_plan_name,
    } as {
      can_digitize?: boolean;
      can_receive_mail?: boolean;
      can_receive_parcels?: boolean;
      mailroom_plan_name?: string | null;
      name?: string;
      [key: string]: unknown;
    };
  }, [src]);

  useEffect(() => {
    const controller = new AbortController();
    const checkStorage = async (): Promise<void> => {
      if (!src?.id || !Boolean(plan.can_digitize)) return;
      try {
        const res = await fetch(`/api/user/scans?registrationId=${src.id}`, {
          credentials: "include",
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.usage) {
            setIsStorageFull(
              Boolean(data.usage.used_mb >= data.usage.limit_mb),
            );
          }
        }
      } catch (e) {
        if (e instanceof Error && e.name !== "AbortError") {
          console.error("Failed to check storage usage", e);
        }
      }
    };

    void checkStorage();
    return () => controller.abort();
  }, [src?.id, plan.can_digitize, refreshKey]);

  useEffect(() => {
    if (!src?.id || !Boolean(plan.can_digitize)) {
      setScans([]);
      setScanMap({});
      setScansUsage(null);
      return;
    }
    const controller = new AbortController();
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/user/scans?registrationId=${encodeURIComponent(String(regId))}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        if (!res.ok) return;
        const data = await res
          .json()
          .catch(() => ({}) as Record<string, unknown>);
        const arr = Array.isArray((data as Record<string, unknown>).scans)
          ? ((data as Record<string, unknown>).scans as Array<{
              package_id?: string;
              file_url?: string;
            }>)
          : [];
        const map: Record<string, string> = {};
        arr.forEach((s) => {
          if (s.package_id && s.file_url)
            map[String(s.package_id)] = String(s.file_url);
        });
        if (!mounted) return;
        setScans(arr);
        setScanMap(map);
        setScansUsage((data as Record<string, unknown>).usage ?? null);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError")
          console.error(err);
      } finally {
        // no-op
      }
    })();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [src?.id, plan.can_digitize, refreshKey]);

  const getFullAddressFromRaw = (
    raw:
      | {
          formatted_address?: string;
          mailroom_location_name?: string;
          mailroom_location_city?: string;
          mailroom_location_region?: string;
          mailroom_location_zip?: string;
          address_line?: string;
          name?: string;
          address?: string;
          city?: string;
          region?: string;
          postal?: string;
          [key: string]: unknown;
        }
      | Array<{ [key: string]: unknown }>
      | null
      | undefined,
  ): string | null => {
    if (!raw) return null;
    const loc = Array.isArray(raw)
      ? (raw[0] as Record<string, unknown>)
      : (raw as Record<string, unknown>);
    if (!loc) return null;
    if (
      typeof loc.formatted_address === "string" &&
      loc.formatted_address.trim()
    )
      return String(loc.formatted_address).trim();

    const parts: string[] = [];
    const name = (loc.mailroom_location_name ?? loc.name) as string | undefined;
    if (name) parts.push(String(name));
    const street = (loc.address_line ?? loc.address ?? loc.line1) as
      | string
      | undefined;
    if (street) parts.push(String(street));
    const city = (loc.mailroom_location_city ?? loc.city) as string | undefined;
    const province = (loc.mailroom_location_region ?? loc.region) as
      | string
      | undefined;
    const postal = (loc.mailroom_location_zip ?? loc.postal) as
      | string
      | undefined;
    const tail = [city, province, postal].filter(Boolean).join(", ");
    if (tail) parts.push(tail);
    const out = parts.filter(Boolean).join(", ").trim();
    return out || null;
  };

  const copyFullShippingAddress = async (): Promise<void> => {
    const code = getProp<string>(src, "mailroom_code") ?? "-";
    const loc =
      firstOf(
        getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
          src,
          "mailroom_location_table",
        ),
      ) ??
      firstOf(
        getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
          src,
          "mailroom_locations",
        ),
      ) ??
      getProp<Record<string, unknown> | null>(src, "location") ??
      null;
    const full =
      (getFullAddressFromRaw(loc) ??
        [loc?.address, loc?.city, loc?.region].filter(Boolean).join(", ")) ||
      null;
    const txt = `${code ? `${code} ` : ""}${full ?? ""}`.trim();
    if (!txt) {
      notifications.show({
        title: "Nothing to copy",
        message: "No full address available",
        color: "yellow",
      });
      return;
    }
    try {
      await navigator.clipboard.writeText(txt);
      notifications.show({
        title: "Copied",
        message: "Full shipping address copied to clipboard",
        color: "teal",
      });
    } catch (e: unknown) {
      console.error("copy failed", e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      notifications.show({
        title: "Copy failed",
        message: errorMessage,
        color: "red",
      });
    }
  };

  // normalize lockers shape once for rendering and lookup (avoid using unknown '{}' keys directly)
  const normalizedLockers = useMemo(() => {
    const raw = Array.isArray(src?.lockers) ? (src!.lockers as unknown[]) : [];
    return raw.map((L, i) => {
      const locker = L as Record<string, unknown>;
      const id = String(
        locker.location_locker_id ??
          locker.id ??
          (locker.location_locker as Record<string, unknown> | undefined)?.id ??
          `locker-${i}`,
      );
      const code = String(
        locker.location_locker_code ??
          (locker.location_locker as Record<string, unknown> | undefined)
            ?.location_locker_code ??
          (locker.location_locker as Record<string, unknown> | undefined)
            ?.code ??
          locker.locker_code ??
          (locker.locker as Record<string, unknown> | undefined)?.locker_code ??
          locker.code ??
          locker.name ??
          locker.label ??
          "—",
      );
      const status = String(locker.status ?? "Normal");
      return { id, code, status, raw: locker } as {
        id: string;
        code: string;
        status: string;
        raw: Record<string, unknown>;
      };
    });
  }, [src?.lockers]);

  // count of normalized lockers for UI display
  const lockerCount: number = normalizedLockers.length;

  const filteredPackages = useMemo(() => {
    let pkgs: unknown[] = [];
    const mailbox = getProp<unknown>(src, "mailbox_item_table");
    const packagesVal = getProp<unknown>(src, "packages");
    if (Array.isArray(mailbox)) {
      pkgs = mailbox;
    } else if (Array.isArray(packagesVal)) {
      pkgs = packagesVal;
    } else {
      pkgs = [];
    }
    if (!selectedLockerId) return pkgs;
    return pkgs.filter((p: unknown) => {
      const pp = p as Record<string, unknown>;
      if (!Array.isArray(src?.lockers)) return false;
      const ppLocker =
        (pp.locker as Record<string, unknown> | undefined) ?? undefined;
      const pkgLockerId = String(
        // prefer common shapes: locker_id, top-level location_locker_id, nested locker.location_locker_id or locker.id
        pp.locker_id ??
          pp.location_locker_id ??
          ppLocker?.location_locker_id ??
          ppLocker?.id ??
          "",
      );
      return normalizedLockers.some(
        (l) => l.id === selectedLockerId && l.id === pkgLockerId,
      );
    });
  }, [src, selectedLockerId, normalizedLockers]);

  const normalizedPackages = useMemo(() => {
    const arr = Array.isArray(filteredPackages) ? filteredPackages : [];
    return arr
      .map((p) => p as Record<string, unknown>)
      .map((p) => {
        // canonical id (mailbox items / mailbox_item_table shape)
        const rawId =
          getString(p as Record<string, unknown>, "mailbox_item_id") ??
          getString(p as Record<string, unknown>, "id");
        // locker id is location_locker_id on mailbox_item_table or location_locker_id at package level
        const lockerId =
          getString(p as Record<string, unknown>, "location_locker_id") ??
          getString(p as Record<string, unknown>, "locker_id") ??
          undefined;

        // mailbox_item_table (postgREST returns array or object) and direct mailbox_item_name/photo
        const mailboxItemTable =
          (p as Record<string, unknown>)["mailbox_item_table"] ??
          (p as Record<string, unknown>)["mailbox_item"] ??
          undefined;
        const mailboxItemName =
          getString(p as Record<string, unknown>, "mailbox_item_name") ??
          undefined;
        const mailboxItemPhoto =
          getString(p as Record<string, unknown>, "mailbox_item_photo") ??
          undefined;

        // normalize mailroom_file_table into package_files (schema: mailroom_file_*)
        const rawFiles = Array.isArray(
          (p as Record<string, unknown>)["mailroom_file_table"],
        )
          ? ((p as Record<string, unknown>)["mailroom_file_table"] as Record<
              string,
              unknown
            >[])
          : [];
        const packageFiles = rawFiles.map((f) => ({
          id: getString(f as Record<string, unknown>, "mailroom_file_id") ?? "",
          name:
            getString(f as Record<string, unknown>, "mailroom_file_name") ?? "",
          url:
            getString(f as Record<string, unknown>, "mailroom_file_url") ?? "",
          size_mb:
            Number(
              getString(f as Record<string, unknown>, "mailroom_file_size_mb"),
            ) || 0,
          mime_type:
            getString(
              f as Record<string, unknown>,
              "mailroom_file_mime_type",
            ) ?? "",
          type:
            getString(f as Record<string, unknown>, "mailroom_file_type") ?? "",
          uploaded_at:
            getString(
              f as Record<string, unknown>,
              "mailroom_file_uploaded_at",
            ) ?? "",
        }));

        return {
          ...p,
          id: rawId ? String(rawId) : undefined,
          locker_id: lockerId ?? undefined,
          // expose mailbox_item_table and mailbox fields per schema
          mailbox_item_table: mailboxItemTable,
          mailbox_item_name: mailboxItemName,
          mailbox_item_photo: mailboxItemPhoto,
          // prefer mailbox_item_photo, otherwise first mailroom_file url
          package_photo: mailboxItemPhoto ?? packageFiles[0]?.url ?? undefined,
          package_files: packageFiles.length > 0 ? packageFiles : undefined,
          received_at:
            getString(
              p as Record<string, unknown>,
              "mailbox_item_received_at",
            ) ??
            getString(
              p as Record<string, unknown>,
              "mailbox_item_created_at",
            ) ??
            undefined,
        } as Record<string, unknown>;
      })
      .filter(
        (p): p is Record<string, unknown> & { id: string } =>
          p != null && typeof p.id === "string" && p.id.length > 0,
      )
      .map(
        (p) =>
          p as {
            id: string;
            locker_id?: string;
            received_at?: string;
            created_at?: string;
            updated_at?: string;
            status?: string;
            package_photo?: string;
            package_files?: Array<{
              id: string;
              name: string;
              url: string;
              size_mb: number;
              mime_type: string;
              type: string;
              uploaded_at: string;
            }>;
            [key: string]: unknown;
          },
      );
  }, [filteredPackages]);

  // merge scans from backend API (scans state) with per-package mailroom_file entries
  const mergedScans = useMemo(() => {
    type LocalScan = {
      id: string;
      file_name: string;
      file_url: string;
      file_size_mb: number;
      uploaded_at: string;
      package?: { package_name: string };
    };

    const fromPackages: LocalScan[] = normalizedPackages.flatMap((p) => {
      const files =
        Array.isArray(p.package_files) && p.package_files.length > 0
          ? (p.package_files as Record<string, unknown>[])
          : [];
      const pkgName = isRecord(p.package)
        ? getString(p.package, "package_name")
        : getString(p, "package_name");
      const pkgObj = pkgName ? { package_name: String(pkgName) } : undefined;
      const topMailboxName =
        getString(
          p as Record<string, unknown>,
          "mailbox_item_name",
          "mailbox_item_title",
        ) ?? undefined;
      const mailboxTable = (p as Record<string, unknown>)["mailbox_item_table"];
      return files.map((f, i) => {
        const id =
          getString(f, "id", "mailroom_file_id") ?? `${p.id}-file-${i}`;
        const fileName = getString(f, "name", "mailroom_file_name") ?? "";
        const fileUrl = getString(f, "url", "mailroom_file_url") ?? "";
        const size =
          Number(getString(f, "size_mb", "mailroom_file_size_mb")) || 0;
        const uploaded =
          getString(f, "uploaded_at", "mailroom_file_uploaded_at") ??
          getString(p, "created_at") ??
          "";
        return {
          id: String(id),
          file_name: fileName,
          file_url: fileUrl,
          file_size_mb: size,
          uploaded_at: uploaded,
          package: pkgObj,
          // preserve mailbox item info so UserScans can derive mailbox_item_name
          mailbox_item_name: topMailboxName,
          mailbox_item_table: mailboxTable,
        };
      });
    });

    const fromApi: LocalScan[] =
      Array.isArray(scans) && scans.length > 0
        ? (scans as unknown[]).map((s) => {
            const r = isRecord(s) ? s : {};
            const id =
              getString(r, "id", "mailroom_file_id") ??
              `${Math.random().toString(36).slice(2)}`;
            const fileName =
              getString(r, "file_name", "mailroom_file_name") ?? "";
            const fileUrl = getString(r, "file_url", "mailroom_file_url") ?? "";
            const size =
              Number(getString(r, "file_size_mb", "mailroom_file_size_mb")) ||
              0;
            const uploaded =
              getString(r, "uploaded_at", "mailroom_file_uploaded_at") ?? "";
            const pkgName = isRecord(r.package)
              ? getString(r.package as Record<string, unknown>, "package_name")
              : getString(r, "package_name");
            const pkgObj = pkgName
              ? { package_name: String(pkgName) }
              : undefined;
            const topMailboxName =
              getString(
                r as Record<string, unknown>,
                "mailbox_item_name",
                "mailbox_item_title",
              ) ?? undefined;
            const mailboxTable = (r as Record<string, unknown>)[
              "mailbox_item_table"
            ];
            return {
              id: String(id),
              file_name: fileName,
              file_url: fileUrl,
              file_size_mb: size,
              uploaded_at: uploaded,
              package: pkgObj,
              mailbox_item_name: topMailboxName,
              mailbox_item_table: mailboxTable,
            };
          })
        : [];

    const map = new Map<string, LocalScan>();
    for (const sc of [...fromPackages, ...fromApi]) {
      const key = sc.file_url || sc.id;
      if (!map.has(key)) map.set(key, sc);
    }
    return Array.from(map.values());
  }, [normalizedPackages, scans]);

  const getLockerStatusColor = (status?: string | null): string => {
    if (status === "Full") return "red";
    if (status === "Near Full") return "orange";
    if (status === "Empty") return "gray";
    return "blue";
  };

  if (loading) {
    return (
      <PrivateMainLayout>
        <Container py="xl" size="xl">
          <Loader />
        </Container>
      </PrivateMainLayout>
    );
  }

  if (error || !item) {
    return (
      <PrivateMainLayout>
        <Container py="xl" size="xl">
          <Paper p="xl" radius="md" withBorder>
            <Stack align="center">
              <Text c="red" size="lg" fw={500}>
                {error ?? "Not found"}
              </Text>
              <Link href="/dashboard">
                <Button leftSection={<IconArrowLeft size={16} />}>
                  Back to Dashboard
                </Button>
              </Link>
            </Stack>
          </Paper>
        </Container>
      </PrivateMainLayout>
    );
  }

  const locations =
    firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_location_table",
      ),
    ) ??
    firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_locations",
      ),
    ) ??
    getProp<Record<string, unknown> | null>(src, "location") ??
    null;
  const locId =
    (locations && (locations as Record<string, unknown>)["id"]) ??
    getProp<string>(src, "location_id");
  const accountNumber = `U${String(getProp<string>(src, "user_id") ?? "u").slice(0, 8)}-L${String(locId ?? "l").slice(0, 8)}-M${String(getProp<string>(src, "id") ?? "").slice(0, 8)}`;

  const getSubscriptionExpiry = (s: unknown): string | null => {
    if (!s) return null;
    if (Array.isArray(s) && s.length > 0) {
      return String(
        (s[0] as Record<string, unknown>)?.subscription_expires_at ?? null,
      );
    }
    if (typeof s === "object") {
      return String(
        (s as Record<string, unknown>)?.subscription_expires_at ?? null,
      );
    }
    return null;
  };

  console.log("src", src);

  const expiry =
    getSubscriptionExpiry(getProp<unknown>(src, "subscription_table")) ??
    getProp<string>(src, "expiry_at") ??
    (getProp<string | number>(src, "months") &&
    getProp<string>(src, "created_at")
      ? addMonths(
          String(getProp<string>(src, "created_at")),
          Number(getProp<string | number>(src, "months")),
        )
      : null);

  const planObj = (firstOf(
    getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
      src,
      "mailroom_plan_table",
    ),
  ) ??
    firstOf(
      getProp<Record<string, unknown> | Record<string, unknown>[] | null>(
        src,
        "mailroom_plans",
      ),
    ) ??
    null) as Record<string, unknown> | null;

  const planName = String(
    (planObj &&
      ((planObj.mailroom_plan_name as string) ?? (planObj.name as string))) ??
      getProp<string>(src, "package_name") ??
      getProp<string>(src, "title") ??
      "Mailroom Package",
  );

  const items = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Mailroom Details", href: "#" },
  ].map((it, index) => (
    <Anchor href={it.href} key={index} component={Link} size="sm">
      {it.title}
    </Anchor>
  ));

  // precompute user name pieces to avoid deeply nested expressions in JSX
  const usersTable =
    getProp<Record<string, unknown> | null>(src, "users_table") ?? null;

  const rawKyc = usersTable
    ? (usersTable["user_kyc_table"] as
        | Record<string, unknown>
        | Record<string, unknown>[]
        | null)
    : null;

  // debug log removed
  const kyc = firstOf(rawKyc) as Record<string, unknown> | null;
  const firstName =
    getProp<string>(src, "first_name") ??
    (kyc ? (kyc["user_kyc_first_name"] as string | undefined) : undefined) ??
    null;
  const lastName =
    getProp<string>(src, "last_name") ??
    (kyc ? (kyc["user_kyc_last_name"] as string | undefined) : undefined) ??
    null;
  let fullNameValue: string | null = null;
  const rawFullName =
    getProp<string>(src, "full_name") ?? getProp<string>(src, "user_name");
  if (rawFullName) {
    fullNameValue = rawFullName;
  } else if (firstName || lastName) {
    fullNameValue =
      `${firstName ?? ""}${firstName && lastName ? " " : ""}${lastName ?? ""}`.trim();
  } else {
    fullNameValue = null;
  }

  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Stack gap="lg" mb="xl">
            <Breadcrumbs>{items}</Breadcrumbs>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Title order={2} c="dark.8">
                  {planName}
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Account #: {accountNumber}
                </Text>
              </Box>
              <Group>
                <Tooltip label="Refresh Data">
                  <ActionIcon variant="light" size="lg" onClick={handleRefresh}>
                    <IconRefresh size={20} />
                  </ActionIcon>
                </Tooltip>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    Back
                  </Button>
                </Link>
              </Group>
            </Group>
          </Stack>

          <Grid gutter="md">
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Paper p="md" radius="md" withBorder shadow="sm">
                      <Group>
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color="blue"
                        >
                          <IconCalendar size={20} />
                        </ThemeIcon>
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            Subscription Expiry
                          </Text>
                          <Text fw={700} size="lg">
                            {expiry
                              ? new Date(expiry).toLocaleDateString()
                              : "—"}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  </Grid.Col>

                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Paper p="md" radius="md" withBorder shadow="sm">
                      <Group>
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color={
                            getProp<string>(src, "locker_status")
                              ? "gray"
                              : "yellow"
                          }
                        >
                          <IconLock size={20} />
                        </ThemeIcon>
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            Locker Status
                          </Text>
                          <Badge
                            size="lg"
                            color={
                              getProp<string>(src, "locker_status")
                                ? "gray"
                                : "yellow"
                            }
                          >
                            {String(
                              getProp<string>(src, "locker_status") ?? "Active",
                            )}
                          </Badge>
                        </Box>
                      </Group>
                    </Paper>
                  </Grid.Col>
                </Grid>

                <Paper p="lg" radius="md" withBorder shadow="sm">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <IconLock size={20} color="gray" />
                      <Title order={4}>Assigned Lockers</Title>
                    </Group>
                    <Group>
                      {selectedLockerId && (
                        <Button
                          variant="subtle"
                          size="xs"
                          color="red"
                          onClick={() => setSelectedLockerId(null)}
                        >
                          Clear Filter
                        </Button>
                      )}
                      <Badge variant="light">
                        {String(lockerCount)} Assigned
                      </Badge>
                    </Group>
                  </Group>

                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Locker Code</Table.Th>
                        <Table.Th>Capacity Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {normalizedLockers.length > 0 ? (
                        normalizedLockers.map((L) => (
                          <Table.Tr
                            key={L.id}
                            style={{ cursor: "pointer" }}
                            bg={
                              selectedLockerId === L.id
                                ? "var(--mantine-color-blue-0)"
                                : undefined
                            }
                            onClick={() =>
                              setSelectedLockerId((curr) =>
                                curr === L.id ? null : L.id,
                              )
                            }
                          >
                            <Table.Td fw={500}>{L.code}</Table.Td>
                            <Table.Td>
                              <Badge
                                variant="light"
                                color={getLockerStatusColor(L.status)}
                              >
                                {L.status}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={2}>
                            <Text c="dimmed" size="sm">
                              No lockers assigned
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Paper>

                <UserPackages
                  packages={normalizedPackages}
                  lockers={normalizedLockers.map((l) => ({
                    id: l.id,
                    locker_code: l.code,
                  }))}
                  planCapabilities={{
                    can_receive_mail: Boolean(plan.can_receive_mail),
                    can_receive_parcels: Boolean(plan.can_receive_parcels),
                    can_digitize: Boolean(plan.can_digitize),
                  }}
                  isStorageFull={isStorageFull}
                  onRefreshAction={handleRefresh}
                  scanMap={scanMap}
                  scans={scans}
                />

                {plan.can_digitize && (
                  <UserScans
                    key={refreshKey}
                    scans={mergedScans ?? []}
                    usage={
                      scansUsage
                        ? {
                            used_mb: scansUsage.used_mb ?? 0,
                            limit_mb: scansUsage.limit_mb ?? 0,
                            percentage: scansUsage.percentage ?? 0,
                          }
                        : null
                    }
                  />
                )}
              </Stack>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="indigo">
                      <IconUser size={18} />
                    </ThemeIcon>
                    <Text fw={600}>User Details</Text>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Full Name
                      </Text>
                      <Text fw={500}>{String(fullNameValue ?? "—")}</Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Email
                      </Text>
                      <Text fw={500} style={{ wordBreak: "break-all" }}>
                        {String(
                          getProp<string>(src, "email") ??
                            (getProp<Record<string, unknown> | null>(
                              src,
                              "users_table",
                            )
                              ? getProp<string>(
                                  getProp<Record<string, unknown> | null>(
                                    src,
                                    "users_table",
                                  ) as Record<string, unknown>,
                                  "users_email",
                                )
                              : undefined) ??
                            "—",
                        )}
                      </Text>
                    </Box>
                    <Group grow>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Mobile
                        </Text>
                        <Text fw={500}>
                          {String(
                            getProp<string>(src, "mobile") ??
                              (getProp<Record<string, unknown> | null>(
                                src,
                                "users_table",
                              )
                                ? getProp<string>(
                                    getProp<Record<string, unknown> | null>(
                                      src,
                                      "users_table",
                                    ) as Record<string, unknown>,
                                    "mobile_number",
                                  )
                                : undefined) ??
                              "—",
                          )}
                        </Text>
                      </Box>
                    </Group>
                  </Stack>
                </Paper>

                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="orange">
                      <IconMapPin size={18} />
                    </ThemeIcon>
                    <Group>
                      <Text fw={600}>Location Details</Text>
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={copyFullShippingAddress}
                        title="Copy full shipping address"
                      >
                        <IconCopy size={14} />
                      </ActionIcon>
                    </Group>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Mailroom Code
                      </Text>
                      <Text fw={500} ff="monospace">
                        {String(
                          getProp<string>(src, "mailroom_code") ??
                            getProp<string>(
                              src,
                              "mailroom_registration_code",
                            ) ??
                            "—",
                        )}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Location Name
                      </Text>
                      <Text fw={500}>
                        {String(
                          (locations &&
                            (locations as Record<string, unknown>)[
                              "mailroom_location_name"
                            ]) ??
                            (locations &&
                              (locations as Record<string, unknown>)["name"]) ??
                            "—",
                        )}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Full Address
                      </Text>
                      <Text
                        fw={500}
                        size="sm"
                        style={{ wordBreak: "break-word" }}
                      >
                        {(getFullAddressFromRaw(locations) ??
                          [
                            (locations as Record<string, unknown>)?.address,
                            (locations as Record<string, unknown>)?.city,
                            (locations as Record<string, unknown>)?.region,
                          ]
                            .filter(Boolean)
                            .join(", ")) ||
                          "—"}
                      </Text>
                    </Box>
                  </Stack>
                </Paper>

                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="teal">
                      <IconCreditCard size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Plan Details</Text>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Plan Name
                      </Text>
                      <Text fw={500}>
                        {String(
                          (plan as Record<string, unknown>)
                            ?.mailroom_plan_name ??
                            (plan as Record<string, unknown>)?.name ??
                            getProp<string>(src, "plan") ??
                            "—",
                        )}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Date Created
                      </Text>
                      <Text fw={500}>
                        {getProp<string>(src, "created_at")
                          ? new Date(
                              String(getProp<string>(src, "created_at")),
                            ).toLocaleDateString()
                          : "—"}
                      </Text>
                    </Box>

                    <Box>
                      <Text size="xs" c="dimmed">
                        Billing
                      </Text>
                      <Text fw={500}>
                        {(() => {
                          const monthsVal = getProp<string | number>(
                            src,
                            "months",
                          );
                          if (!monthsVal) return "—";
                          return Number(monthsVal) >= 12 ? "Annual" : "Monthly";
                        })()}
                      </Text>
                    </Box>

                    <Group grow>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Registration Location
                        </Text>
                        <Text fw={500}>
                          {String(
                            (locations &&
                              (locations as Record<string, unknown>)[
                                "mailroom_location_name"
                              ]) ??
                              (locations &&
                                (locations as Record<string, unknown>)[
                                  "name"
                                ]) ??
                              "—",
                          )}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Expiry Date
                        </Text>
                        <Text fw={500}>
                          {expiry ? new Date(expiry).toLocaleDateString() : "—"}
                        </Text>
                      </Box>
                    </Group>

                    {(Boolean(plan.can_receive_mail) ||
                      Boolean(plan.can_receive_parcels) ||
                      Boolean(plan.can_digitize)) && (
                      <Box mt="xs">
                        <Text size="xs" c="dimmed" mb={6}>
                          Included Features
                        </Text>
                        <Group gap="xs">
                          {Boolean(plan.can_receive_mail) && (
                            <Tooltip label="Can Receive Mail" withArrow>
                              <ThemeIcon
                                variant="light"
                                color="blue"
                                size="md"
                                radius="md"
                              >
                                <IconMail size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                          {Boolean(plan.can_receive_parcels) && (
                            <Tooltip label="Can Receive Parcels" withArrow>
                              <ThemeIcon
                                variant="light"
                                color="orange"
                                size="md"
                                radius="md"
                              >
                                <IconPackage size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                          {Boolean(plan.can_digitize) && (
                            <Tooltip
                              label="Digital Scanning Included"
                              withArrow
                            >
                              <ThemeIcon
                                variant="light"
                                color="cyan"
                                size="md"
                                radius="md"
                              >
                                <IconScan size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid.Col>
          </Grid>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
