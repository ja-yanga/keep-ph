"use client";

import { Container, Title } from "@mantine/core";
import AdminRewards from "@/components/pages/admin/RewardsPage/AdminRewards";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function AdminRewardsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Reward Claims
          </Title>
          <AdminRewards />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
