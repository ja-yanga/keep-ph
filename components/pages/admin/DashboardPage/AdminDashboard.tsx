"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import { useRouter } from "next/navigation";
import {
  Paper,
  Text,
  Group,
  ThemeIcon,
  RingProgress,
  Title,
  Table,
  Badge,
  Loader,
  Center,
  SimpleGrid,
  Stack,
  Button,
} from "@mantine/core";
import {
  IconBox,
  IconUsers,
  IconAlertCircle,
  IconLock,
  IconArrowRight,
  IconPackage,
  IconRefresh,
} from "@tabler/icons-react";
// Import only needed dayjs functions to reduce bundle size
import dayjs from "dayjs";
import { fetcher } from "@/utils/helper";
import { StatCard } from "./StatCard";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

type DashboardStats = {
  pendingRequests: number;
  storedPackages: number;
  totalSubscribers: number;
  lockerStats: {
    total: number;
    assigned: number;
  };
  recentPackages: Array<{
    id: string;
    package_name?: string;
    package_type?: string;
    status?: string;
    received_at?: string;
    registration?: { full_name?: string };
  }>;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState<string>("");
  const [dateTime, setDateTime] = useState<string>("");

  const {
    data,
    error,
    isValidating: isRefreshingSWR,
  } = useSWR<DashboardStats | undefined>(API_ENDPOINTS.admin.stats, fetcher, {
    revalidateOnFocus: false, // Disable to reduce unnecessary requests
    revalidateOnReconnect: true, // Only revalidate on reconnect
    dedupingInterval: 2000, // Dedupe requests within 2 seconds
    focusThrottleInterval: 5000, // Throttle focus revalidation
  });

  // Set date only on client side to prevent hydration mismatch
  useEffect(() => {
    const now = dayjs();
    setCurrentDate(now.format("MMMM D, YYYY"));
    setDateTime(now.format("YYYY-MM-DD"));
  }, []);

  const loading = !data && !error;

  const stats: DashboardStats | null = data ?? null;

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

  if (loading) {
    pageContent = (
      <Center
        h={400}
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard data"
      >
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    );
  } else if (!stats) {
    pageContent = (
      <Center h={400} role="alert" aria-live="polite">
        <Text c="dimmed">No dashboard data available.</Text>
      </Center>
    );
  } else {
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
      <Stack gap="xl">
        <Group justify="space-between" align="flex-end">
          <div>
            <Title order={1} fw={800} c="dark.4">
              Dashboard Overview
            </Title>
            <Text c="dimmed" size="sm" role="text">
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

        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
          <StatCard
            title="Pending Requests"
            value={stats.pendingRequests}
            description="Requires immediate action"
            icon={IconAlertCircle}
            color="red"
            onClick={() => router.push("/admin/packages?tab=requests")}
          />

          <StatCard
            title="Inventory"
            value={stats.storedPackages}
            description="Packages currently stored"
            icon={IconBox}
            color="blue"
            onClick={() => router.push("/admin/packages")}
          />

          <StatCard
            title="Subscribers"
            value={stats.totalSubscribers}
            description="Total active registrations"
            icon={IconUsers}
            color="teal"
            onClick={() => router.push("/admin/mailrooms")}
          />

          <StatCard
            title="Locker Occupancy"
            icon={IconLock}
            color="violet"
            onClick={() => router.push("/admin/lockers?tab=occupied")}
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
                    <Text span size="sm" c="dimmed" fw={500}>
                      /{stats.lockerStats.total}
                    </Text>
                  </Text>
                  <Text size="xs" c="dimmed">
                    {Math.round(occupancyRate)}% Utilized
                  </Text>
                </div>
              </Group>
            }
          />
        </SimpleGrid>

        <Paper
          withBorder
          p="lg"
          radius="md"
          shadow="sm"
          role="region"
          aria-labelledby="recent-packages-heading"
        >
          <Group justify="space-between" mb="lg">
            <Group gap="xs">
              <ThemeIcon
                variant="light"
                color="gray"
                size="md"
                aria-hidden="true"
              >
                <IconPackage size={16} />
              </ThemeIcon>
              <Title order={2} id="recent-packages-heading">
                Recent Packages
              </Title>
            </Group>
            <Button
              variant="subtle"
              size="xs"
              rightSection={<IconArrowRight size={14} aria-hidden="true" />}
              onClick={() => router.push("/admin/packages")}
              aria-label="View all packages"
            >
              View All Packages
            </Button>
          </Group>

          <Table
            verticalSpacing="sm"
            highlightOnHover
            role="table"
            aria-label="Recent packages"
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th scope="col">Package</Table.Th>
                <Table.Th scope="col">Type</Table.Th>
                <Table.Th scope="col">Status</Table.Th>
                <Table.Th scope="col" style={{ textAlign: "right" }}>
                  Received
                </Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recent.length > 0 ? (
                recent.map((pkg) => (
                  <Table.Tr key={pkg.id}>
                    <Table.Td fw={600} c="dark.3">
                      {pkg.package_name ?? "—"}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{pkg.package_type}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        variant="dot"
                        color={(() => {
                          if (pkg.status === "STORED") return "blue";
                          if (pkg.status?.includes("REQUEST")) return "orange";
                          return "gray";
                        })()}
                        aria-label={`Package status: ${pkg.status?.replace(/_/g, " ") ?? "unknown"}`}
                      >
                        {pkg.status?.replace(/_/g, " ") ?? "—"}
                      </Badge>
                    </Table.Td>
                    <Table.Td c="dimmed" style={{ textAlign: "right" }}>
                      <Text size="sm">
                        <time dateTime={pkg.received_at || undefined}>
                          {dayjs(pkg.received_at).format("MMM D, h:mm A")}
                        </time>
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4} align="center" py="xl">
                    <Text c="dimmed" fs="italic">
                      No recent activity found
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Paper>
      </Stack>
    );
  }

  return <>{pageContent}</>;
}
