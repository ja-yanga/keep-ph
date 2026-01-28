"use client";

import { Container, Center, Loader } from "@mantine/core";
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Components
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamically import AnalyticsDashboard to reduce initial bundle size
// We keep SSR enabled for the main layout to improve LCP
const TransactionsTable = dynamic(
  () => import("@/components/pages/admin/TransactionPage/TransactionTable"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    ),
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
          <Suspense
            fallback={
              <Center h={400}>
                <Loader size="lg" color="violet" type="dots" />
              </Center>
            }
          >
            <TransactionsTable />
          </Suspense>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
