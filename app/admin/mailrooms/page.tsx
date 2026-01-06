"use client";
import MailroomRegistrations from "@/components/MailroomRegistrations";
import { Container, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function MailroomRegistrationsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Mailrooms
          </Title>
          <MailroomRegistrations />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
