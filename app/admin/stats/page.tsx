"use client";

import { Container } from "@mantine/core";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Loader, Center } from "@mantine/core";

// Components
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamically import AnalyticsDashboard to reduce initial bundle size
const AnalyticsDashboard = dynamic(
  () => import("@/components/AnalyticsDashboard"),
  {
    ssr: false,
    loading: () => (
      <Center h={400}>
        <Loader size="lg" />
      </Center>
    ),
  },
);

export default function AdminStatsPage() {
  return (
    <PrivateMainLayout>
      <main
        style={{ flex: 1 }}
        role="main"
        aria-label="Admin analytics dashboard"
      >
        <Container size="xl" py="xl">
          <Suspense
            fallback={
              <Center h={400}>
                <Loader size="lg" />
              </Center>
            }
          >
            <AnalyticsDashboard />
          </Suspense>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
