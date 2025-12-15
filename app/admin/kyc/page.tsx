"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminUserKyc from "@/components/AdminUserKyc";
import { Box, Container, Title, Loader, Center } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";

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
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F7FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            KYC Verifications
          </Title>
          <AdminUserKyc />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
