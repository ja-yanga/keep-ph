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

const ErrorLogSkeleton = () => (
  <Stack gap="sm">
    <Paper p={{ base: "md", sm: "xl" }} withBorder radius="lg" shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Skeleton height={36} width={120} radius="md" />
          <Skeleton height={36} width={36} radius="md" />
        </Group>

        <Box h={40} />

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

const ErrorLogContent = dynamic(
  () => import("@/components/pages/admin/ErrorLog/ErrorLogContent"),
  {
    loading: () => <ErrorLogSkeleton />,
    ssr: false,
  },
);

export default function ErrorLogsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }} role="main" aria-label="Error logs page">
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
                Error Logs
              </Title>
              <Text c="dark.7" size="sm" fw={500}>
                Review system errors and track resolution status.
              </Text>
            </div>
          </Group>

          <Box style={{ minHeight: "750px" }}>
            <ErrorLogContent />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
