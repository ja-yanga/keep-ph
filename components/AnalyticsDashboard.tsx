"use client";

import React, { useState, useEffect } from "react";
import {
  Paper,
  Title,
  Text,
  SimpleGrid,
  Group,
  Stack,
  Select,
  ThemeIcon,
  Loader,
  Center,
  Alert,
} from "@mantine/core";
import {
  IconUsers,
  IconEye,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconChartBar,
  IconAlertCircle,
  IconActivity,
} from "@tabler/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<{
    visitorData: Array<{ date: string; visitors: number; pageviews: number }>;
    deviceData: Array<{ name: string; value: number; color: string }>;
    topPages: Array<{ name: string; views: number }>;
    stats: {
      activeNow: number;
      totalVisitors: number;
      totalPageViews: number;
    };
  } | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/analytics?range=${timeRange}`);
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load analytics data");
        }
        const json = await res.json();
        setData(json);
      } catch (err: unknown) {
        console.error(err);
        setError("Could not load live data. Please check API credentials.");
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <Center h={300}>
        <Loader size="md" />
      </Center>
    );
  }

  // Use fetched data or empty arrays to prevent crashes
  const visitorData = data?.visitorData || [];
  const deviceData = data?.deviceData || [];

  // CHANGED: Filter out pages with UUIDs (e.g., /mailroom/123-abc...)
  const topPages = (data?.topPages || []).filter((page: { name: string }) => {
    // Regex to detect UUIDs (8-4-4-4-12 hex characters)
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    // CHANGED: Use 'name' instead of 'path' (matches the API response structure)
    return !uuidRegex.test(page.name);
  });
  const stats = data?.stats || {
    activeNow: 0,
    totalVisitors: 0,
    totalPageViews: 0,
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={3}>Website Analytics</Title>
        <Select
          value={timeRange}
          onChange={(v) => setTimeRange(v ?? "7d")}
          data={[
            { value: "7d", label: "Last 7 days" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days (3 months)" },
            { value: "180d", label: "Last 180 days (6 months)" },
            { value: "365d", label: "Last 12 months" },
          ]}
          w={200}
        />
      </Group>

      {error && (
        <Alert color="red" icon={<IconAlertCircle size={16} />}>
          {error}
        </Alert>
      )}

      {/* 1. Key Metrics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light" color="green">
              <IconActivity size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Active Now
              </Text>
              <Text fw={700} size="xl" c="green">
                {stats.activeNow}
              </Text>
              <Text c="dimmed" size="xs">
                users on
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light" color="blue">
              <IconUsers size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Total Visitors (7d)
              </Text>
              <Text fw={700} size="xl">
                {stats.totalVisitors.toLocaleString()}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Group>
            <ThemeIcon size="xl" radius="md" variant="light" color="violet">
              <IconEye size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Page Views (7d)
              </Text>
              <Text fw={700} size="xl">
                {stats.totalPageViews.toLocaleString()}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 2. Traffic Chart */}
      <Paper withBorder p="md" radius="md">
        <Text fw={600} mb="lg">
          Traffic Overview
        </Text>
        <div style={{ height: 300, width: "100%" }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={visitorData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "none",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="visitors"
                stroke="#228BE6"
                strokeWidth={3}
                dot={{ r: 4, fill: "#228BE6" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="pageviews"
                stroke="#7950f2"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* 3. Top Pages */}
        <Paper withBorder p="md" radius="md">
          <Group justify="space-between" mb="md">
            <Text fw={600}>Top Pages</Text>
            <IconChartBar size={18} color="gray" />
          </Group>
          <div style={{ height: 250, width: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={topPages}
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={120}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar
                  dataKey="views"
                  fill="#228BE6"
                  radius={[0, 4, 4, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Paper>

        {/* 4. Device Breakdown */}
        <Paper withBorder p="md" radius="md">
          <Text fw={600} mb="md">
            Device Usage
          </Text>
          <Group justify="center" gap={40}>
            <div style={{ width: 160, height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <Stack gap="xs">
              {deviceData.map((d) => (
                <Group key={d.name}>
                  <ThemeIcon color={d.color} variant="light" size="sm">
                    {d.name === "mobile" ? (
                      <IconDeviceMobile size={14} />
                    ) : (
                      <IconDeviceDesktop size={14} />
                    )}
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500} tt="capitalize">
                      {d.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {d.value} users
                    </Text>
                  </div>
                </Group>
              ))}
            </Stack>
          </Group>
        </Paper>
      </SimpleGrid>
    </Stack>
  );
}
