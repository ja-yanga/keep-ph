"use client";
import MailroomLocations from "@/components/MailroomLocations";
import { Container, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function LocationsPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={1} mb="lg">
            Register Mailroom Locations
          </Title>
          <MailroomLocations />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
