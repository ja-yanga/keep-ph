"use client";

import { SimpleGrid, Group, RingProgress, Text } from "@mantine/core";
import {
  IconAlertCircle,
  IconBox,
  IconUsers,
  IconLock,
} from "@tabler/icons-react";
import { StatCard } from "./StatCard";
import type { AdminDashboardStats } from "@/utils/types";

type DashboardStatsGridProps = {
  stats: AdminDashboardStats;
};

export function DashboardStatsGrid({ stats }: DashboardStatsGridProps) {
  const occupancyRate =
    stats.lockerStats.total > 0
      ? (stats.lockerStats.assigned / stats.lockerStats.total) * 100
      : 0;

  return (
    <SimpleGrid
      cols={{ base: 1, sm: 2, md: 4 }}
      spacing="lg"
      role="region"
      aria-label="Statistics summary"
    >
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
  );
}
