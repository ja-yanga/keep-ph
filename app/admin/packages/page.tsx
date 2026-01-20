"use client";
import { Container, Title, Center, Loader } from "@mantine/core";
import dynamic from "next/dynamic";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

// Dynamic import for MailroomPackages to reduce initial bundle size
const MailroomPackages = dynamic(
  () => import("@/components/MailroomPackages"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
    ssr: false, // Disable SSR since component uses useSearchParams
  },
);

export default function PackagesPage() {
  return (
    <PrivateMainLayout>
      <main
        style={{ flex: 1 }}
        role="main"
        aria-label="Packages management page"
      >
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
