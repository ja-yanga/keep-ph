"use client";

import React from "react";
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Title,
  Button,
  Divider,
  ThemeIcon, // New
  Box, // New
  useMantineTheme, // New
  Paper, // New
} from "@mantine/core";
import {
  IconClock,
  IconCheck,
  IconX,
  IconInfoCircle,
  IconCoins, // For Amount
  IconCalendar, // For Date
} from "@tabler/icons-react";

interface ClaimStatusModalProps {
  opened: boolean;
  onClose: () => void;
  claim?: any | null; // Define a proper interface for 'claim' in a real app
}

// Helper component for structured data rows
const ClaimDetailRow: React.FC<{
  label: string;
  value: string | number;
}> = ({ label, value }) => (
  <Group justify="space-between" wrap="nowrap" py={2}>
    <Text size="sm" fw={500} c="dimmed" style={{ minWidth: 100 }}>
      {label}
    </Text>
    <Text size="sm" fw={600} style={{ textAlign: "right", flex: 1 }}>
      {value}
    </Text>
  </Group>
);

export default function ClaimStatusModal({
  opened,
  onClose,
  claim,
}: ClaimStatusModalProps) {
  const theme = useMantineTheme();

  // --- Status and Color Logic ---
  const status = claim?.status?.toUpperCase() || "UNKNOWN";

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
            "Your request was rejected. Please contact support immediately for assistance and details.",
        };
      default:
        return {
          color: "gray",
          icon: IconInfoCircle,
          description: "No specific status information is available.",
        };
    }
  }, [status]);

  if (!claim) {
    return (
      <Modal opened={opened} onClose={onClose} title="Claim Status" centered>
        <Stack align="center" gap="md">
          <ThemeIcon size={48} color="gray" radius="xl" variant="light">
            <IconInfoCircle size={28} />
          </ThemeIcon>
          <Text fw={600}>No claim data available.</Text>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </Modal>
    );
  }

  // --- Main Modal Content ---
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      // Avoid rendering a semantic heading inside the modal header's <h2>.
      // Render a non-heading container (div) instead to prevent nested <h*> tags.
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
        {/* 1. Enhanced Status Header Card */}
        <Paper
          p="md"
          radius="md"
          withBorder
          bg={theme.colors[color][0]} // Light background color from theme
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
                  PHP {claim.amount ?? "—"}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed">
                ID: {claim.id?.slice(0, 8)}
              </Text>
            </Stack>
          </Group>
        </Paper>

        {/* 2. Key Details Section */}
        <Box>
          <Title order={5} mb="sm" c="dark.5">
            PAYMENT DETAILS
          </Title>
          <Stack gap={0}>
            <ClaimDetailRow
              label="Method"
              value={claim.payment_method.toUpperCase()}
            />
            <ClaimDetailRow
              label="Account Number"
              value={claim.account_details}
            />
            <ClaimDetailRow
              label="Referrals Used"
              value={claim.referral_count}
            />
          </Stack>
        </Box>

        <Divider />

        {/* 3. Timeline Section */}
        <Box>
          <Title order={5} mb="sm" c="dark.5">
            TIMELINE
          </Title>
          <Stack gap={0}>
            <ClaimDetailRow
              label="Requested On"
              value={new Date(claim.created_at).toLocaleString()}
            />
            {claim.processed_at && (
              <ClaimDetailRow
                label="Processed On"
                value={new Date(claim.processed_at).toLocaleString()}
              />
            )}
          </Stack>
        </Box>

        {/* 4. Proof of Payment (if available) */}
        <Box>
          <Title order={5} mb="sm" c="dark.5">
            PROOF OF PAYMENT
          </Title>
          <Stack align="center" gap="sm">
            {claim.proof_url ? (
              // embed proof inside modal (PDF or image)
              claim.proof_url.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={claim.proof_url}
                  title="Proof PDF"
                  style={{
                    width: "100%",
                    height: "48vh",
                    border: "none",
                    borderRadius: 8,
                  }}
                />
              ) : (
                <img
                  src={claim.proof_url}
                  alt="proof"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    borderRadius: 8,
                  }}
                />
              )
            ) : claim.proof_path ? (
              <Text size="sm" c="dimmed">
                Proof uploaded — will be available once processed by admin.
              </Text>
            ) : (
              <Text size="sm" c="dimmed">
                No proof uploaded yet.
              </Text>
            )}
          </Stack>
        </Box>

        {/* 5. Action/Message Footer */}
        <Box pt="sm">
          <Group wrap="nowrap" align="flex-start" gap="xs" mb="md">
            <IconInfoCircle size={16} color={theme.colors.gray[6]} />
            <Text size="sm" c="dimmed" style={{ lineHeight: 1.4 }}>
              {description}
            </Text>
          </Group>
          <Button onClick={onClose} fullWidth size="md">
            Got It
          </Button>
        </Box>
      </Stack>
    </Modal>
  );
}
