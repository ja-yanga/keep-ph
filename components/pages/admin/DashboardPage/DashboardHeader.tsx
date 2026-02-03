"use client";

import { Group, Title, Text, Button } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

type DashboardHeaderProps = {
  currentDate: string;
  dateTime: string;
  loading: boolean;
  onRefresh: () => void;
};

export function DashboardHeader({
  currentDate,
  dateTime,
  loading,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end">
      <div>
        <Title order={1} fw={900} lts="-0.02em" c="dark.5">
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
        loading={loading}
        onClick={onRefresh}
        aria-label="Refresh dashboard data"
      >
        Refresh Data
      </Button>
    </Group>
  );
}
