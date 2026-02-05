"use client";

import {
  Container,
  Title,
  Text,
  Center,
  Stack,
  Button,
  Paper,
  Group,
} from "@mantine/core";
import { IconShieldX, IconLogout } from "@tabler/icons-react";
import Link from "next/link";
import { useSignout } from "../hooks/useSignout";
import { useSession } from "@/components/SessionProvider";

const ADMIN_ROLES = ["admin", "owner", "approver"];

export default function ForbiddenPage() {
  const { handleSignOut } = useSignout();
  const { session } = useSession();
  const isAdminLoggedIn =
    !!session?.user && !!session?.role && ADMIN_ROLES.includes(session.role);

  return (
    <Center style={{ minHeight: "100vh", background: "var(--background)" }}>
      <Container size="xs">
        <Paper
          shadow="md"
          radius="lg"
          p={36}
          withBorder
          style={{ background: "var(--foreground)" }}
        >
          <Stack align="center" gap={24}>
            <Group mb={8}>
              <IconShieldX size={40} color="#f59e0b" stroke={1.6} />
            </Group>
            <Title order={2} c="orange.7" style={{ fontWeight: 700 }}>
              Access Forbidden
            </Title>
            <Text size="lg" c="dimmed" maw={360} ta="center">
              You are not authorized to access this page. Please contact the
              administrator.
            </Text>
            <Group mt={16} gap="md">
              <Button
                component={Link}
                href="/"
                leftSection={<IconShieldX size={16} />}
                variant="outline"
                color="gray"
                radius="lg"
              >
                Go Home
              </Button>
              {isAdminLoggedIn && (
                <Button
                  onClick={handleSignOut}
                  leftSection={<IconLogout size={16} />}
                  variant="filled"
                  color="red"
                  radius="lg"
                >
                  Sign Out
                </Button>
              )}
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
}
