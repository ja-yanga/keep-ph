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
import { RewardClaimModalProps, RpcClaimResponse } from "@/utils/types";
import { REFERRALS_UI } from "@/utils/constants";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";

export default function RewardClaimModal({
  opened,
  onCloseAction,
  userId,
  onSuccessAction,
  isLoading = false,
  claimableAmount = 0,
}: RewardClaimModalProps & { claimableAmount?: number }) {
  const [paymentMethod, setPaymentMethod] = useState<"gcash" | "maya">("gcash");
  const [accountDetails, setAccountDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const theme = useMantineTheme();
  const { modal, notifications: noticeCopy, paymentMethods } = REFERRALS_UI;
  const methodLabel = paymentMethods[paymentMethod];
  const rewardLabel = modal.rewardLabel.replace(
    "{amount}",
    (claimableAmount || REFERRALS_UI.rewardAmount).toString(),
  );
  const fieldLabel = modal.fieldLabelTemplate.replace("{method}", methodLabel);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountDetails.trim()) {
      notifications.show({
        title: noticeCopy.requiredTitle,
        message: noticeCopy.requiredMessage.replace("{method}", methodLabel),
        color: "red",
      });
      return;
    }

    // Validate mobile number: must start with 09 and be 11 digits (e.g. 09121231234)
    const mobile = accountDetails.trim();
    const mobileRegex = /^09\d{9}$/;
    if (!mobileRegex.test(mobile)) {
      // show mantine Alert in the modal instead of only a toast
      setValidationError(noticeCopy.invalidNumber);
      return;
    }

    if (!userId) {
      notifications.show({
        title: noticeCopy.notSignedInTitle,
        message: noticeCopy.notSignedInMessage,
        color: "red",
      });
      return;
    }

    setIsSubmitting(true);
    const mobileToSend = accountDetails.trim();
    const methodToSend = paymentMethod.toUpperCase();

    try {
      const res = await fetch(API_ENDPOINTS.rewards.claim, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          paymentMethod: methodToSend,
          accountDetails: mobileToSend,
        }),
      });

      const payload = (await res.json().catch(() => ({}))) as
        | RpcClaimResponse
        | { error?: string };

      if (!res.ok || !payload || !(payload as RpcClaimResponse).ok) {
        const responseStatus = res.status;
        const payloadError = (payload as RpcClaimResponse | { error?: string })
          ?.error;
        let message = payloadError ?? noticeCopy.claimFailedDefault;

        if (!payloadError) {
          if (responseStatus === 409) {
            message = "You already have a pending reward claim.";
          } else if (responseStatus === 403) {
            message = "You need more referrals before you can claim.";
          }
        }
        notifications.show({
          title: noticeCopy.claimFailedTitle,
          message,
          color: "red",
        });

        if (responseStatus === 409 && onSuccessAction) {
          // refresh referral state so the button switches to status modal next time
          await onSuccessAction();
          onCloseAction();
        }
        return;
      }

      notifications.show({
        title: noticeCopy.claimSubmittedTitle,
        message: noticeCopy.claimSubmittedMessage,
        color: "green",
      });
      if (onSuccessAction) await onSuccessAction();
      onCloseAction();
    } catch (error) {
      console.error("reward claim request error:", error);
      notifications.show({
        title: noticeCopy.errorTitle,
        message: noticeCopy.errorMessage,
        color: "red",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onCloseAction}
      title={
        <Group>
          <ThemeIcon size="lg" radius="xl" color="green">
            <IconAward size={20} />
          </ThemeIcon>
          <Title order={3}>{modal.title}</Title>
        </Group>
      }
      centered
      overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
    >
      <Stack gap="lg">
        <Text>{modal.description}</Text>

        {/* show validation error as a Mantine Alert */}
        {validationError && (
          <Alert
            title={modal.alertTitle}
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
            {rewardLabel}
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
              label={fieldLabel}
              placeholder={modal.placeholder}
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
              {modal.submitButton}
            </Button>

            <Text size="xs" ta="center" c="dimmed">
              {modal.terms}
            </Text>
          </Stack>
        </form>
      </Stack>
    </Modal>
  );
}
