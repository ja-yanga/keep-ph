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
import ClaimStatusModal from "@/components/ClaimStatusModal";
import { ClaimRow, ReferralRow } from "@/utils/types";
import { maskAccount, pickNumber, pickString } from "@/utils/helper";
import { REFERRALS_UI } from "@/utils/constants";
import RewardClaimModal from "./RewardClaimModal";
import { ReferralsTable } from "./ReferralsRow";

export default function ReferralsContent() {
  const { session } = useSession();

  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);

  // State for reward logic
  const REWARD_THRESHOLD = REFERRALS_UI.threshold;
  const referralCount = referrals.length;
  const isRewardReady = referralCount >= REWARD_THRESHOLD;
  const progressDescription =
    REFERRALS_UI.progressCard.progressDescription.replace(
      "{remaining}",
      Math.max(REWARD_THRESHOLD - referralCount, 0).toString(),
    );
  const heroDescription = REFERRALS_UI.hero.description.replace(
    "{threshold}",
    REWARD_THRESHOLD.toString(),
  );

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
      if (!res.ok) {
        console.error(
          "Error fetching rewards status:",
          res.status,
          res.statusText,
        );
        return;
      }
      const json = await res.json();
      console.log("Rewards status response:", json);
      if (json && json.claims && Array.isArray(json.claims)) {
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
  const progressValue = Math.min((referralCount / REWARD_THRESHOLD) * 100, 100);

  // compute button color and label without nested ternaries
  let buttonColor = "gray";
  if (hasPending) {
    buttonColor = "orange";
  } else if (latestClaim?.status === "PAID") {
    buttonColor = "green";
  } else if (isRewardReady) {
    buttonColor = "green";
  }

  let buttonLabel = REFERRALS_UI.progressCard.buttons.keepReferring;
  if (hasPending) {
    buttonLabel = REFERRALS_UI.summaryCard.buttons.viewProcessing;
  } else if (latestClaim?.status === "PAID") {
    buttonLabel = REFERRALS_UI.summaryCard.buttons.viewPaid;
  } else if (hasAnyClaim) {
    buttonLabel = REFERRALS_UI.summaryCard.buttons.viewClaim;
  } else if (isRewardReady) {
    buttonLabel = REFERRALS_UI.progressCard.buttons.claim;
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
            {REFERRALS_UI.hero.title}
          </Title>
          <Text c="dimmed" size="lg" ta="center" maw={600}>
            {heroDescription}
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
                        {REFERRALS_UI.summaryCard.title}
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
                      {REFERRALS_UI.summaryCard.description}
                    </Text>

                    <Stack gap={4}>
                      <Text size="sm">
                        <strong>
                          {REFERRALS_UI.summaryCard.labels.amount}
                        </strong>{" "}
                        PHP {latestClaim?.amount ?? "—"}
                      </Text>
                      <Text size="sm">
                        <strong>
                          {REFERRALS_UI.summaryCard.labels.method}
                        </strong>{" "}
                        {(latestClaim?.payment_method ?? "—").toUpperCase()}
                      </Text>
                      <Text size="sm">
                        <strong>
                          {REFERRALS_UI.summaryCard.labels.account}
                        </strong>{" "}
                        {maskAccount(latestClaim?.account_details)}
                      </Text>
                      <Text size="sm">
                        <strong>
                          {REFERRALS_UI.summaryCard.labels.requested}
                        </strong>{" "}
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
                        ? REFERRALS_UI.summaryCard.buttons.viewPaid
                        : REFERRALS_UI.summaryCard.buttons.viewProcessing}
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
                        ? REFERRALS_UI.progressCard.unlockedTitle
                        : `${REFERRALS_UI.progressCard.progressTitle} (${referralCount}/${REWARD_THRESHOLD})`}
                    </Title>
                    <Text c="dimmed" size="sm">
                      {isRewardReady
                        ? REFERRALS_UI.progressCard.unlockedDescription
                        : progressDescription}
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
                    {REFERRALS_UI.codeCard.heading}
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
                  {({
                    copied,
                    copy,
                  }: {
                    copied: boolean;
                    copy: () => void;
                  }) => (
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
                      {copied
                        ? REFERRALS_UI.codeCard.copySuccess
                        : REFERRALS_UI.codeCard.copyDefault}
                    </Button>
                  )}
                </CopyButton>
              </Stack>
            </Paper>

            {/* Table Section */}
            <Box>
              <Group mb="md" align="center">
                <IconUsers size={20} color={REFERRALS_UI.table.headingColor} />
                <Title
                  order={3}
                  style={{ color: REFERRALS_UI.table.headingColor }}
                >
                  {REFERRALS_UI.table.heading}
                </Title>
                <Badge variant="light" color="gray" size="lg" circle>
                  {referralCount}
                </Badge>
              </Group>

              <Paper withBorder radius="md" shadow="sm">
                <ReferralsTable records={referrals} loading={loading} />
              </Paper>
            </Box>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
