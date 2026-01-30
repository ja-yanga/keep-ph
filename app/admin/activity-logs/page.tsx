"use client";
import {
  Container,
  Title,
  Center,
  Loader,
  Text,
  Group,
  Box,
} from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamic import for ActivityLogContent to reduce initial bundle size
const ActivityLogContent = dynamic(
  () => import("@/components/pages/admin/ActivityLog/ActivityLogContent"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
    ssr: false, // Disable SSR since component uses client-side features
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
              <Title order={1} fw={900} c="dark.5" lts="-0.02em">
                Activity Logs
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Monitor system activities, user actions, and important events.
              </Text>
            </div>
          </Group>

          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <ActivityLogContent />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
