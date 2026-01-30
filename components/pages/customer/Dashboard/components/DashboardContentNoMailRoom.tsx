import React, { useState } from "react";
import {
  Container,
  Stack,
  Box,
  Title,
  Text,
  Button,
  SimpleGrid,
  ThemeIcon,
  Paper,
} from "@mantine/core";
import {
  IconMail,
  IconPackage,
  IconScan,
  IconShieldLock,
} from "@tabler/icons-react";
import { startRouteProgress } from "@/lib/route-progress";

const DashboardContentNoMailRoom = ({
  displayName,
  loading,
}: {
  displayName: string;
  loading: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGetMailroomAddress = () => {
    try {
      startRouteProgress();
      setIsLoading(true);
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Container size="lg" py={60}>
        <Stack align="center" gap="xl">
          {/* Hero Section */}
          <Box style={{ textAlign: "center", maxWidth: "min(800px, 94vw)" }}>
            <ThemeIcon
              size={64}
              radius={80}
              variant="light"
              color="#26316D"
              mb="lg"
            >
              <IconMail size={40} color="#26316D" />
            </ThemeIcon>

            <Title
              order={1}
              fw={800}
              c="#1A202C"
              mb="md"
              style={{ fontSize: "clamp(1.5rem, 5vw, 2.5rem)" }}
            >
              Welcome, {loading ? "Loading…" : displayName}!
            </Title>

            <Text
              c="#313131"
              mb="xl"
              style={{ fontSize: "clamp(1rem, 3.2vw, 1.125rem)" }}
            >
              Your digital mailroom awaits. Get a prestigious address, manage
              packages remotely, and digitize your physical mail—all in one
              secure platform.
            </Text>
            <Button
              className="mailroom-btn"
              component="a"
              href="/mailroom/register"
              size="xl"
              radius="md"
              bg="#26316D"
              onClick={handleGetMailroomAddress}
              loading={isLoading}
              disabled={isLoading}
              loaderProps={{ color: "white", size: "sm" }}
              leftSection={<IconPackage size={20} />}
              style={{
                transition: "transform 0.2s",
                maxWidth: 420,
                margin: "0 auto",
                display: "block",
                textDecoration: "none",
              }}
            >
              Get Your Mailroom Address
            </Button>
          </Box>

          {/* Features Grid */}
          <SimpleGrid
            cols={{ base: 1, sm: 2, md: 3 }}
            spacing={30}
            mt={40}
            w="100%"
          >
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
              <Text c="#313131" size="sm">
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
              <Text c="#313131" size="sm">
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
              <Text c="#313131" size="sm">
                Request scans of your important documents. View your physical
                mail digitally from anywhere in the world.
              </Text>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Container>
    </>
  );
};

export default DashboardContentNoMailRoom;
