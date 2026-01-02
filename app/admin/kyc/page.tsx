"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminUserKyc from "@/components/pages/admin/KycPage/AdminUserKyc";
import { Container, Title, Loader, Center } from "@mantine/core";
import { useSession } from "@/components/SessionProvider";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function AdminKycPage() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session || session.role !== "admin") router.replace("/dashboard");
  }, [session, loading, router]);

  if (loading || !session || session.role !== "admin") {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

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
