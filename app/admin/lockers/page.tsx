"use client";
import MailroomLockers from "@/components/MailroomLockers";
import { Container, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function LockersPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Lockers
          </Title>
          <MailroomLockers />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
