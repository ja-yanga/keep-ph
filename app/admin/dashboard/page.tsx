"use client";

import { Container } from "@mantine/core";
import AdminDashboard from "@/components/pages/admin/DashboardPage/AdminDashboard";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function AdminDashboardPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <AdminDashboard />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
