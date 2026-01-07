"use client";
import { Container, Title } from "@mantine/core";
import MailroomPackages from "@/components/MailroomPackages";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function PackagesPage() {
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
