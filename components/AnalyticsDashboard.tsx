"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
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
  Skeleton,
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

// Import all recharts components in a single dynamic import to reduce chunk count
// This creates one bundle instead of three, improving load performance
const TrafficChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        ResponsiveContainer,
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
      } = mod;
      return {
        default: ({
          data,
        }: {
          data: Array<{ date: string; visitors: number; pageviews: number }>;
        }) => (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} aria-label="Traffic overview line chart">
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                aria-label="Date"
              />
              <YAxis axisLine={false} tickLine={false} aria-label="Count" />
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
                name="Visitors"
                aria-label="Visitors line"
              />
              <Line
                type="monotone"
                dataKey="pageviews"
                stroke="#7950f2"
                strokeWidth={3}
                dot={false}
                name="Page Views"
                aria-label="Page views line"
              />
            </LineChart>
          </ResponsiveContainer>
        ),
      };
    }),
  { ssr: false, loading: () => <Skeleton height={300} /> },
);

const TopPagesChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        ResponsiveContainer,
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
      } = mod;
      return {
        default: ({
          data,
        }: {
          data: Array<{ name: string; views: number }>;
        }) => (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              aria-label="Top pages bar chart"
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
                aria-label="Page name"
              />
              <Tooltip cursor={{ fill: "transparent" }} />
              <Bar
                dataKey="views"
                fill="#228BE6"
                radius={[0, 4, 4, 0]}
                barSize={20}
                name="Views"
                aria-label="Page views"
              />
            </BarChart>
          </ResponsiveContainer>
        ),
      };
    }),
  { ssr: false, loading: () => <Skeleton height={250} /> },
);

const DeviceChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = mod;
      return {
        default: ({
          data,
        }: {
          data: Array<{ name: string; value: number; color: string }>;
        }) => (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart aria-label="Device usage pie chart">
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
                aria-label="Device category"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        ),
      };
    }),
  { ssr: false, loading: () => <Skeleton height={160} width={160} circle /> },
);

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
    let cancelled = false;
    async function fetchAnalytics() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/admin/analytics?range=${timeRange}`, {
          // Add cache headers to improve performance
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          const err = await res
            .json()
            .catch(() => ({ error: "Unknown error" }));
          const errorMsg = err.error || "Failed to load analytics data";

          // Handle missing credentials gracefully
          if (errorMsg.includes("Missing Google Analytics credentials")) {
            if (!cancelled) {
              setError(
                "Google Analytics is not configured. Set GA_PROPERTY_ID, GOOGLE_CLIENT_EMAIL, and GOOGLE_PRIVATE_KEY in your environment variables to enable analytics.",
              );
              // Set empty data so the page can still render
              setData({
                visitorData: [],
                deviceData: [],
                topPages: [],
                stats: { activeNow: 0, totalVisitors: 0, totalPageViews: 0 },
              });
            }
            return;
          }
          throw new Error(errorMsg);
        }
        const json = await res.json();
        // Only update state if component is still mounted
        if (!cancelled) {
          setData(json);
        }
      } catch (err: unknown) {
        if (process.env.NODE_ENV === "development") {
          console.error("Analytics fetch error:", err);
        }
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load analytics data";

        // Check if it's a credentials-related error
        if (
          errorMsg.includes("credentials") ||
          errorMsg.includes("Missing Google Analytics")
        ) {
          if (!cancelled) {
            setError(
              "Google Analytics credentials are missing or invalid. Please check your environment variables (GA_PROPERTY_ID, GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY).",
            );
          }
        } else {
          if (!cancelled) {
            setError("Could not load analytics data. Please try again later.");
          }
        }

        // Set empty data so the page can still render
        if (!cancelled) {
          setData({
            visitorData: [],
            deviceData: [],
            topPages: [],
            stats: { activeNow: 0, totalVisitors: 0, totalPageViews: 0 },
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    fetchAnalytics();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  // Memoize computed data to prevent unnecessary recalculations
  // Must be called before any early returns
  const visitorData = useMemo(
    () => data?.visitorData || [],
    [data?.visitorData],
  );
  const deviceData = useMemo(() => data?.deviceData || [], [data?.deviceData]);

  // CHANGED: Filter out pages with UUIDs (e.g., /mailroom/123-abc...)
  const topPages = useMemo(() => {
    const uuidRegex =
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    return (data?.topPages || []).filter((page: { name: string }) => {
      return !uuidRegex.test(page.name);
    });
  }, [data?.topPages]);

  const stats = useMemo(
    () =>
      data?.stats || {
        activeNow: 0,
        totalVisitors: 0,
        totalPageViews: 0,
      },
    [data?.stats],
  );

  if (loading) {
    return (
      <Center
        h={300}
        role="status"
        aria-live="polite"
        aria-label="Loading analytics data"
      >
        <Loader size="md" />
      </Center>
    );
  }

  return (
    <Stack gap="lg" role="region" aria-labelledby="analytics-heading">
      <Group justify="space-between" align="center">
        <Title order={2} id="analytics-heading">
          Website Analytics
        </Title>
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
          aria-label="Select time range for analytics data"
        />
      </Group>

      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} aria-hidden="true" />}
          role="alert"
          aria-live="polite"
        >
          {error}
        </Alert>
      )}

      {/* 1. Key Metrics Cards */}
      <SimpleGrid
        cols={{ base: 1, sm: 3 }}
        role="list"
        aria-label="Analytics metrics"
      >
        <Paper
          withBorder
          p="md"
          radius="md"
          role="listitem"
          aria-label={`Active users: ${stats.activeNow} users currently on site`}
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="light"
              color="green"
              aria-hidden="true"
            >
              <IconActivity size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Active Now
              </Text>
              <Text
                fw={700}
                size="xl"
                c="green"
                aria-label={`${stats.activeNow} active users`}
              >
                {stats.activeNow}
              </Text>
              <Text c="dimmed" size="xs">
                users on site
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="md"
          radius="md"
          role="listitem"
          aria-label={`Total visitors: ${stats.totalVisitors.toLocaleString()} visitors in the last 7 days`}
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="light"
              color="blue"
              aria-hidden="true"
            >
              <IconUsers size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Total Visitors (7d)
              </Text>
              <Text
                fw={700}
                size="xl"
                aria-label={`${stats.totalVisitors.toLocaleString()} total visitors`}
              >
                {stats.totalVisitors.toLocaleString()}
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="md"
          radius="md"
          role="listitem"
          aria-label={`Page views: ${stats.totalPageViews.toLocaleString()} page views in the last 7 days`}
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="light"
              color="violet"
              aria-hidden="true"
            >
              <IconEye size={28} />
            </ThemeIcon>
            <div>
              <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                Page Views (7d)
              </Text>
              <Text
                fw={700}
                size="xl"
                aria-label={`${stats.totalPageViews.toLocaleString()} total page views`}
              >
                {stats.totalPageViews.toLocaleString()}
              </Text>
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 2. Traffic Chart */}
      <Paper
        withBorder
        p="md"
        radius="md"
        role="region"
        aria-labelledby="traffic-chart-heading"
      >
        <Text fw={600} mb="lg" id="traffic-chart-heading">
          Traffic Overview
        </Text>
        <div
          style={{ height: 300, width: "100%" }}
          role="img"
          aria-label={`Traffic chart showing ${visitorData.length} data points for visitors and page views over time`}
        >
          <Suspense fallback={<Skeleton height={300} />}>
            <TrafficChart data={visitorData} />
          </Suspense>
        </div>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* 3. Top Pages */}
        <Paper
          withBorder
          p="md"
          radius="md"
          role="region"
          aria-labelledby="top-pages-heading"
        >
          <Group justify="space-between" mb="md">
            <Text fw={600} id="top-pages-heading">
              Top Pages
            </Text>
            <IconChartBar size={18} color="gray" aria-hidden="true" />
          </Group>
          <div
            style={{ height: 250, width: "100%" }}
            role="img"
            aria-label={`Bar chart showing top ${topPages.length} pages by views`}
          >
            <Suspense fallback={<Skeleton height={250} />}>
              <TopPagesChart data={topPages} />
            </Suspense>
          </div>
        </Paper>

        {/* 4. Device Breakdown */}
        <Paper
          withBorder
          p="md"
          radius="md"
          role="region"
          aria-labelledby="device-usage-heading"
        >
          <Text fw={600} mb="md" id="device-usage-heading">
            Device Usage
          </Text>
          <Group justify="center" gap={40}>
            <div
              style={{ width: 160, height: 160 }}
              role="img"
              aria-label={`Pie chart showing device usage distribution: ${deviceData.map((d) => `${d.name} ${d.value} users`).join(", ")}`}
            >
              <Suspense fallback={<Skeleton height={160} width={160} circle />}>
                <DeviceChart data={deviceData} />
              </Suspense>
            </div>
            <Stack gap="xs" role="list" aria-label="Device usage breakdown">
              {deviceData.map((d) => (
                <Group key={d.name} role="listitem">
                  <ThemeIcon
                    color={d.color}
                    variant="light"
                    size="sm"
                    aria-hidden="true"
                  >
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
                    <Text
                      size="xs"
                      c="dimmed"
                      aria-label={`${d.value} ${d.name} users`}
                    >
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
