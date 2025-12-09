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
  Alert,
} from "@mantine/core";
import { IconAward, IconWallet } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

interface RewardClaimModalProps {
  opened: boolean;
  onClose: () => void;
  userId?: string | null;
  onSuccess?: () => void;
  isLoading?: boolean;
}

export default function RewardClaimModal({
  opened,
  onClose,
  userId,
  onSuccess,
  isLoading = false,
}: RewardClaimModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya">("gcash");
  const [accountDetails, setAccountDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const theme = useMantineTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountDetails.trim()) {
      notifications.show({
        title: "Required",
        message: `Please enter your ${paymentMethod} account.`,
        color: "red",
      });
      return;
    }

    // Validate mobile number: must start with 09 and be 11 digits (e.g. 09121231234)
    const mobile = accountDetails.trim();
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      // show mantine Alert in the modal instead of only a toast
      setValidationError(
        "Mobile number must start with 09 and be 11 digits (e.g. 09121231234)."
      );
      return;
    }

    if (!userId) {
      notifications.show({
        title: "Not signed in",
        message: "You must be signed in to claim rewards.",
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/rewards/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          paymentMethod: paymentMethod.toLowerCase(),
          accountDetails,
        }),
      });

      const payload = await res.json().catch(() => ({}));

      if (res.ok) {
        notifications.show({
          title: "Claim Submitted",
          message: "Your reward request is submitted and will be processed.",
          color: "green",
        });
        if (onSuccess) await onSuccess();
        onClose();
      } else {
        // DEBUG: log server response so you can see why it failed in console + network
        console.error("rewards.claim failed:", res.status, payload);
        notifications.show({
          title: "Claim Failed",
          message: payload?.error || "Failed to submit claim",
          color: "red",
        });
      }
    } catch (err) {
      console.error("reward claim error", err);
      notifications.show({
        title: "Error",
        message: "Network error. Please try again later.",
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
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
          Congratulations! Provide your payout details below. Requests are
          typically processed within 24–48 hours.
        </Text>

        {/* show validation error as a Mantine Alert */}
        {validationError && (
          <Alert
            title="Invalid number"
            color="red"
            variant="outline"
            onClose={() => setValidationError(null)}
            withCloseButton
          >
            {validationError}
          </Alert>
        )}

        <Paper withBorder p="md" radius="md" bg={theme.colors.gray[0]}>
          <Title order={5} mb="xs">
            Reward: PHP 500.00
          </Title>
          <Group grow>
            <Button
              variant={paymentMethod === "gcash" ? "filled" : "light"}
              color="pink"
              onClick={() => setPaymentMethod("gcash")}
              leftSection={<IconWallet size={16} />}
              size="sm"
            >
              GCash
            </Button>
            <Button
              variant={paymentMethod === "maya" ? "filled" : "light"}
              color="indigo"
              onClick={() => setPaymentMethod("maya")}
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
              label={`Your ${
                paymentMethod === "gcash" ? "GCash" : "Maya"
              } Mobile Number / Account`}
              placeholder="e.g., 0917XXXXXXX"
              value={accountDetails}
              onChange={(event) => {
                // clear validation alert on change
                if (validationError) setValidationError(null);
                setAccountDetails(event.currentTarget.value);
              }}
              required
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
