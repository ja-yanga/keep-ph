"use client";

import React, {useEffect, useState} from "react";
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
  Progress,
} from "@mantine/core";
import {
  IconCopy,
  IconCheck,
  IconGift,
  IconUsers,
  IconTicket,
  IconAward,
} from "@tabler/icons-react";
import {useDisclosure} from "@mantine/hooks";
import {useSession} from "@/components/SessionProvider";
import RewardClaimModal from "@/components/RewardClaimModal";
import ClaimStatusModal from "@/components/ClaimStatusModal";

export default function ReferralsContent() {
  const {session} = useSession();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // State for reward logic
  const REWARD_THRESHOLD = 10;
  const referralCount = referrals.length;
  const isRewardReady = referralCount >= REWARD_THRESHOLD;

  // New state for Modal
  const [opened, {open, close}] = useDisclosure(false);
  const [claims, setClaims] = useState<any[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [statusOpened, {open: openStatus, close: closeStatus}] =
    useDisclosure(false);

  const latestClaim = claims?.[0] ?? null;
  // Only two server statuses to manage: PROCESSING and PAID
  const hasPending = latestClaim && latestClaim.status === "PROCESSING";
  const hasAnyClaim = claims && claims.length > 0;

  // extract load logic into a callable function so modal can refresh after claim
  const fetchReferralData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      // run generate (only if we don't already have a code) and list in parallel
      const genPromise = !referralCode
        ? fetch("/api/referrals/generate", {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null)
        : Promise.resolve(null);
      const listPromise = fetch(
        `/api/referrals/list?user_id=${session.user.id}`,
        {signal: controller.signal}
      ).catch(() => null);

      const [genRes, listRes] = await Promise.allSettled([
        genPromise,
        listPromise,
      ]);

      if (genRes.status === "fulfilled" && genRes.value) {
        const dataCode = await genRes.value.json().catch(() => ({}));
        if (dataCode.referral_code) setReferralCode(dataCode.referral_code);
      }

      if (listRes.status === "fulfilled" && listRes.value) {
        const dataList = await listRes.value.json().catch(() => ({}));
        if (listRes.value.ok && dataList.referrals) {
          setReferrals(dataList.referrals);
        } else {
          console.error("Failed to fetch referrals list:", dataList.error);
        }
      }

      // fetch rewards status in background (non-blocking)
      fetchRewardsStatus();
    } catch (err: any) {
      if (err.name !== "AbortError")
        console.error("Error loading referrals:", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };

  const fetchRewardsStatus = async () => {
    if (!session?.user?.id) return;
    setClaimLoading(true);
    try {
      const res = await fetch(`/api/rewards/status?userId=${session.user.id}`);
      if (!res.ok) return;
      const json = await res.json();
      setClaims(json.claims || []);
    } catch (e) {
      console.error("fetchRewardsStatus", e);
    } finally {
      setClaimLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchReferralData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <Table.Td style={{textAlign: "right"}}>
        <Badge color="green" variant="light" size="sm">
          Completed
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  const progressValue = Math.min((referralCount / REWARD_THRESHOLD) * 100, 100);

  // Helper to mask account details in UI
  const maskAccount = (value?: string | null) => {
    if (!value) return "—";
    const v = String(value);
    if (v.length <= 6) return v.replace(/.(?=.{2})/g, "*");
    return v.slice(0, 3) + v.slice(3, -3).replace(/./g, "*") + v.slice(-3);
  };

  return (
    <Box component="main" style={{flex: 1}} py={{base: 48, md: 80}}>
      <Container size="md">
        {/* 1. Modal Component */}
        <RewardClaimModal
          opened={opened}
          onClose={close}
          userId={session?.user?.id}
          onSuccess={fetchReferralData}
          isLoading={false}
        />
        <ClaimStatusModal
          opened={statusOpened}
          onClose={closeStatus}
          claim={latestClaim}
        />

        <Stack align="center" gap="md" mb={40}>
          <ThemeIcon size={60} radius="xl" color="indigo" variant="light">
            <IconGift size={32} />
          </ThemeIcon>
          <Title order={1} style={{fontWeight: 800, color: "#1A237E"}}>
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
            {hasAnyClaim ? (
              <Paper
                withBorder
                shadow="md"
                radius="lg"
                p={{base: "lg", sm: "xl"}}
                bg="white"
              >
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap="xs">
                    <Group gap="sm" align="center">
                      <Title order={4} c="dark.7" style={{margin: 0}}>
                        Reward Claim
                      </Title>
                      <Badge
                        color={
                          latestClaim?.status === "PAID" ? "green" : "orange"
                        }
                      >
                        {latestClaim?.status}
                      </Badge>
                    </Group>

                    <Text size="sm" c="dimmed">
                      You already requested a reward. See the claim details
                      below.
                    </Text>

                    <Stack gap={4}>
                      <Text size="sm">
                        <strong>Amount:</strong> PHP{" "}
                        {latestClaim?.amount ?? "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Method:</strong>{" "}
                        {(latestClaim?.payment_method).toUpperCase() ?? "—"}
                      </Text>
                      <Text size="sm">
                        <strong>Account:</strong>{" "}
                        {maskAccount(latestClaim?.account_details)}
                      </Text>
                      <Text size="sm">
                        <strong>Requested:</strong>{" "}
                        {latestClaim?.created_at
                          ? new Date(latestClaim.created_at).toLocaleString()
                          : "—"}
                      </Text>
                    </Stack>
                  </Stack>

                  <Stack gap="xs" maw={250} style={{alignItems: "flex-end"}}>
                    <Button
                      onClick={() => openStatus()}
                      color={
                        latestClaim?.status === "PAID" ? "green" : "orange"
                      }
                      variant="filled"
                      leftSection={<IconAward size={18} />}
                      radius="xl"
                    >
                      {latestClaim?.status === "PAID"
                        ? "View Payout — Paid"
                        : "View Claim — Processing"}
                    </Button>
                  </Stack>
                </Group>
              </Paper>
            ) : (
              <Paper
                withBorder
                shadow="md"
                radius="lg"
                p={{base: "lg", sm: "xl"}}
                bg={isRewardReady ? "green.0" : "white"}
                style={{
                  border: isRewardReady
                    ? "2px solid var(--mantine-color-green-5)"
                    : "",
                }}
              >
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap={4}>
                    <Title
                      order={3}
                      c={isRewardReady ? "green.7" : "indigo.9"}
                    >
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

                  <Stack gap="xs" maw={250} style={{flexGrow: 1}}>
                    <Progress
                      value={progressValue}
                      size="lg"
                      radius="xl"
                      color={isRewardReady ? "green" : "indigo"}
                      aria-label="Referral Progress"
                    />
                    <Button
                      onClick={() => {
                        // if user already has any claim -> always view status
                        if (hasAnyClaim) {
                          openStatus();
                        } else {
                          open(); // open claim modal to submit
                        }
                      }}
                      // only enable claim when eligible and no existing claim
                      disabled={!isRewardReady && !hasAnyClaim}
                      loading={claimLoading}
                      color={
                        hasPending
                          ? "orange"
                          : latestClaim?.status === "PAID"
                          ? "green"
                          : isRewardReady
                          ? "green"
                          : "gray"
                      }
                      variant={isRewardReady ? "filled" : "light"}
                      leftSection={<IconAward size={20} />}
                      radius="xl"
                    >
                      {hasPending
                        ? "View Claim — Processing"
                        : latestClaim?.status === "PAID"
                        ? "View Payout — Paid"
                        : hasAnyClaim
                        ? "View Claim"
                        : isRewardReady
                        ? "Claim Reward"
                        : "Keep Referring"}
                    </Button>
                  </Stack>
                </Group>
              </Paper>
            )}

            {/* Code Section */}
            <Paper
              withBorder
              shadow="sm"
              radius="lg"
              p={{base: "lg", sm: "xl"}}
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
                    style={{letterSpacing: 1}}
                  >
                    Your Unique Referral Code
                  </Text>
                </Group>

                <Text
                  size="3.5rem"
                  fw={900}
                  c="indigo.9"
                  style={{lineHeight: 1, letterSpacing: 2}}
                  ta="center"
                >
                  {referralCode || "..."}
                </Text>

                <CopyButton value={referralCode || ""} timeout={2000}>
                  {({copied, copy}) => (
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
                <Title order={3} style={{color: "#1A237E"}}>
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
                style={{overflow: "hidden"}}
              >
                {referrals.length > 0 ? (
                  <Table verticalSpacing="md" highlightOnHover>
                    <Table.Thead bg="gray.0">
                      <Table.Tr>
                        <Table.Th>Service Type</Table.Th>
                        <Table.Th>Referred Email</Table.Th>
                        <Table.Th>Date Joined</Table.Th>
                        <Table.Th style={{textAlign: "right"}}>
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
  );
}


