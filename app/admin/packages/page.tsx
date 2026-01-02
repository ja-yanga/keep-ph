"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Container, Title, Loader, Center } from "@mantine/core";
import { useSession } from "@/components/SessionProvider";
import MailroomPackages from "@/components/MailroomPackages";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

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
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Packages
          </Title>
          <MailroomPackages />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
