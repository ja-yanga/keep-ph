"use client";

import React, { useEffect } from "react";
import { Center, Loader, Box, Container, Title } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import { useRouter } from "next/navigation";
import AdminRewards from "@/components/pages/admin/RewardsPage/AdminRewards";

export default function AdminRewardsPage() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    // redirect non-admins away
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
      style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
    >
      <DashboardNav />
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Reward Claims
          </Title>

          <AdminRewards />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
