"use client";
import MailroomPlans from "@/components/pages/admin/PlanPage/MailroomPlans";
import { Container, Title } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function PlansPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Title order={2} mb="lg">
            Manage Service Plans
          </Title>
          <MailroomPlans />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
