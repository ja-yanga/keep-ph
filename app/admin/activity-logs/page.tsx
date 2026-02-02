"use client";

import {
  Container,
  Title,
  Text,
  Group,
  Box,
  Skeleton,
  Stack,
  Paper,
} from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const ActivityLogSkeleton = () => (
  <Stack gap="sm">
    <Paper p={{ base: "md", sm: "xl" }} withBorder radius="lg" shadow="sm">
      <Stack gap="sm">
        {/* Top bar skeleton */}
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Skeleton height={42} style={{ flex: "1 1 300px" }} radius="md" />
          <Group gap="sm">
            <Skeleton height={36} width={100} radius="md" />
            <Skeleton height={36} width={36} radius="md" />
          </Group>
        </Group>

        {/* Filters area reservation */}
        <Box h={40} />

        {/* Table skeleton */}
        <Stack gap="md">
          <Skeleton height={40} radius="md" />
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
        </Stack>
      </Stack>
    </Paper>
  </Stack>
);

// Dynamic import for ActivityLogContent to reduce initial bundle size
const ActivityLogContent = dynamic(
  () => import("@/components/pages/admin/ActivityLog/ActivityLogContent"),
  {
    loading: () => <ActivityLogSkeleton />,
    ssr: true, // Allow SSR for the container but individual parts inside might be client-only
  },
);

export default function ActivityLogsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }} role="main" aria-label="Activity logs page">
        <Container size="xl" py="xl">
          <Group
            justify="space-between"
            mb="xl"
            align="flex-end"
            w="100%"
            maw={1200}
          >
            <div>
              <Title order={1} fw={900} c="dark.9" lts="-0.02em">
                Activity Logs
              </Title>
              <Text c="dark.7" size="sm" fw={500}>
                Monitor system activities, user actions, and important events.
              </Text>
            </div>
          </Group>

          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "750px" }}>
            <ActivityLogContent />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
