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
import { IconLock, IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { useSignout } from "../hooks/useSignout";

const UnauthorizedPage = () => {
  const { handleSignOut } = useSignout();

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
              <IconLock size={40} color="#ef4444" stroke={1.6} />
            </Group>
            <Title order={2} c="red.7" style={{ fontWeight: 700 }}>
              Unauthorized Access
            </Title>
            <Text size="lg" c="dimmed" maw={320}>
              Sorry, you don&apos;t have permission to view this page.
              <br />
              Please check your access permissions or return home.
            </Text>
            <Group mt={16} gap="md">
              <Button
                component={Link}
                href="/"
                leftSection={<IconArrowLeft size={16} />}
                variant="outline"
                color="gray"
                radius="lg"
              >
                Go Home
              </Button>
              <Button
                // component={Link}
                // href="/signin"
                onClick={handleSignOut}
                variant="filled"
                color="red"
                radius="lg"
              >
                Sign In with Another Account
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Container>
    </Center>
  );
};

export default UnauthorizedPage;
