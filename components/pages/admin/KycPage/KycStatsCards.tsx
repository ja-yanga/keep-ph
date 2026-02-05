"use client";

import React, { useMemo } from "react";
import useSWR from "swr";
import { SimpleGrid, Paper, Group, Text, ThemeIcon } from "@mantine/core";
import {
  IconFileDescription,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { fetcher } from "@/utils/helper";
import { formatCount } from "@/utils/format";

// KYC stats cards:
// - Uses existing /api/admin/user-kyc endpoint
// - Requests total_count per status for Submitted/Verified/Rejected
export default function KycStatsCards() {
  const base = API_ENDPOINTS.admin.userKyc();

  // Each status uses the same endpoint with a status filter.
  const submittedKey = `${base}?page=1&pageSize=1&status=SUBMITTED`;
  const verifiedKey = `${base}?page=1&pageSize=1&status=VERIFIED`;
  const rejectedKey = `${base}?page=1&pageSize=1&status=REJECTED`;

  const { data: submittedData } = useSWR(submittedKey, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: verifiedData } = useSWR(verifiedKey, fetcher, {
    revalidateOnFocus: false,
  });
  const { data: rejectedData } = useSWR(rejectedKey, fetcher, {
    revalidateOnFocus: false,
  });

  const cards = useMemo(
    () => [
      {
        key: "submitted",
        label: "Submitted",
        value: submittedData?.total_count ?? 0,
        color: "blue",
        icon: <IconFileDescription size={24} />,
      },
      {
        key: "verified",
        label: "Verified",
        value: verifiedData?.total_count ?? 0,
        color: "teal",
        icon: <IconCircleCheck size={24} />,
      },
      {
        key: "rejected",
        label: "Rejected",
        value: rejectedData?.total_count ?? 0,
        color: "red",
        icon: <IconCircleX size={24} />,
      },
    ],
    [submittedData, verifiedData, rejectedData],
  );

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md" w="100%">
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
    </SimpleGrid>
  );
}
