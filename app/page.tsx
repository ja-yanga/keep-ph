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
  UnstyledButton,
  List,
} from "@mantine/core";
import {
  IconMail,
  IconTruck,
  IconBuilding,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function Home() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <>
      <Box
        style={{
          minHeight: "100dvh",
          backgroundColor: "#F5F6FA",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Nav />

        <main style={{ flex: 1 }}>
          <Container size="xl" py="xl">
            {/* HERO */}
            <Grid gutter="xl" align="center">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <Stack gap="md">
                  <Title
                    order={1}
                    style={{ fontWeight: 800, lineHeight: 1.05 }}
                  >
                    Your Business Address in the Philippines, Simplified.
                  </Title>
                  <Text c="dimmed" size="lg">
                    Get a prestigious virtual address, digital mail scanning,
                    and mail forwarding services. Manage your mail from anywhere
                    in the world.
                  </Text>
                  <Button
                    size="lg"
                    style={{
                      width: "fit-content",
                      backgroundColor: "#FFC107",
                      color: "#1A237E",
                      fontWeight: 700,
                    }}
                  >
                    Get Started Today
                  </Button>
                </Stack>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <Box
                  style={{
                    position: "relative",
                    maxWidth: 520,
                    marginLeft: "auto",
                  }}
                >
                  <Box
                    style={{
                      position: "absolute",
                      inset: -8,
                      borderRadius: 16,
                      background: "linear-gradient(90deg,#1A237E,#5C6AC4)",
                      opacity: 0.18,
                      filter: "blur(18px)",
                    }}
                  />
                  <Image
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAbe1atW6q4r9O-n4gfbDazJhNZbWLDTOzpE_YwoJ_aYBB9NaEBjI5an-tiXxXw0UATdF87UA7WCFxn84tqvoFWDEGvUgADWhzwVOPkWVYyz3R_oNDWK_0XS13AujWMSHeZtNklNjKRWeSdSAe0CALE7JEHq3qWOapCwNiTymXy2x0OW33Hc1Hr5B8OI0lhRFhT-q2dQXAD1MDQQxGQlcTpVFL8NIxEUHPSyw1WR-rofq0782oiqPR7eP0Bnz9ZDx6iVwEg2GwlQsaa"
                    alt="Hero"
                    radius="md"
                  />
                </Box>
              </Grid.Col>
            </Grid>

            {/* SERVICES */}
            <Box py="xl" id="services">
              <Stack align="center" gap="sm" mb="md">
                <Title order={2} size="h3">
                  Everything You Need to Go Virtual
                </Title>
                <Text c="dimmed" ta="center" style={{ maxWidth: 720 }}>
                  From a simple mail dropbox to a complete virtual office, we've
                  got a solution for you.
                </Text>
              </Stack>

              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <Card radius="md" shadow="sm" withBorder>
                  <Stack align="center" gap="md">
                    <ThemeIcon size={56} radius="xl" color="gray">
                      <IconMail size={28} />
                    </ThemeIcon>
                    <Title order={4}>Digital Mail Scanning</Title>
                    <Text c="dimmed" ta="center">
                      Receive your mail online. We scan the exterior and
                      contents (on your request) so you can access it securely
                      from anywhere.
                    </Text>
                  </Stack>
                </Card>

                <Card radius="md" shadow="sm" withBorder>
                  <Stack align="center" gap="md">
                    <ThemeIcon size={56} radius="xl" color="gray">
                      <IconTruck size={28} />
                    </ThemeIcon>
                    <Title order={4}>Mail Transfer & Forwarding</Title>
                    <Text c="dimmed" ta="center">
                      Need the physical copy? We'll forward your mail and
                      packages to any address in the world, quickly and
                      reliably.
                    </Text>
                  </Stack>
                </Card>

                <Card radius="md" shadow="sm" withBorder>
                  <Stack align="center" gap="md">
                    <ThemeIcon size={56} radius="xl" color="gray">
                      <IconBuilding size={28} />
                    </ThemeIcon>
                    <Title order={4}>Virtual Office Addresses</Title>
                    <Text c="dimmed" ta="center">
                      Establish a professional presence with a prestigious
                      business address in a prime location. Perfect for startups
                      and freelancers.
                    </Text>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Box>

            {/* PRICING */}
            <Box py="xl" id="pricing">
              <Stack align="center" gap="sm" mb="md">
                <Title order={2}>Find the Perfect Plan</Title>
                <Text c="dimmed" ta="center" style={{ maxWidth: 720 }}>
                  Choose a plan that fits your needs. Upgrade, downgrade, or
                  cancel anytime.
                </Text>

                <Group justify="center" gap="xs">
                  <Text fw={600} c={billing === "monthly" ? "dark" : "gray"}>
                    Monthly
                  </Text>

                  <UnstyledButton
                    onClick={() =>
                      setBilling((b) =>
                        b === "monthly" ? "annual" : "monthly"
                      )
                    }
                    aria-label="Toggle billing"
                    style={{
                      width: 56,
                      height: 28,
                      borderRadius: 999,
                      backgroundColor: "#1A237E",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        billing === "monthly" ? "flex-start" : "flex-end",
                    }}
                  >
                    <Box
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: "#fff",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      }}
                    />
                  </UnstyledButton>

                  <Text fw={600} c={billing === "annual" ? "dark" : "gray"}>
                    Annual{" "}
                    {/* <Badge color="yellow" ml="xs">
                      Save 20%
                    </Badge> */}
                  </Text>
                </Group>
              </Stack>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
                <Card radius="md" withBorder padding="lg">
                  <Stack style={{ minHeight: 320 }}>
                    <Title order={5}>Free</Title>
                    <Text size="xl" fw={800}>
                      ₱0{" "}
                      <Text span c="dimmed" size="sm">
                        /mo
                      </Text>
                    </Text>
                    <Text c="dimmed" style={{ minHeight: 40 }}>
                      Only affiliate features
                    </Text>
                    <List spacing="sm" mt="md" center>
                      <List.Item
                        icon={
                          <ThemeIcon color="red" size={20} radius="xl">
                            <IconX size={14} />
                          </ThemeIcon>
                        }
                      >
                        No Mail Services
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="red" size={20} radius="xl">
                            <IconX size={14} />
                          </ThemeIcon>
                        }
                      >
                        No Digital Storage
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="red" size={20} radius="xl">
                            <IconX size={14} />
                          </ThemeIcon>
                        }
                      >
                        No Retention
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="red" size={20} radius="xl">
                            <IconX size={14} />
                          </ThemeIcon>
                        }
                      >
                        No Actions Allowed
                      </List.Item>
                    </List>
                    <Button variant="outline" fullWidth mt="auto">
                      Sign Up
                    </Button>
                  </Stack>
                </Card>

                <Card radius="md" withBorder padding="lg">
                  <Stack style={{ minHeight: 320 }}>
                    <Title order={5}>Digital</Title>
                    <Text size="xl" fw={800}>
                      {billing === "monthly" ? "₱299" : "₱239"}{" "}
                      <Text span c="dimmed" size="sm">
                        /mo
                      </Text>
                    </Text>
                    <Text c="dimmed" style={{ minHeight: 40 }}>
                      Personal use, no parcel handling
                    </Text>
                    <List spacing="sm" mt="md" center>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Mail scanning & digitization
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        5GB Digital Storage
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        7 days Retention
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Scan only Actions
                      </List.Item>
                    </List>
                    <Button variant="default" fullWidth mt="auto">
                      Sign Up
                    </Button>
                  </Stack>
                </Card>

                <Card
                  radius="md"
                  padding="lg"
                  style={{ borderWidth: 2, borderColor: "#1A237E" }}
                >
                  <Stack style={{ minHeight: 320 }}>
                    <Group justify="space-between">
                      <Title order={5} c="#1A237E">
                        Personal
                      </Title>
                      <Badge color="blue">Popular</Badge>
                    </Group>
                    <Text size="xl" fw={800} c="#1A237E">
                      {billing === "monthly" ? "₱499" : "₱399"}{" "}
                      <Text span c="dimmed" size="sm">
                        /mo
                      </Text>
                    </Text>
                    <Text c="dimmed" style={{ minHeight: 40 }}>
                      Personal use only, parcels handled
                    </Text>
                    <List spacing="sm" mt="md" center>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Full mail management
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        20GB Digital Storage
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        90 days Retention
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Scan, transfer, dispose Actions
                      </List.Item>
                    </List>
                    <Button
                      fullWidth
                      style={{
                        backgroundColor: "#1A237E",
                        color: "#fff",
                        marginTop: "auto",
                      }}
                    >
                      Sign Up
                    </Button>
                  </Stack>
                </Card>

                <Card radius="md" withBorder padding="lg">
                  <Stack style={{ minHeight: 320 }}>
                    <Title order={5}>Business</Title>
                    <Text size="xl" fw={800}>
                      {billing === "monthly" ? "₱2,999" : "₱2,399"}{" "}
                      <Text span c="dimmed" size="sm">
                        /mo
                      </Text>
                    </Text>
                    <Text c="dimmed" style={{ minHeight: 40 }}>
                      Business use, parcel handling, Greenhills address
                    </Text>
                    <List spacing="sm" mt="md" center>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Professional virtual office
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        200GB Digital Storage
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        365 days Retention
                      </List.Item>
                      <List.Item
                        icon={
                          <ThemeIcon color="green" size={20} radius="xl">
                            <IconCheck size={14} />
                          </ThemeIcon>
                        }
                      >
                        Scan, transfer, dispose Actions
                      </List.Item>
                    </List>
                    <Button variant="outline" fullWidth mt="auto">
                      Sign Up
                    </Button>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Box>
          </Container>
        </main>

        <Footer />
      </Box>
    </>
  );
}
