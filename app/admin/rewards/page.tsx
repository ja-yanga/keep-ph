"use client";

import { Container, Title } from "@mantine/core";
import { Suspense } from "react";
import { Loader, Center } from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamically import AdminRewards to reduce initial bundle size
const AdminRewards = dynamic(
  () => import("@/components/pages/admin/RewardsPage/AdminRewards"),
  {
    ssr: false,
    loading: () => (
      <Center py="xl">
        <Loader />
      </Center>
    ),
  },
);

export default function AdminRewardsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Reward Claims
          </Title>
          <Suspense
            fallback={
              <Center py="xl">
                <Loader />
              </Center>
            }
          >
            <AdminRewards />
          </Suspense>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
