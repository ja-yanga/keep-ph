"use client";

import React, { useState } from "react";
import {
  Modal,
  Group,
  ThemeIcon,
  Title,
  Stack,
  Text,
  Paper,
  Button,
  TextInput,
  useMantineTheme,
} from "@mantine/core";
import { IconAward, IconWallet } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

interface RewardClaimModalProps {
  opened: boolean;
  onClose: () => void;
  onClaim: (paymentMethod: string, accountDetails: string) => void;
  isLoading: boolean;
}

export default function RewardClaimModal({
  opened,
  onClose,
  onClaim,
  isLoading,
}: RewardClaimModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"Gcash" | "Maya">("Gcash");
  const [accountDetails, setAccountDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const theme = useMantineTheme();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountDetails.trim()) {
      notifications.show({
        title: "Required",
        message: `Please enter your ${paymentMethod} number.`,
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    onClaim(paymentMethod, accountDetails);
    setTimeout(() => setIsSubmitting(false), 500);
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group>
          <ThemeIcon size="lg" radius="xl" color="green">
            <IconAward size={20} />
          </ThemeIcon>
          <Title order={3}>Submit Reward Payout Request</Title>
        </Group>
      }
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="lg">
        <Text>
          Congratulations! You've qualified for a cash reward. Please provide
          your Gcash or Maya details below. Requests are typically processed and
          paid out within 24-48 hours.
        </Text>

        <Paper withBorder p="md" radius="md" bg={theme.colors.gray[0]}>
          <Title order={5} mb="xs">
            Reward: PHP 500.00
          </Title>
          <Group grow>
            <Button
              variant={paymentMethod === "Gcash" ? "filled" : "light"}
              color="pink"
              onClick={() => setPaymentMethod("Gcash")}
              leftSection={<IconWallet size={16} />}
              size="sm"
            >
              Gcash
            </Button>
            <Button
              variant={paymentMethod === "Maya" ? "filled" : "light"}
              color="indigo"
              onClick={() => setPaymentMethod("Maya")}
              leftSection={<IconWallet size={16} />}
              size="sm"
            >
              Maya
            </Button>
          </Group>
        </Paper>

        <form onSubmit={handleSubmit}>
          <Stack>
            <TextInput
              label={`Your ${paymentMethod} Mobile Number`}
              placeholder="e.g., 0917XXXXXXX"
              value={accountDetails}
              onChange={(event) => setAccountDetails(event.currentTarget.value)}
              required
              inputMode="numeric"
              maxLength={11}
            />

            <Button
              type="submit"
              fullWidth
              mt="md"
              size="lg"
              color="green"
              loading={isSubmitting || isLoading}
              disabled={!accountDetails.trim() || isSubmitting || isLoading}
            >
              Submit Payout Request
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              By submitting, you agree to the payout terms.
            </Text>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
