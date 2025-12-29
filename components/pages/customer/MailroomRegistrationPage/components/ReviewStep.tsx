"use client";

import React from "react";
import {
  Stack,
  Title,
  Text,
  Paper,
  Group,
  Button,
  TextInput,
  Textarea,
  Alert,
} from "@mantine/core";
import { IconCheck, IconCreditCard } from "@tabler/icons-react";

type ReviewStepProps = {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  referralCode: string;
  setReferralCode: (val: string) => void;
  referralValid: boolean;
  setReferralValid: (val: boolean) => void;
  referralMessage: string;
  setReferralMessage: (val: string) => void;
  validatingCode: boolean;
  validateReferral: () => void;
  notes: string;
  setNotes: (val: string) => void;
  setActive: (step: number) => void;
};

export const ReviewStep = ({
  firstName,
  lastName,
  email,
  mobile,
  referralCode,
  setReferralCode,
  referralValid,
  setReferralValid,
  referralMessage,
  setReferralMessage,
  validatingCode,
  validateReferral,
  notes,
  setNotes,
  setActive,
}: ReviewStepProps) => {
  return (
    <Stack mt="lg">
      <Title order={4}>Final Review</Title>
      <Text c="dimmed" size="sm">
        Please verify your personal information before proceeding to payment.
      </Text>

      <Paper withBorder p="lg" radius="md">
        <Group justify="space-between" mb="md">
          <Title order={6} c="dimmed" tt="uppercase">
            Subscriber Information
          </Title>
          <Button variant="subtle" size="xs" onClick={() => setActive(2)}>
            Edit
          </Button>
        </Group>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text c="dimmed">Full Name:</Text>
            <Text fw={600}>
              {firstName} {lastName}
            </Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed">Email:</Text>
            <Text fw={600}>{email}</Text>
          </Group>
          <Group justify="space-between">
            <Text c="dimmed">Mobile Number:</Text>
            <Text fw={600}>{mobile}</Text>
          </Group>
        </Stack>
      </Paper>

      <Paper withBorder p="lg" radius="md">
        <Group align="flex-end">
          <TextInput
            label="Referral Code (Optional)"
            placeholder="Enter code"
            value={referralCode}
            onChange={(e) => {
              setReferralCode(e.currentTarget.value);
              if (referralValid) {
                setReferralValid(false);
                setReferralMessage("");
              }
            }}
            error={!referralValid && referralMessage ? referralMessage : null}
            style={{ flex: 1 }}
          />
          <Button
            variant="light"
            onClick={validateReferral}
            loading={validatingCode}
            disabled={!referralCode || referralValid}
          >
            {referralValid ? "Applied" : "Apply"}
          </Button>
        </Group>
        {referralValid && (
          <Text c="teal" size="xs" mt={4}>
            <IconCheck
              size={12}
              style={{ display: "inline", marginRight: 4 }}
            />
            {referralMessage}
          </Text>
        )}

        <Textarea
          mt="md"
          label="Notes"
          placeholder="Additional instructions..."
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          minRows={3}
        />
      </Paper>

      <Alert icon={<IconCreditCard size={16} />} color="blue" variant="light">
        By clicking &quot;Proceed to Payment&quot;, you will be redirected to
        our secure payment gateway to complete your transaction.
      </Alert>
    </Stack>
  );
};
