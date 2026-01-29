"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { useRouter } from "next/navigation";
import {
  Paper,
  Text,
  Group,
  Center,
  SimpleGrid,
  Stack,
  Button,
  Skeleton,
  Loader,
  Badge,
} from "@mantine/core";
import { type DataTableColumn } from "mantine-datatable";
import { IconAlertCircle } from "@tabler/icons-react";
import { useMediaQuery, useIntersection } from "@mantine/hooks";
import dayjs from "dayjs";
import { fetcher, getStatusFormat } from "@/utils/helper";
import { DashboardHeader } from "./DashboardHeader";
import { DashboardStatsGrid } from "./DashboardStatsGrid";
import { RecentPackagesSection } from "./RecentPackagesSection";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import type { AdminDashboardStats } from "@/utils/types";
import { startRouteProgress } from "@/lib/route-progress";
import ActivityLogContent from "../ActivityLog/ActivityLogContent";

export default function AdminDashboard({
  initialData,
}: {
  initialData?: AdminDashboardStats | null;
}) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");

  // Media query for mobile detection
  const isMobile = useMediaQuery("(max-width: 48em)");

  // Intersection observer for lazy loading the table on mobile
  const { ref: tableRef, entry } = useIntersection({
    rootMargin: "200px", // Start loading before it's fully in view
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
  } = useSWR<AdminDashboardStats | undefined | null>(
    API_ENDPOINTS.admin.stats,
    fetcher,
    {
      fallbackData: initialData, // Hydrate with server-side data immediately
      revalidateOnFocus: false, // Disable to reduce unnecessary requests
      revalidateOnReconnect: true, // Only revalidate on reconnect
      dedupingInterval: 2000, // Dedupe requests within 2 seconds
      focusThrottleInterval: 5000, // Throttle focus revalidation
    },
  );

  // Set date only on client side to prevent hydration mismatch
  useEffect(() => {
    const now = dayjs();
    setCurrentDate(now.format("MMMM D, YYYY"));
    setDateTime(now.format("YYYY-MM-DD"));
  }, []);

  const loading = !data && !error;
  const stats: AdminDashboardStats | null = data ?? null;

  // Memoize table columns at component level to avoid conditional hook calls
  const tableColumns = useMemo<
    DataTableColumn<AdminDashboardStats["recentPackages"][0]>[]
  >(
    () => [
      {
        accessor: "package_name",
        title: "Package Name",
        render: (pkg) => (
          <Text fw={700} c="dark.7" size="sm">
            {pkg.package_name ?? "—"}
          </Text>
        ),
      },
      {
        accessor: "package_type",
        title: "Type",
        render: (pkg) => (
          <Badge
            size="md"
            variant="transparent"
            color="dark"
            aria-label={`Package type: ${pkg.package_type || "unknown"}`}
          >
            {pkg.package_type}
          </Badge>
        ),
      },
      {
        accessor: "status",
        title: "Status",
        render: (pkg) => (
          <Badge
            size="md"
            radius="md"
            variant="dot"
            color={getStatusFormat(pkg.status ?? undefined)}
            aria-label={`Package status: ${pkg.status?.replace(/_/g, " ") ?? "unknown"}`}
          >
            {pkg.status?.replace(/_/g, " ") ?? "—"}
          </Badge>
        ),
      },
      {
        accessor: "received_at",
        title: "Received",
        textAlign: "right" as const,
        render: (pkg) => (
          <Text size="sm" fw={600} c="dark.7">
            {pkg.received_at ? (
              <time dateTime={pkg.received_at}>
                {dayjs(pkg.received_at).format("MMM D, h:mm A")}
              </time>
            ) : (
              "—"
            )}
          </Text>
        ),
      },
    ],
    [],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await swrMutate(API_ENDPOINTS.admin.stats);
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  };

  const handleViewFullInventory = () => {
    startRouteProgress();
    router.push("/admin/packages");
  };

  // Defer heavy table rendering to improve TBT
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
    return (
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

        <Paper withBorder p="lg" radius="md" h={300}>
          <Center h="100%">
            <Loader size="sm" color="gray" />
          </Center>
        </Paper>
      </Stack>
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
            aria-label="Try refreshing dashboard data"
          >
            Try Refreshing
          </Button>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="xl" role="main" aria-label="Dashboard overview">
      <DashboardHeader
        currentDate={currentDate}
        dateTime={dateTime}
        loading={refreshing || isRefreshingSWR}
        onRefresh={handleRefresh}
      />

      <DashboardStatsGrid stats={stats} />

      <RecentPackagesSection
        recent={stats.recentPackages ?? []}
        tableColumns={tableColumns}
        isMobile={isMobile || false}
        wasTableVisible={wasTableVisible}
        isTableReady={isTableReady}
        onViewFullInventory={handleViewFullInventory}
        tableRef={tableRef}
      />

      <Paper
        withBorder
        p="xl"
        radius="lg"
        shadow="sm"
        role="region"
        style={{
          contentVisibility: "auto",
          containIntrinsicSize: "500px",
          minHeight: "300px",
        }}
      >
        <ActivityLogContent />
      </Paper>
    </Stack>
  );
}
