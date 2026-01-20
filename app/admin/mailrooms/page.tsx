"use client";
import dynamic from "next/dynamic";
import { Container, Title, Skeleton, Stack, Box } from "@mantine/core";
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
          <Title order={2} mb="lg">
            Mailrooms
          </Title>
          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <MailroomRegistrations />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
