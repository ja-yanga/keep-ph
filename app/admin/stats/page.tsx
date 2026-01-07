"use client";

import { Container } from "@mantine/core";

// Components
import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function AdminStatsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <AnalyticsDashboard />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
