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
} from "@mantine/core";
import { IconCopy, IconCheck } from "@tabler/icons-react";
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
        <Text fw={500} c="#1A237E">
          {item.referrals_service_type || "General Referral"}
        </Text>
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
        <Badge color="green" variant="light">
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

      <Box component="main" style={{ flex: 1 }} py={{ base: 48, md: 96 }}>
        <Container size="md">
          <Stack align="center" gap="md" mb={40}>
            <Title order={1} style={{ fontWeight: 700, color: "#1A237E" }}>
              Refer a Friend
            </Title>
            <Text c="dimmed" size="lg" ta="center" maw={600}>
              Share your code and earn rewards when your friends sign up.
            </Text>
          </Stack>

          {loading ? (
            <Center py="xl">
              <Loader color="blue" />
            </Center>
          ) : (
            <Paper
              withBorder
              shadow="sm"
              radius="lg"
              p={{ base: "md", sm: "xl" }}
            >
              <Stack gap="xl">
                {/* Code Section */}
                <Paper bg="#E8EAF6" p="lg" radius="md">
                  <Group justify="space-between" align="center">
                    <Box>
                      <Text size="sm" fw={500} c="#5C6AC4" mb={4}>
                        Your Referral Code
                      </Text>
                      <Title order={3} style={{ color: "#1A237E" }}>
                        {referralCode || "Generating..."}
                      </Title>
                    </Box>

                    <CopyButton value={referralCode || ""} timeout={2000}>
                      {({ copied, copy }) => (
                        <Button
                          color={copied ? "teal" : "indigo"}
                          onClick={copy}
                          disabled={!referralCode}
                          leftSection={
                            copied ? (
                              <IconCheck size={16} />
                            ) : (
                              <IconCopy size={16} />
                            )
                          }
                          style={{
                            backgroundColor: copied ? undefined : "#1A237E",
                          }}
                        >
                          {copied ? "Copied" : "Copy Code"}
                        </Button>
                      )}
                    </CopyButton>
                  </Group>
                </Paper>

                {/* Table Section */}
                <Box>
                  <Title order={3} mb="md" style={{ color: "#1A237E" }}>
                    Referred Users
                  </Title>
                  <Paper withBorder radius="md" style={{ overflow: "hidden" }}>
                    {referrals.length > 0 ? (
                      <Table verticalSpacing="sm" highlightOnHover>
                        <Table.Thead bg="gray.0">
                          <Table.Tr>
                            <Table.Th>Service Type</Table.Th>
                            <Table.Th>Referred Email</Table.Th>
                            <Table.Th>Date Created</Table.Th>
                            <Table.Th />
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                      </Table>
                    ) : (
                      <Box p="xl" ta="center">
                        <Text c="dimmed">
                          No referrals yet. Share your code to get started!
                        </Text>
                      </Box>
                    )}
                  </Paper>
                </Box>
              </Stack>
            </Paper>
          )}
        </Container>
      </Box>

      <Footer />
    </Box>
  );
}
