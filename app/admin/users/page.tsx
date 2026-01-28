"use client";
import dynamic from "next/dynamic";
import {
  Container,
  Title,
  Text,
  Group,
  Box,
  Center,
  Loader,
} from "@mantine/core";
import PrivateMainLayout from "@/components/Layout/PrivateMainLayout";

const Users = dynamic(
  () => import("@/components/pages/admin/UsersPage/Users"),
  {
    loading: () => (
      <Center h={400}>
        <Loader size="lg" color="violet" type="dots" />
      </Center>
    ),
    ssr: false,
  },
);

export default function UsersPage() {
  return (
    <PrivateMainLayout>
      <main style={{ flex: 1, minHeight: "calc(100vh - 200px)" }}>
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
                Manage Users
              </Title>
              <Text c="dark.3" size="sm" fw={500}>
                Configure and manage User Roles
              </Text>
            </div>
          </Group>

          {/* Reserve space to prevent layout shift */}
          <Box style={{ minHeight: "500px" }}>
            <Users />
          </Box>
        </Container>
      </main>
    </PrivateMainLayout>
  );
}
