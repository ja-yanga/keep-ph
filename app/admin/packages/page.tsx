"use client";
import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Box, Container, Title, Loader, Center } from "@mantine/core";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import MailroomPackages from "@/components/MailroomPackages";

export default function PackagesPage() {
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
            Packages
          </Title>
          <MailroomPackages />
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
