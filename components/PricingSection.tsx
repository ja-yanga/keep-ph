"use client";

import {useState} from "react";
import {
  Container,
  Stack,
  Title,
  Text,
  Group,
  SegmentedControl,
  SimpleGrid,
  Card,
  ThemeIcon,
  List,
  Button,
  Box,
  rem,
  Badge,
} from "@mantine/core";
import {IconCheck, IconX} from "@tabler/icons-react";
import Link from "next/link";

const PRICING = {
  free: {monthly: 0, annual: 0},
  digital: {monthly: 299, annual: 239},
  personal: {monthly: 499, annual: 399},
  business: {monthly: 2999, annual: 2399},
};

export default function PricingSection() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <Box bg="#F1F3F5" py={80} id="pricing">
      <Container size="xl">
        <Stack align="center" gap="sm" mb={50}>
          <Title order={2} size={36} c="#1A237E">
            Simple, Transparent Pricing
          </Title>
          <Text c="dimmed" ta="center" size="lg" maw={600}>
            Choose the plan that best fits your needs.
          </Text>

          <Group mt="md">
            <SegmentedControl
              value={billing}
              onChange={(value) => setBilling(value as "monthly" | "annual")}
              data={[
                {label: "Monthly Billing", value: "monthly"},
                {label: "Annual Billing (-20%)", value: "annual"},
              ]}
              size="md"
              radius="xl"
              color="blue"
              bg="white"
            />
          </Group>
        </Stack>

        <SimpleGrid cols={{base: 1, sm: 2, lg: 4}} spacing="lg">
          {/* FREE PLAN */}
          <Card radius="lg" withBorder padding="xl">
            <Stack justify="space-between" h="100%">
              <Box>
                <Title order={4} mb="xs">
                  Free
                </Title>
                <Group align="baseline" gap={4}>
                  <Text size={rem(32)} fw={800}>
                    ₱0
                  </Text>
                  <Text c="dimmed">/mo</Text>
                </Group>
                <Text size="sm" c="dimmed" mt="xs">
                  Only affiliate features
                </Text>

                <List spacing="sm" mt="xl" size="sm" center>
                  <List.Item
                    icon={
                      <ThemeIcon color="red" size={20} radius="xl">
                        <IconX size={12} />
                      </ThemeIcon>
                    }
                  >
                    No Mail Services
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="red" size={20} radius="xl">
                        <IconX size={12} />
                      </ThemeIcon>
                    }
                  >
                    No Digital Storage
                  </List.Item>
                </List>
              </Box>
              <Button
                component={Link}
                href="/signup"
                variant="default"
                fullWidth
                radius="md"
                mt="xl"
              >
                I'm Interested
              </Button>
            </Stack>
          </Card>

          {/* DIGITAL PLAN */}
          <Card radius="lg" withBorder padding="xl">
            <Stack justify="space-between" h="100%">
              <Box>
                <Title order={4} mb="xs">
                  Digital
                </Title>
                <Group align="baseline" gap={4}>
                  <Text size={rem(32)} fw={800}>
                    ₱{PRICING.digital[billing]}
                  </Text>
                  <Text c="dimmed">/mo</Text>
                </Group>
                {billing === "annual" && (
                  <Text size="xs" c="green" fw={500}>
                    Billed ₱{(PRICING.digital.annual * 12).toLocaleString()}{" "}
                    yearly
                  </Text>
                )}
                <Text size="sm" c="dimmed" mt="xs">
                  Personal use, no parcels
                </Text>

                <List spacing="sm" mt="xl" size="sm" center>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Mail scanning
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    5GB Storage
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    7 days Retention
                  </List.Item>
                </List>
              </Box>
              <Button
                component={Link}
                href="/signup"
                variant="outline"
                fullWidth
                radius="md"
                mt="xl"
              >
                I'm Interested
              </Button>
            </Stack>
          </Card>

          {/* PERSONAL PLAN (POPULAR) */}
          <Card
            radius="lg"
            padding="xl"
            style={{
              border: "2px solid #1A237E",
              transform: "scale(1.02)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
              zIndex: 1,
            }}
          >
            <Stack justify="space-between" h="100%">
              <Box>
                <Group justify="space-between" mb="xs">
                  <Title order={4} c="#1A237E">
                    Personal
                  </Title>
                  <Badge color="blue" variant="filled">
                    Popular
                  </Badge>
                </Group>
                <Group align="baseline" gap={4}>
                  <Text size={rem(32)} fw={800} c="#1A237E">
                    ₱{PRICING.personal[billing]}
                  </Text>
                  <Text c="dimmed">/mo</Text>
                </Group>
                {billing === "annual" && (
                  <Text size="xs" c="green" fw={500}>
                    Billed ₱
                    {(PRICING.personal.annual * 12).toLocaleString()} yearly
                  </Text>
                )}
                <Text size="sm" c="dimmed" mt="xs">
                  Personal use + Parcels
                </Text>

                <List spacing="sm" mt="xl" size="sm" center>
                  <List.Item
                    icon={
                      <ThemeIcon color="blue" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Full mail management
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="blue" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    20GB Storage
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="blue" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    90 days Retention
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="blue" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Parcel Handling
                  </List.Item>
                </List>
              </Box>
              <Button
                component={Link}
                href="/signup"
                fullWidth
                radius="md"
                size="md"
                color="#1A237E"
                mt="xl"
              >
                I'm Interested
              </Button>
            </Stack>
          </Card>

          {/* BUSINESS PLAN */}
          <Card radius="lg" withBorder padding="xl">
            <Stack justify="space-between" h="100%">
              <Box>
                <Title order={4} mb="xs">
                  Business
                </Title>
                <Group align="baseline" gap={4}>
                  <Text size={rem(32)} fw={800}>
                    ₱{PRICING.business[billing].toLocaleString()}
                  </Text>
                  <Text c="dimmed">/mo</Text>
                </Group>
                {billing === "annual" && (
                  <Text size="xs" c="green" fw={500}>
                    Billed ₱
                    {(PRICING.business.annual * 12).toLocaleString()} yearly
                  </Text>
                )}
                <Text size="sm" c="dimmed" mt="xs">
                  Business use + Greenhills
                </Text>

                <List spacing="sm" mt="xl" size="sm" center>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    Virtual Office
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    200GB Storage
                  </List.Item>
                  <List.Item
                    icon={
                      <ThemeIcon color="teal" size={20} radius="xl">
                        <IconCheck size={12} />
                      </ThemeIcon>
                    }
                  >
                    365 days Retention
                  </List.Item>
                </List>
              </Box>
              <Button
                component={Link}
                href="/signup"
                variant="outline"
                fullWidth
                radius="md"
                mt="xl"
              >
                I'm Interested
              </Button>
            </Stack>
          </Card>
        </SimpleGrid>
      </Container>
    </Box>
  );
}


