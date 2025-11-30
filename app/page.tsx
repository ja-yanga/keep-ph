"use client";

import React, { useState } from "react";
import {
  Container,
  Grid,
  Stack,
  Title,
  Text,
  Button,
  Image,
  Box,
  SimpleGrid,
  Card,
  ThemeIcon,
  Group,
  Badge,
  List,
  SegmentedControl,
  Center,
  rem,
  Paper,
} from "@mantine/core";
import {
  IconMail,
  IconTruck,
  IconBuilding,
  IconCheck,
  IconX,
  IconArrowRight,
} from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  const PRICING = {
    free: { monthly: 0, annual: 0 },
    digital: { monthly: 299, annual: 239 },
    personal: { monthly: 499, annual: 399 },
    business: { monthly: 2999, annual: 2399 },
  };

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8F9FA",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      <Nav />

      <main style={{ flex: 1 }}>
        {/* HERO SECTION */}
        <Box
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0) 0%, #F1F3F5 100%)",
            paddingTop: "4rem",
            paddingBottom: "6rem",
          }}
        >
          <Container size="xl">
            <Grid gutter={50} align="center">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="lg">
                  <Badge
                    variant="light"
                    color="blue"
                    size="lg"
                    radius="sm"
                    style={{ width: "fit-content" }}
                  >
                    🚀 Now serving Metro Manila
                  </Badge>
                  <Title
                    order={1}
                    style={{
                      fontWeight: 800,
                      fontSize: rem(48),
                      lineHeight: 1.1,
                      color: "#1A237E",
                    }}
                  >
                    Your Business Address in the{" "}
                    <Text
                      span
                      inherit
                      variant="gradient"
                      gradient={{ from: "#1A237E", to: "#3949AB", deg: 45 }}
                    >
                      Philippines
                    </Text>
                    , Simplified.
                  </Title>
                  <Text c="dimmed" size="xl" style={{ maxWidth: 500 }}>
                    Get a prestigious virtual address, digital mail scanning,
                    and mail forwarding services. Manage your mail from anywhere
                    in the world.
                  </Text>
                  <Group mt="md">
                    <Button
                      size="xl"
                      radius="md"
                      color="#1A237E"
                      rightSection={<IconArrowRight size={20} />}
                      onClick={() => router.push("/signup")}
                    >
                      Get Started
                    </Button>
                    <Button
                      size="xl"
                      variant="default"
                      radius="md"
                      onClick={() => {
                        document
                          .getElementById("pricing")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      View Pricing
                    </Button>
                  </Group>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box style={{ position: "relative" }}>
                  <Box
                    style={{
                      position: "absolute",
                      top: -20,
                      right: -20,
                      width: "100%",
                      height: "100%",
                      background:
                        "linear-gradient(135deg, #E8EAF6 0%, #C5CAE9 100%)",
                      borderRadius: 24,
                      zIndex: 0,
                    }}
                  />
                  <Image
                    src="https://images.unsplash.com/photo-1497215728101-856f4ea42174?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Modern Office"
                    radius="lg"
                    style={{ position: "relative", zIndex: 1 }}
                  />
                </Box>
              </Grid.Col>
            </Grid>
          </Container>
        </Box>

        {/* SERVICES SECTION */}
        <Container size="xl" py={80} id="services">
          <Stack align="center" gap="sm" mb={60}>
            <Title order={2} size={36} c="#1A237E">
              Everything You Need to Go Virtual
            </Title>
            <Text c="dimmed" ta="center" size="lg" maw={700}>
              From a simple mail dropbox to a complete virtual office, we've got
              a solution for you.
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, md: 3 }} spacing={30}>
            {[
              {
                icon: IconMail,
                title: "Digital Mail Scanning",
                desc: "Receive your mail online. We scan the exterior and contents (on your request) so you can access it securely from anywhere.",
                color: "blue",
              },
              {
                icon: IconTruck,
                title: "Mail Transfer & Forwarding",
                desc: "Need the physical copy? We'll forward your mail and packages to any address in the world, quickly and reliably.",
                color: "orange",
              },
              {
                icon: IconBuilding,
                title: "Virtual Office Addresses",
                desc: "Establish a professional presence with a prestigious business address in a prime location. Perfect for startups and freelancers.",
                color: "indigo",
              },
            ].map((feature, index) => (
              <Paper
                key={index}
                radius="md"
                p="xl"
                withBorder
                style={{
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  cursor: "default",
                }}
                // Add hover effect via sx or style if using CSS modules,
                // or just inline simple hover logic if needed, but Mantine Paper is static by default.
              >
                <Stack align="flex-start" gap="md">
                  <ThemeIcon
                    size={60}
                    radius="md"
                    variant="light"
                    color={feature.color}
                  >
                    <feature.icon size={32} />
                  </ThemeIcon>
                  <Title order={3} size={22}>
                    {feature.title}
                  </Title>
                  <Text c="dimmed" style={{ lineHeight: 1.6 }}>
                    {feature.desc}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </SimpleGrid>
        </Container>

        {/* PRICING SECTION */}
        <Box bg="#F1F3F5" py={80} id="pricing">
          <Container size="xl">
            <Stack align="center" gap="sm" mb={50}>
              <Title order={2} size={36} c="#1A237E">
                Simple, Transparent Pricing
              </Title>
              <Text c="dimmed" ta="center" size="lg" maw={600}>
                Choose a plan that fits your needs. Upgrade, downgrade, or
                cancel anytime.
              </Text>

              <Group mt="md">
                <SegmentedControl
                  value={billing}
                  onChange={(value) =>
                    setBilling(value as "monthly" | "annual")
                  }
                  data={[
                    { label: "Monthly Billing", value: "monthly" },
                    { label: "Annual Billing (-20%)", value: "annual" },
                  ]}
                  size="md"
                  radius="xl"
                  color="blue"
                  bg="white"
                />
              </Group>
            </Stack>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
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
                  <Button variant="default" fullWidth radius="md" mt="xl">
                    Sign Up Free
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
                  <Button variant="outline" fullWidth radius="md" mt="xl">
                    Get Digital
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
                    fullWidth
                    radius="md"
                    size="md"
                    color="#1A237E"
                    mt="xl"
                  >
                    Get Personal
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
                  <Button variant="outline" fullWidth radius="md" mt="xl">
                    Get Business
                  </Button>
                </Stack>
              </Card>
            </SimpleGrid>
          </Container>
        </Box>
      </main>

      <Footer />
    </Box>
  );
}
