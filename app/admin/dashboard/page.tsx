"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Loader, Center } from "@mantine/core";
import { useSession } from "@/components/SessionProvider";

// Components
import AdminDashboard from "@/components/AdminDashboard";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

export default function AdminDashboardPage() {
  const { session, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    // Redirect if not logged in or not an admin
    if (!session || session.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [session, loading, router]);

  // Show loader while checking authorization
  if (loading || !session || session.role !== "admin") {
    return (
      <Center h="100vh">
        <Loader color="violet" />
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
          <AdminDashboard />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
