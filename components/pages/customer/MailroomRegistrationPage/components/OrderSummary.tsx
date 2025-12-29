"use client";

import React from "react";
import {
  Paper,
  Title,
  Stack,
  Group,
  Text,
  Badge,
  Divider,
} from "@mantine/core";
import { IconCreditCard } from "@tabler/icons-react";
import { Location, Plan } from "@/utils/types";

type OrderSummaryProps = {
  selectedPlan: Plan | null;
  selectedLocationObj: Location | null;
  billingCycle: "monthly" | "annual";
  qty: number;
  referralValid: boolean;
  subTotal: number;
  referralDiscountAmount: number;
  totalCost: number;
  format: (n: number) => string;
};

export const OrderSummary = ({
  selectedPlan,
  selectedLocationObj,
  billingCycle,
  qty,
  referralValid,
  subTotal,
  referralDiscountAmount,
  totalCost,
  format,
}: OrderSummaryProps) => {
  return (
    <Paper withBorder p="xl" radius="md" shadow="sm">
      <Title order={4} mb="lg">
        Order Summary
      </Title>
      <Stack gap="md">
        <Group justify="space-between">
          <Text c="dimmed">Plan</Text>
          <Text fw={500}>{selectedPlan?.name || "—"}</Text>
        </Group>
        <Group justify="space-between">
          <Text c="dimmed">Location</Text>
          <Text
            fw={500}
            style={{ maxWidth: 150, textAlign: "right" }}
            lineClamp={1}
          >
            {selectedLocationObj?.name || "—"}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text c="dimmed">Cycle</Text>
          <Group gap={6}>
            <Text fw={500}>
              {billingCycle === "annual" ? "Annual (12 Mo)" : "Monthly"}
            </Text>
            {billingCycle === "annual" && (
              <Badge size="xs" color="green" variant="light">
                -20%
              </Badge>
            )}
          </Group>
        </Group>
        <Group justify="space-between">
          <Text c="dimmed">Quantity</Text>
          <Text fw={500}>
            {qty} Locker{qty > 1 ? "s" : ""}
          </Text>
        </Group>

        <Divider my="sm" />

        {referralValid && (
          <>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Subtotal
              </Text>
              <Text size="sm">{format(subTotal)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="green">
                Referral Discount (5%)
              </Text>
              <Text size="sm" c="green">
                -{format(referralDiscountAmount)}
              </Text>
            </Group>
            <Divider my="sm" />
          </>
        )}

        <Group justify="space-between">
          <Text size="lg" fw={700}>
            Total
          </Text>
          <Text size="xl" fw={700} c={selectedPlan ? "#26316D" : "dimmed"}>
            {selectedPlan ? format(totalCost) : "—"}
          </Text>
        </Group>

        <Group justify="center" gap="xs" mt="xs">
          <IconCreditCard size={14} color="gray" />
          <Text size="xs" c="dimmed">
            Secure SSL Encryption
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
};
