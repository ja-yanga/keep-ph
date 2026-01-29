"use client";

import { Container } from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";
import { Loader, Center } from "@mantine/core";

// Dynamically import AdminDashboard with code splitting
// This reduces initial bundle size and improves performance
const ApproverDashboard = dynamic(
  () => import("@/components/pages/admin/DashboardPage/ApproverDashboard"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
    ssr: true, // Enable SSR for better initial load
  },
);

export default function ApproverDashboardPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }} role="main" aria-label="Approver dashboard">
        <Container size="xl" py="xl">
          <ApproverDashboard />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
