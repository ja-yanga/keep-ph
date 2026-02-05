"use client";

import React from "react";
import useSWR from "swr";
import { SimpleGrid, Paper, Group, Text, ThemeIcon } from "@mantine/core";
import {
  IconBox,
  IconAlertCircle,
  IconTruckDelivery,
  IconTrash,
} from "@tabler/icons-react";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { formatCount } from "@/utils/format";

// Stats cards are API-driven (separate from the main table) to avoid coupling
// table state (filters, pagination) with dashboard metrics.
type Counts = {
  active?: number;
  requests?: number;
  released?: number;
  disposed?: number;
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to fetch ${url}`);
  }
  return res.json().catch(() => ({}));
};

export function MailroomPackageStatsCards() {
  // Pull counts from the main packages endpoint (counts are included in response)
  const statsUrl = `${API_ENDPOINTS.admin.mailroom.packages}?page=1&limit=1`;

  const { data } = useSWR(statsUrl, fetcher, {
    revalidateOnFocus: true,
  });

  const counts: Counts = data?.counts ?? {};

  const cards = [
    {
      key: "stored",
      label: "Items in Storage",
      value: counts.active ?? 0,
      color: "blue",
      icon: <IconBox size={24} />,
      highlight: true,
    },
    {
      key: "pending",
      label: "Pending Requests",
      value: counts.requests ?? 0,
      color: "orange",
      icon: <IconAlertCircle size={24} />,
    },
    {
      key: "released",
      label: "Total Released",
      value: counts.released ?? 0,
      color: "teal",
      icon: <IconTruckDelivery size={24} />,
    },
    {
      key: "disposed",
      label: "Disposed",
      value: counts.disposed ?? 0,
      color: "red",
      icon: <IconTrash size={24} />,
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md" w="100%">
      {cards.map((c) => (
        <Paper
          key={c.key}
          p="md"
          radius="md"
          withBorder
          shadow="xs"
          bg={c.highlight ? "blue.0" : undefined}
        >
          <Group>
            <ThemeIcon size="xl" radius="md" color={c.color} variant="filled">
              {c.icon}
            </ThemeIcon>
            <div>
              <Text c="#313131" size="xs" tt="uppercase" fw={700}>
                {c.label}
              </Text>
              <Text fw={700} size="xl" c={c.highlight ? "blue.9" : undefined}>
                {formatCount(c.value)}
              </Text>
            </div>
          </Group>
        </Paper>
      ))}
    </SimpleGrid>
  );
}
