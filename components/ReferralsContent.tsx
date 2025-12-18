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
import { useDisclosure } from "@mantine/hooks";
import { useSession } from "@/components/SessionProvider";
import RewardClaimModal from "@/components/RewardClaimModal";
import ClaimStatusModal from "@/components/ClaimStatusModal";

type ReferralRow = {
  referral_id?: string;
  referrals_id?: string;
  id?: string;
  referral_service_type?: string | null;
  referrals_service_type?: string | null;
  service_type?: string | null;
  referrals_referred_email?: string | null;
  referral_referred_email?: string | null;
  referral_referred_user_email?: string | null;
  referred_email?: string | null;
  referral_referred_user_id?: string | number | null;
  referral_date_created?: string | null;
  referrals_date_created?: string | null;
  date_created?: string | null;
  created_at?: string | null;
};

type ClaimRow = {
  id?: string;
  amount?: number | null;
  payment_method?: string | null;
  account_details?: string | null;
  status?: string | null;
  referral_count?: number | null;
  created_at?: string | null;
  processed_at?: string | null;
  proof_path?: string | null;
  proof_url?: string | null;
};

export default function ReferralsContent() {
  const { session } = useSession();
  // helper: pick first string-valued key from record
  const pickString = (rec: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) {
      const v = rec[k];
      if (typeof v === "string") return v;
    }
    return null;
  };
  // helper: pick first number-valued key
  const pickNumber = (rec: Record<string, unknown>, ...keys: string[]) => {
    for (const k of keys) {
      const v = rec[k];
      if (typeof v === "number") return v;
    }
    return undefined;
  };
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  // State for reward logic
  const REWARD_THRESHOLD = 10;
  const referralCount = referrals.length;
  const isRewardReady = referralCount >= REWARD_THRESHOLD;

  // New state for Modal
  const [opened, { open, close }] = useDisclosure(false);
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [claimLoading, setClaimLoading] = useState(false);
  const [statusOpened, { open: openStatus, close: closeStatus }] =
    useDisclosure(false);

  const latestClaim: ClaimRow | null = claims?.[0] ?? null;
  const hasPending = latestClaim?.status === "PROCESSING";
  const hasAnyClaim = claims.length > 0;

  const fetchReferralData = async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const genPromise = !referralCode
        ? fetch("/api/referrals/generate", {
            method: "POST",
            signal: controller.signal,
          }).catch(() => null)
        : Promise.resolve<Response | null>(null);

      const listPromise = fetch(
        `/api/referrals/list?user_id=${session.user.id}`,
        { signal: controller.signal },
      ).catch(() => null);

      const [genRes, listRes] = await Promise.allSettled([
        genPromise,
        listPromise,
      ]);

      if (genRes.status === "fulfilled" && genRes.value) {
        try {
          const dataCode = await genRes.value.json();
          if (dataCode && dataCode.referral_code) {
            setReferralCode(String(dataCode.referral_code));
          }
        } catch {
          // ignore malformed response
        }
      }

      if (listRes.status === "fulfilled" && listRes.value) {
        try {
          const dataList = await listRes.value.json();
          if (listRes.value.ok && Array.isArray(dataList.referrals)) {
            setReferrals(dataList.referrals as ReferralRow[]);
          } else {
            // attempt to tolerate different payloads
            if (Array.isArray(dataList.data)) {
              setReferrals(dataList.data as ReferralRow[]);
            } else {
              console.error("Failed to fetch referrals list:", dataList);
            }
          }
        } catch {
          // ignore parse errors
        }
      }

      // fetch rewards status in background (non-blocking)
      void fetchRewardsStatus();
    } catch (err: unknown) {
      if (!(err instanceof Error && err.name === "AbortError")) {
        console.error("Error loading referrals:", err);
      }
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
      if (Array.isArray(json.claims)) {
        // normalize shape
        const mapped = json.claims.map((c: unknown) => {
          const rec = c as Record<string, unknown>;
          const id = pickString(rec, "id");
          const amount = pickNumber(rec, "amount");
          const payment_method = pickString(
            rec,
            "payment_method",
            "rewards_claim_payment_method",
          );
          const account_details = pickString(
            rec,
            "account_details",
            "rewards_claim_account_details",
          );
          const status = pickString(rec, "status", "rewards_claim_status");
          const referral_count = pickNumber(
            rec,
            "referral_count",
            "rewards_claim_referral_count",
          );
          const created_at = pickString(
            rec,
            "created_at",
            "rewards_claim_created_at",
          );
          const processed_at = pickString(
            rec,
            "processed_at",
            "rewards_claim_processed_at",
          );
          const proof_path = pickString(
            rec,
            "proof_path",
            "rewards_claim_proof_path",
          );
          const proof_url = pickString(rec, "proof_url");

          return {
            id: id ?? undefined,
            amount,
            payment_method,
            account_details,
            status,
            referral_count,
            created_at,
            processed_at,
            proof_path,
            proof_url,
          } as ClaimRow;
        });
        setClaims(mapped);
      }
    } catch (err: unknown) {
      console.error("fetchRewardsStatus", err);
    } finally {
      setClaimLoading(false);
    }
  };

  useEffect(() => {
    if (session) void fetchReferralData();
  }, [session]);

  // tolerate both old (referrals_*) and new (referral_*) column names
  const rows = referrals.map((item) => {
    const id =
      item.referral_id ??
      item.referrals_id ??
      item.id ??
      Math.random().toString(36).slice(2, 9);
    const service =
      item.referral_service_type ??
      item.referrals_service_type ??
      item.service_type ??
      "General Referral";
    const email =
      item.referrals_referred_email ??
      item.referral_referred_email ??
      item.referral_referred_user_email ??
      item.referred_email ??
      (item.referral_referred_user_id
        ? `User: ${item.referral_referred_user_id}`
        : "N/A");
    const dateVal =
      item.referral_date_created ??
      item.referrals_date_created ??
      item.date_created ??
      item.created_at;
    const dateText = dateVal ? new Date(dateVal).toLocaleDateString() : "—";

    return (
      <Table.Tr key={id}>
        <Table.Td>
          <Group gap="sm">
            <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
              <IconUsers size={12} />
            </ThemeIcon>
            <Text fw={500} size="sm" c="dark.6">
              {service}
            </Text>
          </Group>
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="dimmed">
            {email}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text c="dimmed" size="sm">
            {dateText}
          </Text>
        </Table.Td>
        <Table.Td style={{ textAlign: "right" }}>
          <Badge color="green" variant="light" size="sm">
            Completed
          </Badge>
        </Table.Td>
      </Table.Tr>
    );
  });

  const progressValue = Math.min((referralCount / REWARD_THRESHOLD) * 100, 100);

  const maskAccount = (value?: string | null) => {
    if (!value) return "—";
    const v = String(value);
    if (v.length <= 6) return v.replace(/.(?=.{2})/g, "*");
    return v.slice(0, 3) + v.slice(3, -3).replace(/./g, "*") + v.slice(-3);
  };

  // compute button color and label without nested ternaries
  let buttonColor = "gray";
  if (hasPending) {
    buttonColor = "orange";
  } else if (latestClaim?.status === "PAID") {
    buttonColor = "green";
  } else if (isRewardReady) {
    buttonColor = "green";
  }

  let buttonLabel = "Keep Referring";
  if (hasPending) {
    buttonLabel = "View Claim — Processing";
  } else if (latestClaim?.status === "PAID") {
    buttonLabel = "View Payout — Paid";
  } else if (hasAnyClaim) {
    buttonLabel = "View Claim";
  } else if (isRewardReady) {
    buttonLabel = "Claim Reward";
  }

  return (
    <Box component="main" style={{ flex: 1 }} py={{ base: 48, md: 80 }}>
      <Container size="md">
        {/* 1. Modal Component */}
        <RewardClaimModal
          opened={opened}
          onCloseAction={close}
          userId={session?.user?.id}
          onSuccessAction={fetchReferralData}
          isLoading={false}
        />
        <ClaimStatusModal
          opened={statusOpened}
          onCloseAction={closeStatus}
          claim={latestClaim}
        />

        <Stack align="center" gap="md" mb={40}>
          <ThemeIcon size={60} radius="xl" color="indigo" variant="light">
            <IconGift size={32} />
          </ThemeIcon>
          <Title order={1} style={{ fontWeight: 800, color: "#1A237E" }}>
            Refer & Earn Rewards
          </Title>
          <Text c="dimmed" size="lg" ta="center" maw={600}>
            Share your unique code below. Refer{" "}
            <strong>{REWARD_THRESHOLD} friends</strong> to unlock a cash reward!
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
                p={{ base: "lg", sm: "xl" }}
                bg="white"
              >
                <Group justify="space-between" align="center" wrap="wrap">
                  <Stack gap="xs">
                    <Group gap="sm" align="center">
                      <Title order={4} c="dark.7" style={{ margin: 0 }}>
                        Reward Claim
                      </Title>
                      <Badge
                        color={
                          latestClaim?.status === "PAID" ? "green" : "orange"
                        }
                      >
                        {latestClaim?.status ?? "—"}
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
                        {(latestClaim?.payment_method ?? "—").toUpperCase()}
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

                  <Stack gap="xs" maw={250} style={{ alignItems: "flex-end" }}>
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
                        : `You need ${REWARD_THRESHOLD - referralCount} more referrals to claim your reward.`}
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
                      onClick={() => {
                        if (hasAnyClaim) {
                          openStatus();
                        } else {
                          open();
                        }
                      }}
                      disabled={!isRewardReady && !hasAnyClaim}
                      loading={claimLoading}
                      color={buttonColor}
                      variant={isRewardReady ? "filled" : "light"}
                      leftSection={<IconAward size={20} />}
                      radius="xl"
                    >
                      {buttonLabel}
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
  );
}
