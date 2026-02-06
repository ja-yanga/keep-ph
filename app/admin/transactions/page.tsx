"use client";

import { Container, Stack, Skeleton, SimpleGrid, Box } from "@mantine/core";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Components
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const TransactionsSkeleton = () => (
  <Stack
    gap="xl"
    role="status"
    aria-live="polite"
    aria-label="Loading dashboard data"
  >
    <Skeleton h={32} w={200} mb="xs" />
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} h={120} radius="lg" />
      ))}
    </SimpleGrid>

    <Box h={40} />

    <Stack gap="md">
      <Skeleton height={40} radius="md" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} height={60} radius="md" />
      ))}
    </Stack>
  </Stack>
);

const TransactionsTable = dynamic(
  () => import("@/components/pages/admin/TransactionPage/TransactionTable"),
  {
    loading: () => <TransactionsSkeleton />,
  },
);

export default function AdminTransactionsPage() {
  return (
    <PrivateMainLayout>
      <main
        style={{ flex: 1 }}
        role="main"
        aria-label="Admin transactions table"
      >
        <Container size="xl" py="xl">
          <Suspense fallback={<TransactionsSkeleton />}>
            <TransactionsTable />
          </Suspense>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
