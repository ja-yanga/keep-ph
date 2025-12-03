"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Container,
  Title,
  Text,
  Paper,
  Stack,
  Group,
  Button,
  Table,
  CopyButton,
  Loader,
  Center,
  Badge,
  ThemeIcon,
  Divider,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconGift,
  IconUsers,
  IconTicket,
} from "@tabler/icons-react";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";

export default function ReferralPage() {
  const { session } = useSession();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReferralData() {
      if (!session?.user?.id) return;

      try {
        setLoading(true);

        // 1. Call API to get or generate the referral code
        const resCode = await fetch("/api/referrals/generate", {
          method: "POST",
        });
        const dataCode = await resCode.json();

        if (dataCode.referral_code) {
          setReferralCode(dataCode.referral_code);
        }

        // 2. Call API to fetch referrals list
        const resList = await fetch(
          `/api/referrals/list?user_id=${session.user.id}`
        );
        const dataList = await resList.json();

        if (resList.ok && dataList.referrals) {
          setReferrals(dataList.referrals);
        } else {
          console.error("Failed to fetch referrals list:", dataList.error);
        }
      } catch (err) {
        console.error("Error loading referrals:", err);
      } finally {
        setLoading(false);
      }
    }

    if (session) {
      loadReferralData();
    }
  }, [session]);

  const rows = referrals.map((item) => (
    <Table.Tr key={item.referrals_id}>
      <Table.Td>
        <Group gap="sm">
          <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
            <IconUsers size={12} />
          </ThemeIcon>
          <Text fw={500} size="sm" c="dark.6">
            {item.referrals_service_type || "General Referral"}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Text size="sm" c="dimmed">
          {item.referrals_referred_email || "N/A"}
        </Text>
      </Table.Td>
      <Table.Td>
        <Text c="dimmed" size="sm">
          {new Date(item.referrals_date_created).toLocaleDateString()}
        </Text>
      </Table.Td>
      <Table.Td style={{ textAlign: "right" }}>
        <Badge color="green" variant="light" size="sm">
          Completed
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Box
      style={{
        minHeight: "100dvh",
        backgroundColor: "#F8FAFC",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardNav />

      <Box component="main" style={{ flex: 1 }} py={{ base: 48, md: 80 }}>
        <Container size="md">
          <Stack align="center" gap="md" mb={40}>
            <ThemeIcon size={60} radius="xl" color="indigo" variant="light">
              <IconGift size={32} />
            </ThemeIcon>
            <Title order={1} style={{ fontWeight: 800, color: "#1A237E" }}>
              Refer a Friend
            </Title>
            <Text c="dimmed" size="lg" ta="center" maw={600}>
              Share your unique code below. When your friends sign up using this
              code, you both earn rewards!
            </Text>
          </Stack>

          {loading ? (
            <Center py="xl">
              <Loader color="blue" />
            </Center>
          ) : (
            <Stack gap="xl">
              {/* Code Section - Redesigned to be a "Hero" card */}
              <Paper
                withBorder
                shadow="sm"
                radius="lg"
                p={{ base: "lg", sm: "xl" }}
                bg="white"
              >
                <Stack align="center" gap="xs">
                  <Group gap="xs">
                    <IconTicket size={16} color="gray" />
                    <Text
                      size="xs"
                      fw={700}
                      c="dimmed"
                      tt="uppercase"
                      style={{ letterSpacing: 1 }}
                    >
                      Your Unique Referral Code
                    </Text>
                  </Group>

                  <Text
                    size="3.5rem"
                    fw={900}
                    c="indigo.9"
                    style={{ lineHeight: 1, letterSpacing: 2 }}
                    ta="center"
                  >
                    {referralCode || "..."}
                  </Text>

                  <CopyButton value={referralCode || ""} timeout={2000}>
                    {({ copied, copy }) => (
                      <Button
                        color={copied ? "teal" : "indigo"}
                        variant={copied ? "filled" : "light"}
                        onClick={copy}
                        disabled={!referralCode}
                        radius="xl"
                        mt="md"
                        size="md"
                        leftSection={
                          copied ? (
                            <IconCheck size={18} />
                          ) : (
                            <IconCopy size={18} />
                          )
                        }
                      >
                        {copied ? "Copied to Clipboard" : "Copy Code"}
                      </Button>
                    )}
                  </CopyButton>
                </Stack>
              </Paper>

              {/* Table Section */}
              <Box>
                <Group mb="md" align="center">
                  <IconUsers size={20} color="#1A237E" />
                  <Title order={3} style={{ color: "#1A237E" }}>
                    Referral History
                  </Title>
                  <Badge variant="light" color="gray" size="lg" circle>
                    {referrals.length}
                  </Badge>
                </Group>

                <Paper
                  withBorder
                  radius="md"
                  shadow="sm"
                  style={{ overflow: "hidden" }}
                >
                  {referrals.length > 0 ? (
                    <Table verticalSpacing="md" highlightOnHover>
                      <Table.Thead bg="gray.0">
                        <Table.Tr>
                          <Table.Th>Service Type</Table.Th>
                          <Table.Th>Referred Email</Table.Th>
                          <Table.Th>Date Joined</Table.Th>
                          <Table.Th style={{ textAlign: "right" }}>
                            Status
                          </Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                  ) : (
                    <Stack align="center" py={40} gap="xs">
                      <ThemeIcon
                        color="gray"
                        variant="light"
                        size="xl"
                        radius="xl"
                      >
                        <IconUsers size={24} />
                      </ThemeIcon>
                      <Text fw={600} c="dark.4">
                        No referrals yet
                      </Text>
                      <Text c="dimmed" size="sm">
                        Share your code to get started!
                      </Text>
                    </Stack>
                  )}
                </Paper>
              </Box>
            </Stack>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
