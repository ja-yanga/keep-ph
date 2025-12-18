"use client";

import {
  Box,
  Container,
  Title,
  Button,
  Center,
  Text,
  Loader,
  SimpleGrid,
  ThemeIcon,
  Paper,
  Stack,
} from "@mantine/core";
import {
  IconMail,
  IconPackage,
  IconScan,
  IconShieldLock,
} from "@tabler/icons-react";
import {useSession} from "@/components/SessionProvider";
import UserDashboard from "@/components/UserDashboard";
import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

export default function DashboardContent() {
  const {session, loading, error} = useSession();
  const router = useRouter();
  const firstName = session?.profile?.first_name ?? null;
  const displayName = firstName ?? session?.user?.email ?? "User";

  const [hasMailroom, setHasMailroom] = useState<boolean | null>(null);

  // Redirect admins
  useEffect(() => {
    if (!loading && session?.role === "admin") {
      router.push("/admin/dashboard");
    }
  }, [loading, session?.role, router]);

  useEffect(() => {
    if (loading) return;

    let mounted = true;
    async function load() {
      if (!session?.user?.id) {
        if (mounted) setHasMailroom(false);
        return;
      }
      try {
        const res = await fetch("/api/mailroom/registrations", {
          credentials: "include",
        });
        if (!mounted) return;
        if (!res.ok) {
          setHasMailroom(false);
          return;
        }
        const json = await res.json().catch(() => ({}));
        const rows = Array.isArray(json?.data ?? json) ? json.data ?? json : [];
        setHasMailroom(rows.length > 0);
      } catch {
        if (mounted) setHasMailroom(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [session?.user?.id, loading]);

  return (
    <Box style={{flex: 1, paddingTop: 32, paddingBottom: 32}}>
      {loading || hasMailroom === null ? (
        <Center style={{paddingTop: 64, paddingBottom: 64}}>
          <Loader />
        </Center>
      ) : hasMailroom ? (
        <Container size="xl" py="xl">
          <UserDashboard />
        </Container>
      ) : (
        <Container size="lg" py={60}>
          <Stack align="center" gap="xl">
            {/* Hero Section */}
            <Box style={{textAlign: "center", maxWidth: 800}}>
              <ThemeIcon
                size={80}
                radius={80}
                variant="light"
                color="blue"
                mb="lg"
              >
                <IconMail size={40} />
              </ThemeIcon>

              <Title order={1} size={42} fw={800} c="#1A202C" mb="md">
                Welcome, {loading ? "Loading…" : displayName}!
              </Title>

              <Text size="xl" c="dimmed" mb="xl">
                Your digital mailroom awaits. Get a prestigious address, manage
                packages remotely, and digitize your physical mail—all in one
                secure platform.
              </Text>

              <Button
                component="a"
                href="/mailroom/register"
                size="xl"
                radius="md"
                bg="#26316D"
                leftSection={<IconPackage size={20} />}
                style={{transition: "transform 0.2s"}}
              >
                Get Your Mailroom Address
              </Button>
            </Box>

            {/* Features Grid */}
            <SimpleGrid cols={{base: 1, sm: 3}} spacing={30} mt={40} w="100%">
              <Paper p="xl" radius="md" withBorder shadow="sm">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="blue"
                  mb="md"
                >
                  <IconShieldLock size={20} />
                </ThemeIcon>
                <Text fw={700} size="lg" mb="xs">
                  Secure Address
                </Text>
                <Text c="dimmed" size="sm">
                  Use our secure facility address for all your business and
                  personal mail needs. Keep your home address private.
                </Text>
              </Paper>

              <Paper p="xl" radius="md" withBorder shadow="sm">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="teal"
                  mb="md"
                >
                  <IconPackage size={20} />
                </ThemeIcon>
                <Text fw={700} size="lg" mb="xs">
                  Package Management
                </Text>
                <Text c="dimmed" size="sm">
                  Receive notifications instantly when packages arrive. Request
                  forwarding, pickup, or disposal with a click.
                </Text>
              </Paper>

              <Paper p="xl" radius="md" withBorder shadow="sm">
                <ThemeIcon
                  size="lg"
                  radius="md"
                  variant="light"
                  color="violet"
                  mb="md"
                >
                  <IconScan size={20} />
                </ThemeIcon>
                <Text fw={700} size="lg" mb="xs">
                  Digital Scanning
                </Text>
                <Text c="dimmed" size="sm">
                  Request scans of your important documents. View your physical
                  mail digitally from anywhere in the world.
                </Text>
              </Paper>
            </SimpleGrid>
          </Stack>
        </Container>
      )}
    </Box>
  );
}


