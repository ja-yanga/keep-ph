"use client";
import { Container, Title, Text, Group, Center, Loader } from "@mantine/core";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamically import AdminRewards to reduce initial bundle size
const AdminRewards = dynamic(
  () => import("@/components/pages/admin/RewardsPage/AdminRewards"),
  {
    ssr: false,
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
  },
);

export default function AdminRewardsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
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
                Rewards & Referral Claims
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Process payouts and track milestone rewards for users.
              </Text>
            </div>
          </Group>
          <Suspense
            fallback={
              <Center h={400}>
                <Loader size="lg" color="violet" type="dots" />
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
