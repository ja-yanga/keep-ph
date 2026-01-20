"use client";
import dynamic from "next/dynamic";
import { Container, Title, Skeleton, Stack, Box } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";
import { useEffect } from "react";

const MailroomPlans = dynamic(
  () => import("@/components/pages/admin/PlanPage/MailroomPlans"),
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

export default function PlansPage() {
  useEffect(() => {
    // Prefetch API endpoint once component mounts
    fetch("/api/admin/mailroom/plans", {
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
            Manage Service Plans
          </Title>
          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <MailroomPlans />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
