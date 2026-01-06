"use client";

import { useState, useMemo, useEffect } from "react";
import {
  ActionIcon,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import { IconArrowLeft, IconRefresh } from "@tabler/icons-react";
import Link from "next/link";
import type {
  MailroomPackageViewItem,
  MailroomPackageViewProps,
} from "@/utils/types";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import MailroomLoading from "./components/MailroomLoading";
import MailroomError from "./components/MailroomError";
import MailroomMainContent from "./components/MailroomMainContent";
import MailroomSidebar from "./components/MailroomSidebar";
import {
  addMonths,
  firstOf,
  getProp,
  getString,
  getSubscriptionExpiry,
  isRecord,
} from "./utils";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

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

  const fetchRegistration = async (
    id?: string,
  ): Promise<MailroomPackageViewItem | null> => {
    if (!id) return null;
    try {
      const res = await fetch(API_ENDPOINTS.mailroom.registration(id), {
        credentials: "include",
      });
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
        const res = await fetch(
          `${API_ENDPOINTS.user.scans}?registrationId=${src.id}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
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
          `${API_ENDPOINTS.user.scans}?registrationId=${encodeURIComponent(String(regId))}`,
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
  }, [src?.id, plan.can_digitize, refreshKey, regId]);

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
      mailbox_item_name?: string;
      mailbox_item_table?: unknown;
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

  const content = (() => {
    if (loading) return <MailroomLoading />;
    if (error || !item) return <MailroomError error={error} />;

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
                    <ActionIcon
                      variant="light"
                      size="lg"
                      onClick={handleRefresh}
                    >
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
                <MailroomMainContent
                  src={src}
                  expiry={expiry}
                  lockerCount={lockerCount}
                  normalizedLockers={normalizedLockers}
                  selectedLockerId={selectedLockerId}
                  setSelectedLockerId={setSelectedLockerId}
                  normalizedPackages={normalizedPackages}
                  plan={plan}
                  isStorageFull={isStorageFull}
                  handleRefresh={handleRefresh}
                  scanMap={scanMap}
                  scans={scans}
                  refreshKey={refreshKey}
                  mergedScans={mergedScans}
                  scansUsage={scansUsage}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <MailroomSidebar
                  src={src}
                  fullNameValue={fullNameValue}
                  locations={locations}
                  plan={plan}
                  expiry={expiry}
                />
              </Grid.Col>
            </Grid>
          </Container>
        </main>
      </PrivateMainLayout>
    );
  })();

  return content;
}
