"use client";
import MailroomLockers from "@/components/MailroomLockers";
import { Container, Group, Title, Text } from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

export default function LockersPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          <Group
            justify="space-between"
            mb="xl"
            align="flex-end"
            w="100%"
            maw={1200}
          >
            <div>
              <Title order={1} fw={900} c="dark.5" lts="-0.02em">
                Locker Management
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Track status, assign users, and manage requests.
              </Text>
            </div>
          </Group>
          <MailroomLockers />
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
