"use client";

import { useEffect, useState } from "react";
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
  ActionIcon,
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
import dayjs from "dayjs";
import AnalyticsDashboard from "./AnalyticsDashboard";

interface DashboardStats {
  pendingRequests: number;
  storedPackages: number;
  totalSubscribers: number;
  lockerStats: {
    total: number;
    assigned: number;
  };
  recentPackages: any[];
}

// Reusable Card Component for better UI consistency
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
  onClick,
  customContent,
}: {
  title: string;
  value?: number | string;
  description?: string;
  icon: any;
  color: string;
  onClick: () => void;
  customContent?: React.ReactNode;
}) {
  return (
    <Paper
      withBorder
      p="md"
      radius="md"
      shadow="sm"
      onClick={onClick}
      style={{
        cursor: "pointer",
        transition: "all 0.2s ease",
        borderLeft: `4px solid var(--mantine-color-${color}-6)`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
      }}
    >
      <Group justify="space-between" align="flex-start">
        <Stack gap={4}>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase">
            {title}
          </Text>
          {customContent ? (
            customContent
          ) : (
            <>
              <Text fw={800} size="2rem" lh={1} mt={4}>
                {value}
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                {description}
              </Text>
            </>
          )}
        </Stack>
        <ThemeIcon
          color={color}
          variant="light"
          size={48}
          radius="md"
          style={{ opacity: 0.8 }}
        >
          <Icon size={28} stroke={1.5} />
        </ThemeIcon>
      </Group>
    </Paper>
  );
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Failed to fetch ${url}`);
  }
  return res.json().catch(() => ({}));
};

export default function AdminDashboard() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    error,
    isValidating: isRefreshingSWR,
  } = useSWR<DashboardStats | undefined>(
    "/api/admin/dashboard/stats",
    fetcher,
    { revalidateOnFocus: true }
  );

  const loading = !data && !error;

  const stats: DashboardStats | null = data ?? null;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await swrMutate("/api/admin/dashboard/stats");
    } catch (e) {
      console.error("refresh failed", e);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    );
  }

  if (!stats) return null;

  // defensive: ensure recentPackages is always an array
  const recent = stats.recentPackages ?? [];
  if (recent.length === 0) {
    console.debug("[AdminDashboard] recentPackages is empty or missing", stats);
  }

  // Calculate Locker Occupancy
  const occupancyRate =
    stats.lockerStats.total > 0
      ? (stats.lockerStats.assigned / stats.lockerStats.total) * 100
      : 0;

  return (
    <Stack gap="xl">
      {/* Header Section */}
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2} fw={800} c="dark.4">
            Dashboard Overview
          </Title>
          <Text c="dimmed" size="sm">
            Welcome back. Here is what's happening today,{" "}
            {dayjs().format("MMMM D, YYYY")}.
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

      {/* Stats Grid */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
        <StatCard
          title="Pending Requests"
          value={stats.pendingRequests}
          description="Requires immediate action"
          icon={IconAlertCircle}
          color="red"
          // CHANGED: Added query param ?tab=requests
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
          // CHANGED: Added query param ?tab=occupied
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

      {/* Recent Activity Section */}
      <Paper withBorder p="lg" radius="md" shadow="sm">
        <Group justify="space-between" mb="lg">
          <Group gap="xs">
            <ThemeIcon variant="light" color="gray" size="md">
              <IconPackage size={16} />
            </ThemeIcon>
            <Title order={4}>Recent Packages</Title>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            rightSection={<IconArrowRight size={14} />}
            onClick={() => router.push("/admin/packages")}
          >
            View All Packages
          </Button>
        </Group>

        <Table verticalSpacing="sm" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Package</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th style={{ textAlign: "right" }}>Received</Table.Th>
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
                      color={
                        pkg.status === "STORED"
                          ? "blue"
                          : pkg.status.includes("REQUEST")
                          ? "orange"
                          : "gray"
                      }
                    >
                      {pkg.status.replace(/_/g, " ")}
                    </Badge>
                  </Table.Td>
                  <Table.Td c="dimmed" style={{ textAlign: "right" }}>
                    <Text size="sm">
                      {dayjs(pkg.received_at).format("MMM D, h:mm A")}
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
