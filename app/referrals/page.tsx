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
  useMantineTheme,
  Divider,
  Progress,
  TextInput,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconGift,
  IconUsers,
  IconTicket,
  IconAward,
  IconWallet,
} from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import { useSession } from "@/components/SessionProvider";
import { notifications } from "@mantine/notifications";
import RewardClaimModal from "@/components/RewardClaimModal";

export default function ReferralPage() {
  const { session } = useSession();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for reward logic
  const REWARD_THRESHOLD = 10;
  const referralCount = referrals.length;
  const isRewardReady = referralCount >= REWARD_THRESHOLD;
  // const isRewardReady = true;

  // New state for Modal and Claim processing
  const [opened, { open, close }] = useDisclosure(false);
  const [isClaiming, setIsClaiming] = useState(false);

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

  const handleClaimReward = async (
    paymentMethod: string,
    accountDetails: string
  ) => {
    if (!isRewardReady) return;

    setIsClaiming(true);
    close();

    try {
      // ** 1. Call your Supabase/Next.js API endpoint to record the claim **
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: session?.user?.id,
          paymentMethod,
          accountDetails,
          referralCount: referralCount,
        }),
      });

      if (res.ok) {
        notifications.show({
          title: "Claim Successful! 🎉",
          message:
            "Your reward is being processed and will be sent to your " +
            paymentMethod +
            " account shortly.",
          color: "green",
        });

        // ** 2. Optional: Refetch data to show reward as claimed or reset the referral count **
        // In a real app, you'd likely update the user's 'rewards_claimed' status.
      } else {
        const errorData = await res.json();
        notifications.show({
          title: "Claim Failed",
          message:
            errorData.error ||
            "An error occurred while claiming the reward. Please try again.",
          color: "red",
        });
      }
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Network error. Could not connect to the server.",
        color: "red",
      });
    } finally {
      setIsClaiming(false);
    }
  };

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

  const progressValue = Math.min((referralCount / REWARD_THRESHOLD) * 100, 100);

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

      {/* 1. Modal Component */}
      <RewardClaimModal
        opened={opened}
        onClose={close}
        onClaim={handleClaimReward}
        isLoading={isClaiming}
      />

      <Box component="main" style={{ flex: 1 }} py={{ base: 48, md: 80 }}>
        <Container size="md">
          <Stack align="center" gap="md" mb={40}>
            <ThemeIcon size={60} radius="xl" color="indigo" variant="light">
              <IconGift size={32} />
            </ThemeIcon>
            <Title order={1} style={{ fontWeight: 800, color: "#1A237E" }}>
              Refer & Earn Rewards
            </Title>
            <Text c="dimmed" size="lg" ta="center" maw={600}>
              Share your unique code below. Refer **{REWARD_THRESHOLD} friends**
              to unlock a cash reward!
            </Text>
          </Stack>

          {loading ? (
            <Center py="xl">
              <Loader color="blue" />
            </Center>
          ) : (
            <Stack gap="xl">
              {/* 2. Rewards Card Section (New) */}
              <Paper
                withBorder
                shadow="md"
                radius="lg"
                p={{ base: "lg", sm: "xl" }}
                bg={isRewardReady ? "green.0" : "white"}
                style={{
                  border: isRewardReady
                    ? "2px solid var(--mantine-color-green-5)"
                    : "",
                }}
              >
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap={4}>
                    <Title order={3} c={isRewardReady ? "green.7" : "indigo.9"}>
                      {isRewardReady
                        ? "Reward Unlocked! 🏆"
                        : `Referral Progress (${referralCount}/${REWARD_THRESHOLD})`}
                    </Title>
                    <Text c="dimmed" size="sm">
                      {isRewardReady
                        ? "Click below to claim your cash reward now!"
                        : `You need ${
                            REWARD_THRESHOLD - referralCount
                          } more referrals to claim your reward.`}
                    </Text>
                  </Stack>

                  <Stack gap="xs" maw={250} style={{ flexGrow: 1 }}>
                    <Progress
                      value={progressValue}
                      size="lg"
                      radius="xl"
                      color={isRewardReady ? "green" : "indigo"}
                      aria-label="Referral Progress"
                    />
                    <Button
                      onClick={open}
                      disabled={!isRewardReady || isClaiming}
                      loading={isClaiming}
                      color={isRewardReady ? "green" : "gray"}
                      variant={isRewardReady ? "filled" : "light"}
                      leftSection={<IconAward size={20} />}
                      radius="xl"
                    >
                      {isRewardReady ? "Claim Reward" : "Keep Referring"}
                    </Button>
                  </Stack>
                </Group>
              </Paper>

              {/* Code Section */}
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
                    {referralCount}
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
