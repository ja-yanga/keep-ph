"use client";

import { useState } from "react";
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
  Center,
  SimpleGrid,
  Stack,
  Button,
  Skeleton,
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

  const {
    data,
    error,
    isValidating: isRefreshingSWR,
  } = useSWR<DashboardStats | undefined>(API_ENDPOINTS.admin.stats, fetcher, {
    revalidateOnFocus: true,
  });

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
      <Stack gap="xl">
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

        <Paper withBorder p="lg" radius="md">
          <Group justify="space-between" mb="lg">
            <Skeleton h={24} w={150} />
            <Skeleton h={24} w={100} />
          </Group>
          <Stack gap="xs">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} h={40} />
            ))}
          </Stack>
        </Paper>
      </Stack>
    );
  } else if (!stats) {
    pageContent = (
      <Center h={400}>
        <Stack align="center" gap="xs">
          <IconAlertCircle size={48} color="var(--mantine-color-gray-4)" />
          <Text c="dimmed" fw={500}>
            No dashboard data available.
          </Text>
          <Button variant="light" onClick={handleRefresh}>
            Try Refreshing
          </Button>
        </Stack>
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
            <Title order={2} fw={900} c="dark.5" lts="-0.02em">
              Dashboard Overview
            </Title>
            <Text c="dark.3" size="sm" fw={500}>
              Welcome back. Here is what&apos;s happening today,{" "}
              <Text span c="dark.4" fw={800}>
                {dayjs().format("MMMM D, YYYY")}
              </Text>
              .
            </Text>
          </div>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            loading={refreshing || isRefreshingSWR}
            onClick={handleRefresh}
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
                />
                <div>
                  <Text fw={800} size="xl" lh={1}>
                    {stats.lockerStats.assigned}
                    <Text span size="sm" c="dark.3" fw={600}>
                      /{stats.lockerStats.total}
                    </Text>
                  </Text>
                  <Text size="xs" c="dark.4" fw={600}>
                    {Math.round(occupancyRate)}% Utilized
                  </Text>
                </div>
              </Group>
            }
          />
        </SimpleGrid>

        <Paper withBorder p="xl" radius="lg" shadow="sm">
          <Group justify="space-between" mb="xl">
            <Group gap="sm">
              <ThemeIcon
                variant="gradient"
                gradient={{ from: "gray.1", to: "gray.2", deg: 180 }}
                size="lg"
                radius="md"
              >
                <IconPackage size={20} color="var(--mantine-color-dark-3)" />
              </ThemeIcon>
              <div>
                <Title order={3} fw={800} size="h4">
                  Recent Packages
                </Title>
                <Text size="xs" c="dark.3" fw={500}>
                  Latest arrivals and updates
                </Text>
              </div>
            </Group>
            <Button
              variant="outline"
              color="dark"
              size="xs"
              radius="md"
              rightSection={<IconArrowRight size={14} />}
              onClick={() => router.push("/admin/packages")}
            >
              View Full Inventory
            </Button>
          </Group>

          <div style={{ overflowX: "auto" }}>
            <Table verticalSpacing="md" highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ borderBottomWidth: 2 }}>
                    Package Name
                  </Table.Th>
                  <Table.Th style={{ borderBottomWidth: 2 }}>Type</Table.Th>
                  <Table.Th style={{ borderBottomWidth: 2 }}>Status</Table.Th>
                  <Table.Th
                    style={{ textAlign: "right", borderBottomWidth: 2 }}
                  >
                    Received
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {recent.length > 0 ? (
                  recent.map((pkg) => (
                    <Table.Tr
                      key={pkg.id}
                      style={{ transition: "background-color 0.2s" }}
                    >
                      <Table.Td>
                        <Text fw={700} c="dark.4" size="sm">
                          {pkg.package_name ?? "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="sm"
                          variant="outline"
                          color="dark"
                          radius="sm"
                        >
                          {pkg.package_type}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          size="md"
                          radius="md"
                          variant="dot"
                          color={(() => {
                            if (pkg.status === "STORED") return "blue";
                            if (pkg.status?.includes("REQUEST"))
                              return "orange";
                            return "gray";
                          })()}
                        >
                          {pkg.status?.replace(/_/g, " ") ?? "—"}
                        </Badge>
                      </Table.Td>
                      <Table.Td c="dark.3" style={{ textAlign: "right" }}>
                        <Text size="sm" fw={600}>
                          {dayjs(pkg.received_at).format("MMM D, h:mm A")}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={4} align="center" py={60}>
                      <Stack align="center" gap="xs">
                        <IconPackage
                          size={32}
                          color="var(--mantine-color-gray-3)"
                        />
                        <Text c="dark.2" fs="italic" size="sm" fw={500}>
                          No recent activity found
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </div>
        </Paper>
      </Stack>
    );
  }

  return <>{pageContent}</>;
}
