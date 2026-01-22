"use client";
import dynamic from "next/dynamic";
import {
  Container,
  Title,
  Skeleton,
  Stack,
  Box,
  Text,
  Group,
} from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";
import { useEffect } from "react";

// Defer loading of heavy registration component to reduce initial TBT and JavaScript execution time
const MailroomRegistrations = dynamic(
  () => import("@/components/MailroomRegistrations"),
  {
    ssr: false,
    loading: () => (
      <Stack gap="md">
        <Skeleton height={40} width={300} radius="sm" />
        <Skeleton height={400} radius="sm" />
      </Stack>
    ),
  },
);

export default function MailroomRegistrationsPage() {
  useEffect(() => {
    // Prefetch API endpoint once component mounts
    fetch("/api/admin/mailroom/registrations", {
      method: "GET",
      priority: "high",
    } as RequestInit).catch(() => {
      // Silent fail for prefetch
    });
  }, []);

  return (
    <PrivateMainLayout>
      <main style={{ flex: 1, minHeight: "calc(100vh - 200px)" }}>
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
                Mailroom Registrations
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                View and manage user subscriptions and locker assignments.
              </Text>
            </div>
          </Group>
          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <MailroomRegistrations />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
