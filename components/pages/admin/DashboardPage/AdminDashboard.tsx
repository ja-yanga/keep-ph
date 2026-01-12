"use client";

import { useState, useEffect, useMemo } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { useRouter } from "next/navigation";
import {
  Paper,
  Text,
  Group,
  ThemeIcon,
  RingProgress,
  Title,
  Badge,
  Center,
  SimpleGrid,
  Stack,
  Button,
  Skeleton,
  Loader,
} from "@mantine/core";
import dynamic from "next/dynamic";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";
// Lazy load DataTable to reduce initial bundle
const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <Stack gap="xs" aria-busy="true" aria-label="Loading table">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} h={40} />
        ))}
      </Stack>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;
import {
  IconBox,
  IconUsers,
  IconAlertCircle,
  IconLock,
  IconArrowRight,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";
import { useMediaQuery, useIntersection } from "@mantine/hooks";
import dayjs from "dayjs";
import { fetcher, getStatusFormat } from "@/utils/helper";
import { StatCard } from "./StatCard";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

import { AdminDashboardStats } from "@/utils/types";

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
        textAlign: "right",
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

  let pageContent: React.ReactNode;

  // Defer heavy table rendering to improve TBT
  const [isTableReady, setIsTableReady] = useState(false);
  useEffect(() => {
    // Small delay to allow main thread to breathe after hydration
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
    pageContent = (
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

        {/* Use a lighter skeleton for the table container initially */}
        <Paper withBorder p="lg" radius="md" h={300}>
          <Center h="100%">
            <Loader size="sm" color="gray" />
          </Center>
        </Paper>
      </Stack>
    );
  } else if (!stats) {
    pageContent = (
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
  } else {
    // ... existing stats logic ...
    const recent = stats.recentPackages ?? [];
    if (recent.length === 0) {
      console.debug(
        "[AdminDashboard] recentPackages is empty or missing",
        stats,
      );
    }

    const occupancyRate =
      stats.lockerStats.total > 0
        ? (stats.lockerStats.assigned / stats.lockerStats.total) * 100
        : 0;

    pageContent = (
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
              .
            </Text>
          </div>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} aria-hidden="true" />}
            loading={refreshing || isRefreshingSWR}
            onClick={handleRefresh}
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
          {/* StatCards remain same */}
          <StatCard
            href="/admin/packages?tab=requests"
            title="Pending Requests"
            value={stats.pendingRequests}
            description="Requires immediate action"
            icon={IconAlertCircle}
            color="red"
            aria-label={`${stats.pendingRequests} pending requests requiring action`}
          />

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
            href="/admin/mailrooms"
            title="Subscribers"
            value={stats.totalSubscribers}
            description="Total active registrations"
            icon={IconUsers}
            color="teal"
            aria-label={`${stats.totalSubscribers} active subscribers`}
          />

          <StatCard
            href="/admin/lockers?tab=occupied"
            title="Locker Occupancy"
            icon={IconLock}
            color="violet"
            customContent={
              <Group gap="xs" mt={4}>
                <RingProgress
                  size={60}
                  roundCaps
                  thickness={6}
                  sections={[{ value: occupancyRate, color: "violet" }]}
                  aria-label={`Locker occupancy: ${Math.round(occupancyRate)}%`}
                />
                <div>
                  <Text fw={800} size="xl" lh={1}>
                    {stats.lockerStats.assigned}
                    <Text span size="sm" c="dark.7" fw={600}>
                      /{stats.lockerStats.total}
                    </Text>
                  </Text>
                  <Text size="xs" c="dark.7" fw={600}>
                    {Math.round(occupancyRate)}% Utilized
                  </Text>
                </div>
              </Group>
            }
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
            minHeight: "300px", // Ensure height allocated
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
                <Title
                  order={2}
                  fw={800}
                  size="h4"
                  id="recent-packages-heading"
                >
                  Recent Packages
                </Title>
                <Text size="xs" c="dark.4" fw={500}>
                  Latest arrivals and updates
                </Text>
              </div>
            </Group>
            {/* Button remains */}
            <Button
              variant="outline"
              color="dark"
              size="xs"
              radius="md"
              rightSection={<IconArrowRight size={14} aria-hidden="true" />}
              onClick={() => router.push("/admin/packages")}
              aria-label="View all packages"
            >
              View Full Inventory
            </Button>
          </Group>

          <div aria-live="polite" aria-atomic="true">
            {/* On mobile, only render if it was visible in viewport. On desktop, follow the idle callback readiness. */}
            {(isMobile ? wasTableVisible : true) && isTableReady ? (
              <DataTable
                withTableBorder={false}
                borderRadius="lg"
                verticalSpacing="md"
                highlightOnHover
                minHeight={150}
                records={recent}
                aria-label="Recent packages"
                columns={tableColumns}
                noRecordsText="No recent activity found"
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

  return <>{pageContent}</>;
}
