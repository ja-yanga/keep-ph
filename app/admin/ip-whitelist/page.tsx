"use client";

import {
  Box,
  Container,
  Group,
  Paper,
  Skeleton,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const IpWhitelistSkeleton = () => (
  <Stack gap="sm">
    <Paper p={{ base: "md", sm: "xl" }} withBorder radius="lg" shadow="sm">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Skeleton height={32} width={180} radius="md" />
          <Group gap="sm">
            <Skeleton height={36} width={120} radius="md" />
            <Skeleton height={36} width={120} radius="md" />
          </Group>
        </Group>
        <Stack gap="md">
          <Skeleton height={40} radius="md" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={60} radius="md" />
          ))}
        </Stack>
      </Stack>
    </Paper>
  </Stack>
);

const IpWhitelistContent = dynamic(
  () => import("@/components/pages/admin/IpWhitelistPage/IpWhitelist"),
  {
    loading: () => <IpWhitelistSkeleton />,
    ssr: false,
  },
);

export default function IpWhitelistPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }} role="main" aria-label="IP whitelist page">
        <Container size="xl" py="xl">
          <Group justify="space-between" mb="xl" align="flex-end" w="100%">
            <div>
              <Title order={1} fw={900} c="dark.9" lts="-0.02em">
                IP Whitelist
              </Title>
              <Text c="dark.7" size="sm" fw={500}>
                Manage the IP ranges allowed to access admin features.
              </Text>
            </div>
          </Group>
          <Box style={{ minHeight: "600px" }}>
            <IpWhitelistContent />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
