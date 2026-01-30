"use client";

import {
  Paper,
  Group,
  ThemeIcon,
  Title,
  Text,
  Button,
  Center,
  Loader,
} from "@mantine/core";
import { IconPackage, IconArrowRight } from "@tabler/icons-react";
import { AdminTable } from "@/components/common/AdminTable";
import type { AdminDashboardStats } from "@/utils/types";
import { type DataTableColumn } from "mantine-datatable";

type RecentPackagesSectionProps = {
  recent: AdminDashboardStats["recentPackages"];
  tableColumns: DataTableColumn<AdminDashboardStats["recentPackages"][0]>[];
  isMobile: boolean;
  wasTableVisible: boolean;
  isTableReady: boolean;
  onViewFullInventory: () => void;
  tableRef: (node?: Element | null | undefined) => void;
};

export function RecentPackagesSection({
  recent,
  tableColumns,
  isMobile,
  wasTableVisible,
  isTableReady,
  onViewFullInventory,
  tableRef,
}: RecentPackagesSectionProps) {
  return (
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
          onClick={onViewFullInventory}
          aria-label="View all packages"
        >
          View Full Inventory
        </Button>
      </Group>

      <div aria-live="polite" aria-atomic="true">
        {(isMobile ? wasTableVisible : true) && isTableReady ? (
          <AdminTable<AdminDashboardStats["recentPackages"][0]>
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
  );
}
