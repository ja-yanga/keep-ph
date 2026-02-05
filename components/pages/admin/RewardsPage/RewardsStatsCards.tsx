"use client";

import React from "react";
import { Group, Paper, Text, ThemeIcon } from "@mantine/core";
import {
  IconAlertCircle,
  IconUpload,
  IconCircleCheck,
} from "@tabler/icons-react";
import { formatCount } from "@/utils/format";

// Rewards stats cards (counts per status).
export default function RewardsStatsCards({
  counts,
}: {
  counts: { PENDING: number; PROCESSING: number; PAID: number };
}) {
  const cards = [
    {
      key: "pending",
      label: "Pending",
      value: counts.PENDING,
      color: "orange",
      icon: <IconAlertCircle size={24} />,
    },
    {
      key: "processing",
      label: "Processing",
      value: counts.PROCESSING,
      color: "blue",
      icon: <IconUpload size={24} />,
    },
    {
      key: "paid",
      label: "Paid",
      value: counts.PAID,
      color: "teal",
      icon: <IconCircleCheck size={24} />,
    },
  ];

  return (
    <Group grow align="stretch" w="100%">
      {cards.map((c) => (
        <Paper key={c.key} p="md" radius="md" withBorder shadow="xs">
          <Group>
            <ThemeIcon size="xl" radius="md" color={c.color} variant="filled">
              {c.icon}
            </ThemeIcon>
            <div>
              <Text c="#313131" size="xs" tt="uppercase" fw={700}>
                {c.label}
              </Text>
              <Text fw={700} size="xl">
                {formatCount(c.value)}
              </Text>
            </div>
          </Group>
        </Paper>
      ))}
    </Group>
  );
}
