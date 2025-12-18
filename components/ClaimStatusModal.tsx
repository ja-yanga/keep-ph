"use client";

import React from "react";
import Image from "next/image";
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Title,
  Button,
  Divider,
  ThemeIcon,
  Box,
  useMantineTheme,
  Paper,
} from "@mantine/core";
import {
  IconClock,
  IconCheck,
  IconX,
  IconInfoCircle,
} from "@tabler/icons-react";

type Claim = {
  id?: string | null;
  amount?: number | null;
  payment_method?: string | null;
  account_details?: string | null;
  referral_count?: number | null;
  status?: string | null;
  created_at?: string | null;
  processed_at?: string | null;
  proof_url?: string | null;
  proof_path?: string | null;
};

type ClaimStatusModalProps = {
  opened: boolean;
  onCloseAction: () => void;
  claim?: Claim | null;
};

const ClaimDetailRow: React.FC<{
  label: string;
  value?: string | number | null;
}> = ({ label, value }) => (
  <Group justify="space-between" wrap="nowrap" py={2}>
    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 100 }}>
      {label}
    </Text>
    <Text size="sm" fw={600} style={{ textAlign: "right", flex: 1 }}>
      {value ?? "—"}
    </Text>
  </Group>
);

export default function ClaimStatusModal({
  opened,
  onCloseAction,
  claim,
}: ClaimStatusModalProps) {
  const theme = useMantineTheme();

  const statusRaw = claim?.status ?? "UNKNOWN";
  const status =
    typeof statusRaw === "string" ? statusRaw.toUpperCase() : "UNKNOWN";

  const {
    color,
    icon: StatusIcon,
    description,
  } = React.useMemo(() => {
    switch (status) {
      case "PAID":
        return {
          color: "green",
          icon: IconCheck,
          description:
            "Your payout was successfully completed! Please verify the funds in your designated account.",
        };
      case "PENDING":
      case "PROCESSING":
        return {
          color: "orange",
          icon: IconClock,
          description:
            "Your request is being processed. Payouts are typically completed within 24-48 hours.",
        };
      case "REJECTED":
        return {
          color: "red",
          icon: IconX,
          description:
            "Your request was rejected. Please contact support for assistance.",
        };
      default:
        return {
          color: "gray",
          icon: IconInfoCircle,
          description: "No specific status information is available.",
        };
    }
  }, [status]);

  const formatDate = (d?: string | null) =>
    d ? new Date(d).toLocaleString() : "—";

  if (!claim) {
    return (
      <Modal
        opened={opened}
        onClose={onCloseAction}
        title="Claim Status"
        centered
      >
        <Stack align="center" gap="md">
          <ThemeIcon size={48} color="gray" radius="xl" variant="light">
            <IconInfoCircle size={28} />
          </ThemeIcon>
          <Text fw={600}>No claim data available.</Text>
          <Button variant="outline" onClick={onCloseAction}>
            Close
          </Button>
        </Stack>
      </Modal>
    );
  }

  const paymentMethodLabel =
    typeof claim.payment_method === "string"
      ? claim.payment_method.toUpperCase()
      : "—";

  const accountLabel = claim.account_details ?? "—";
  const referralsUsed = claim.referral_count ?? "—";
  const amountLabel = claim.amount != null ? `PHP ${claim.amount}` : "—";

  const proofUrl = typeof claim.proof_url === "string" ? claim.proof_url : null;
  const isPdf = proofUrl ? proofUrl.toLowerCase().endsWith(".pdf") : false;

  // avoid nested ternaries by computing proof content ahead of render
  let proofContent: React.ReactNode;
  if (proofUrl) {
    proofContent = isPdf ? (
      <iframe
        src={proofUrl}
        title="Proof PDF"
        style={{
          width: "100%",
          height: "48vh",
          border: "none",
          borderRadius: 8,
        }}
      />
    ) : (
      // use next/image to improve LCP/layout; unoptimized to avoid remote config for signed URLs
      <div
        style={{
          width: "100%",
          height: "60vh",
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <Image
          src={proofUrl}
          alt="proof"
          fill
          style={{ objectFit: "contain", borderRadius: 8 }}
          unoptimized
        />
      </div>
    );
  } else if (claim.proof_path) {
    proofContent = (
      <Text size="sm" c="dimmed">
        Proof uploaded — will be available once processed by admin.
      </Text>
    );
  } else {
    proofContent = (
      <Text size="sm" c="dimmed">
        No proof uploaded yet.
      </Text>
    );
  }

  return (
    <Modal
      opened={opened}
      onClose={onCloseAction}
      title={
        <Box>
          <Text fw={700} c="dark.7">
            Reward Payout Request
          </Text>
        </Box>
      }
      centered
      size="sm"
    >
      <Stack gap="xl">
        <Paper
          p="md"
          radius="md"
          withBorder
          bg={theme.colors[color][0]}
          style={{ borderLeft: `5px solid ${theme.colors[color][6]}` }}
        >
          <Group wrap="nowrap" align="center" gap="md">
            <ThemeIcon size={40} radius="xl" color={color}>
              <StatusIcon size={24} />
            </ThemeIcon>
            <Stack gap={0} style={{ flexGrow: 1 }}>
              <Group justify="space-between">
                <Title
                  order={5}
                  tt="uppercase"
                  c={color}
                  style={{ letterSpacing: 1 }}
                >
                  {status}
                </Title>
                <Badge color={color} variant="filled" size="lg">
                  {amountLabel}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                ID: {claim.id ? String(claim.id).slice(0, 8) : "—"}
              </Text>
            </Stack>
          </Group>
        </Paper>

        <Box>
          <Title order={5} mb="sm" c="dark.5">
            PAYMENT DETAILS
          </Title>
          <Stack gap={0}>
            <ClaimDetailRow label="Method" value={paymentMethodLabel} />
            <ClaimDetailRow label="Account Number" value={accountLabel} />
            <ClaimDetailRow label="Referrals Used" value={referralsUsed} />
          </Stack>
        </Box>

        <Divider />

        <Box>
          <Title order={5} mb="sm" c="dark.5">
            TIMELINE
          </Title>
          <Stack gap={0}>
            <ClaimDetailRow
              label="Requested On"
              value={formatDate(claim.created_at)}
            />
            {claim.processed_at && (
              <ClaimDetailRow
                label="Processed On"
                value={formatDate(claim.processed_at)}
              />
            )}
          </Stack>
        </Box>

        <Box>
          <Title order={5} mb="sm" c="dark.5">
            PROOF OF PAYMENT
          </Title>
          <Stack align="center" gap="sm">
            {proofContent}
          </Stack>
        </Box>

        <Box pt="sm">
          <Group wrap="nowrap" align="flex-start" gap="xs" mb="md">
            <IconInfoCircle size={16} color={theme.colors.gray[6]} />
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
              {description}
            </Text>
          </Group>
          <Button onClick={onCloseAction} fullWidth size="md">
            Got It
          </Button>
        </Box>
      </Stack>
    </Modal>
  );
}
