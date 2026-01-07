"use client";

import AdminUserKyc from "@/components/pages/admin/KycPage/AdminUserKyc";
import { Container, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function AdminKycPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            KYC Verifications
          </Title>
          <AdminUserKyc />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
