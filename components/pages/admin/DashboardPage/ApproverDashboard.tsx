"use client";

import { useState, useEffect, useMemo, memo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Paper,
  Text,
  Group,
  ThemeIcon,
  Title,
  Badge,
  Center,
  SimpleGrid,
  Stack,
  Button,
  Skeleton,
  Loader,
} from "@mantine/core";

// Lazy load AdminTable - only loads when table section is visible
const AdminTable = dynamic(
  () => import("@/components/common/AdminTable").then((mod) => mod.AdminTable),
  {
    ssr: false,
    loading: () => (
      <Center h={150}>
        <Skeleton height={24} width="60%" />
      </Center>
    ),
  },
);

// Import icons statically - tree-shaking removes unused
import {
  IconBox,
  IconAlertCircle,
  IconArrowRight,
  IconPackage,
  IconRefresh,
  IconId,
  IconGift,
} from "@tabler/icons-react";

import { type DataTableColumn } from "mantine-datatable";
import { useMediaQuery, useIntersection } from "@mantine/hooks";
import { fetcher, getStatusFormat } from "@/utils/helper";
import { StatCard } from "./StatCard";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { AdminDashboardStats } from "@/utils/types";
import { startRouteProgress } from "@/lib/route-progress";

type ApproverDashboardStats = {
  stats: AdminDashboardStats;
  kyc_pending_count: number;
  rewards_pending_count: number;
};

type PackageRow = AdminDashboardStats["recentPackages"][0];

// Optimized date formatter
function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  try {
    const dt = new Date(iso);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }).format(dt);
  } catch {
    return iso;
  }
}

// Minimal loading skeleton - renders immediately
const LoadingSkeleton = memo(() => (
  <Stack
    gap="xl"
    role="status"
    aria-live="polite"
    aria-label="Loading dashboard data"
  >
    <Group justify="space-between" align="flex-end">
      <div>
        <Skeleton h={32} w={200} mb="xs" />
        <Skeleton h={16} w={300} />
      </div>
      <Skeleton h={36} w={120} />
    </Group>
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} h={120} radius="lg" />
      ))}
    </SimpleGrid>
  </Stack>
));
LoadingSkeleton.displayName = "LoadingSkeleton";

const ErrorState = memo(
  ({ onRetry, loading }: { onRetry: () => void; loading: boolean }) => (
    <Center h={400} role="alert" aria-live="polite">
      <Stack align="center" gap="xs">
        <IconAlertCircle
          size={48}
          color="var(--mantine-color-gray-4)"
          aria-hidden="true"
        />
        <Text c="dimmed" fw={500}>
          Failed to load dashboard data.
        </Text>
        <Button
          variant="light"
          onClick={onRetry}
          disabled={loading}
          aria-label="Retry loading dashboard data"
        >
          Retry
        </Button>
      </Stack>
    </Center>
  ),
);
ErrorState.displayName = "ErrorState";

export default function ApproverDashboard({
  initialData,
}: {
  initialData?: AdminDashboardStats | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");

  const isMobile = useMediaQuery("(max-width: 48em)", undefined, {
    getInitialValueInEffect: false,
  });

  const { ref: tableRef, entry } = useIntersection({
    rootMargin: "200px",
    threshold: 0.1,
  });

  const [wasTableVisible, setWasTableVisible] = useState(false);

  useEffect(() => {
    if (entry?.isIntersecting) {
      setWasTableVisible(true);
    }
  }, [entry?.isIntersecting]);

  const {
    data,
    error,
    isValidating: isRefreshingSWR,
  } = useSWR<ApproverDashboardStats | undefined | null>(
    API_ENDPOINTS.admin.approverStats,
    fetcher,
    {
      fallbackData: initialData
        ? {
            stats: initialData,
            kyc_pending_count: 0,
            rewards_pending_count: 0,
          }
        : undefined,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
      focusThrottleInterval: 5000,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    const now = new Date();
    setCurrentDate(
      new Intl.DateTimeFormat(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(now),
    );
    setDateTime(now.toISOString().slice(0, 10));
  }, []);

  // Show initial data immediately if available
  const hasInitialData = !!initialData;
  const loading = !data && !error && !hasInitialData;
  const stats: AdminDashboardStats | null = data?.stats ?? initialData ?? null;
  const pendingKycCount = data?.kyc_pending_count ?? 0;
  const pendingRewardCount = data?.rewards_pending_count ?? 0;

  const tableColumns = useMemo<DataTableColumn<unknown>[]>(
    () => [
      {
        accessor: "package_name",
        title: "Package Name",
        render: (rec: unknown) => {
          const pkg = rec as PackageRow;
          return (
            <Text fw={700} c="dark.7" size="sm">
              {pkg?.package_name ?? "—"}
            </Text>
          );
        },
      },
      {
        accessor: "package_type",
        title: "Type",
        render: (rec: unknown) => {
          const pkg = rec as PackageRow;
          return (
            <Badge
              size="md"
              variant="transparent"
              color="dark"
              aria-label={`Package type: ${pkg?.package_type || "unknown"}`}
            >
              {pkg?.package_type ?? "—"}
            </Badge>
          );
        },
      },
      {
        accessor: "status",
        title: "Status",
        render: (rec: unknown) => {
          const pkg = rec as PackageRow;
          return (
            <Badge
              size="md"
              radius="md"
              variant="dot"
              color={getStatusFormat(pkg?.status ?? undefined)}
              aria-label={`Package status: ${pkg?.status?.replace(/_/g, " ") ?? "unknown"}`}
            >
              {pkg?.status?.replace(/_/g, " ") ?? "—"}
            </Badge>
          );
        },
      },
      {
        accessor: "received_at",
        title: "Received",
        textAlign: "right" as const,
        render: (rec: unknown) => {
          const pkg = rec as PackageRow;
          return (
            <Text size="sm" fw={600} c="dark.7">
              {pkg?.received_at ? (
                <time dateTime={pkg.received_at}>
                  {formatDateTime(pkg.received_at)}
                </time>
              ) : (
                "—"
              )}
            </Text>
          );
        },
      },
    ],
    [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await swrMutate(API_ENDPOINTS.admin.approverStats);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewFullInventory = () => {
    startRouteProgress();
    router.push("/admin/packages");
  };

  const [isTableReady, setIsTableReady] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== "undefined" && "requestIdleCallback" in window) {
        requestIdleCallback(() => setIsTableReady(true));
      } else {
        setIsTableReady(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error && !hasInitialData) {
    return (
      <ErrorState
        onRetry={handleRefresh}
        loading={refreshing || isRefreshingSWR}
      />
    );
  }

  if (!stats) {
    return (
      <Center h={400} role="alert" aria-live="polite">
        <Stack align="center" gap="xs">
          <IconAlertCircle
            size={48}
            color="var(--mantine-color-gray-4)"
            aria-hidden="true"
          />
          <Text c="dimmed" fw={500}>
            No dashboard data available.
          </Text>
          <Button
            variant="light"
            onClick={handleRefresh}
            disabled={refreshing || isRefreshingSWR}
            aria-label="Try refreshing dashboard data"
          >
            Try Refreshing
          </Button>
        </Stack>
      </Center>
    );
  }

  const recent = stats.recentPackages ?? [];

  return (
    <Stack gap="xl" role="main" aria-label="Dashboard overview">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={1} fw={900} c="dark.5" lts="-0.02em">
            Dashboard Overview
          </Title>
          <Text c="dark.7" size="sm" fw={500}>
            Welcome back. Here is what&apos;s happening today,{" "}
            {currentDate ? (
              <time dateTime={dateTime} suppressHydrationWarning>
                {currentDate}
              </time>
            ) : (
              <span suppressHydrationWarning>today</span>
            )}
          </Text>
        </div>
        <Button
          variant="default"
          leftSection={<IconRefresh size={16} aria-hidden="true" />}
          loading={refreshing || isRefreshingSWR}
          onClick={handleRefresh}
          disabled={refreshing || isRefreshingSWR}
          aria-label="Refresh dashboard data"
        >
          Refresh Data
        </Button>
      </Group>

      <SimpleGrid
        cols={{ base: 1, sm: 2, md: 4 }}
        spacing="lg"
        role="region"
        aria-label="Statistics summary"
      >
        <StatCard
          href="/admin/packages"
          title="Inventory"
          value={stats.storedPackages}
          description="Packages currently stored"
          icon={IconBox}
          color="blue"
          aria-label={`${stats.storedPackages} packages in inventory`}
        />
        <StatCard
          href="/admin/packages?tab=requests"
          title="Package Requests"
          value={stats.pendingRequests}
          description="Requires immediate action"
          icon={IconAlertCircle}
          color="red"
          aria-label={`${stats.pendingRequests} pending requests requiring action`}
        />
        <StatCard
          href="/admin/kyc?status=SUBMITTED"
          title="KYC Requests"
          value={pendingKycCount}
          description="For review & approval"
          icon={IconId}
          color="grape"
          aria-label={`${pendingKycCount} KYC requests pending`}
        />
        <StatCard
          href="/admin/rewards"
          title="Rewards Claim Requests"
          value={pendingRewardCount}
          description="Pending reward claims"
          icon={IconGift}
          color="orange"
          aria-label={`${pendingRewardCount} rewards claims pending`}
        />
      </SimpleGrid>

      <Paper
        ref={tableRef}
        withBorder
        p="xl"
        radius="lg"
        shadow="sm"
        role="region"
        aria-labelledby="recent-packages-heading"
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "500px",
          minHeight: "300px",
        }}
      >
        <Group justify="space-between" mb="xl">
          <Group gap="sm">
            <ThemeIcon
              variant="gradient"
              gradient={{ from: "gray.1", to: "gray.2", deg: 180 }}
              size="lg"
              radius="md"
              aria-hidden="true"
            >
              <IconPackage size={20} color="var(--mantine-color-dark-3)" />
            </ThemeIcon>
            <div>
              <Title order={2} fw={800} size="h4" id="recent-packages-heading">
                Recent Packages
              </Title>
              <Text size="xs" c="dark.4" fw={500}>
                Latest arrivals and updates
              </Text>
            </div>
          </Group>
          <Button
            variant="outline"
            color="dark"
            size="xs"
            radius="md"
            rightSection={<IconArrowRight size={14} aria-hidden="true" />}
            onClick={handleViewFullInventory}
            aria-label="View all packages"
          >
            View Full Inventory
          </Button>
        </Group>

        <div aria-live="polite" aria-atomic="true">
          {(isMobile ? wasTableVisible : true) && isTableReady ? (
            <AdminTable
              records={recent}
              aria-label="Recent packages"
              columns={tableColumns}
              noRecordsText="No recent activity found"
              minHeight={300}
              noRecordsIcon={
                <IconPackage
                  size={32}
                  color="var(--mantine-color-gray-3)"
                  aria-hidden="true"
                />
              }
            />
          ) : (
            <Center h={150}>
              <Loader size="sm" />
            </Center>
          )}
        </div>
      </Paper>
    </Stack>
  );
}
