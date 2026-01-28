"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import dynamic from "next/dynamic";
import {
  Paper,
  Text,
  SimpleGrid,
  Group,
  Stack,
  Select,
  ThemeIcon,
  Alert,
  Skeleton,
  Title,
} from "@mantine/core";
import { useIntersection } from "@mantine/hooks";
import {
  IconUsers,
  IconEye,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconChartBar,
  IconAlertCircle,
  IconActivity,
} from "@tabler/icons-react";

// Separate dynamic imports for each chart to avoid "undefined" element errors
// while still benefiting from lazy loading and consolidated chunking
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

      return function Traffic({
        data,
      }: {
        data: Array<{ date: string; visitors: number; pageviews: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} aria-label="Traffic overview line chart">
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
                name="Visitors"
              />
              <Line
                type="monotone"
                dataKey="pageviews"
                stroke="#7950f2"
                strokeWidth={3}
                dot={false}
                name="Page Views"
              />
            </LineChart>
          </ResponsiveContainer>
        );
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

      return function TopPages({
        data,
      }: {
        data: Array<{ name: string; views: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={data}
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
                name="Views"
              />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <Skeleton height={250} /> },
);

const DeviceChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } = mod;

      return function Device({
        data,
      }: {
        data: Array<{ name: string; value: number; color: string }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                paddingAngle={5}
                dataKey="value"
                nameKey="name"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false, loading: () => <Skeleton height={160} width={160} circle /> },
);

export default function AnalyticsDashboard() {
  const { ref: trafficRef, entry: trafficEntry } = useIntersection({
    rootMargin: "200px",
    threshold: 0.1,
  });
  const { ref: topPagesRef, entry: topPagesEntry } = useIntersection({
    rootMargin: "200px",
    threshold: 0.1,
  });
  const { ref: deviceRef, entry: deviceEntry } = useIntersection({
    rootMargin: "200px",
    threshold: 0.1,
  });

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

  return (
    <Stack gap="lg" role="region" aria-labelledby="analytics-heading">
      <Group justify="space-between" align="flex-start" mb="xl">
        <div>
          <Title order={1} fw={900} c="dark.5" lts="-0.02em">
            Website Analytics
          </Title>
          <Text c="dark.3" size="sm" fw={500}>
            View website traffic and user engagement metrics.
          </Text>
        </div>
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
          p="xl"
          radius="lg"
          shadow="sm"
          role="listitem"
          aria-label={
            loading
              ? "Loading active users"
              : `Active users: ${stats.activeNow} users currently on site`
          }
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="filled"
              color="green"
              aria-hidden="true"
            >
              <IconActivity size={28} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text c="#2D3748" size="xs" tt="uppercase" fw={700}>
                Active Now
              </Text>
              {loading ? (
                <Skeleton height={24} width="40%" mt={4} />
              ) : (
                <Text
                  fw={700}
                  size="xl"
                  c="green"
                  aria-label={`${stats.activeNow} active users`}
                >
                  {stats.activeNow}
                </Text>
              )}
              <Text c="dimmed" size="xs">
                users on site
              </Text>
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="xl"
          radius="lg"
          shadow="sm"
          role="listitem"
          aria-label={
            loading
              ? "Loading total visitors"
              : `Total visitors: ${stats.totalVisitors.toLocaleString()} visitors in the last 7 days`
          }
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="filled"
              color="blue"
              aria-hidden="true"
            >
              <IconUsers size={28} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text c="#2D3748" size="xs" tt="uppercase" fw={700}>
                Total Visitors (7d)
              </Text>
              {loading ? (
                <Skeleton height={24} width="60%" mt={4} />
              ) : (
                <Text
                  fw={700}
                  size="xl"
                  aria-label={`${stats.totalVisitors.toLocaleString()} total visitors`}
                >
                  {stats.totalVisitors.toLocaleString()}
                </Text>
              )}
            </div>
          </Group>
        </Paper>

        <Paper
          withBorder
          p="xl"
          radius="lg"
          shadow="sm"
          role="listitem"
          aria-label={
            loading
              ? "Loading page views"
              : `Page views: ${stats.totalPageViews.toLocaleString()} page views in the last 7 days`
          }
        >
          <Group>
            <ThemeIcon
              size="xl"
              radius="md"
              variant="filled"
              color="violet"
              aria-hidden="true"
            >
              <IconEye size={28} />
            </ThemeIcon>
            <div style={{ flex: 1 }}>
              <Text c="#2D3748" size="xs" tt="uppercase" fw={700}>
                Page Views (7d)
              </Text>
              {loading ? (
                <Skeleton height={24} width="60%" mt={4} />
              ) : (
                <Text
                  fw={700}
                  size="xl"
                  aria-label={`${stats.totalPageViews.toLocaleString()} total page views`}
                >
                  {stats.totalPageViews.toLocaleString()}
                </Text>
              )}
            </div>
          </Group>
        </Paper>
      </SimpleGrid>

      {/* 2. Traffic Chart */}
      <Paper
        withBorder
        p="xl"
        radius="lg"
        shadow="sm"
        role="region"
        aria-labelledby="traffic-chart-heading"
      >
        <Text fw={600} mb="lg" id="traffic-chart-heading">
          Traffic Overview
        </Text>
        <div
          ref={trafficRef}
          style={{ height: 300, width: "100%" }}
          role="img"
          aria-label={
            loading
              ? "Loading traffic chart"
              : `Traffic chart showing ${visitorData.length} data points for visitors and page views over time`
          }
        >
          {loading || !trafficEntry?.isIntersecting ? (
            <Skeleton height={300} />
          ) : (
            <Suspense fallback={<Skeleton height={300} />}>
              <TrafficChart data={visitorData} />
            </Suspense>
          )}
        </div>
      </Paper>

      <SimpleGrid cols={{ base: 1, md: 2 }}>
        {/* 3. Top Pages */}
        <Paper
          withBorder
          p="xl"
          radius="lg"
          shadow="sm"
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
            ref={topPagesRef}
            style={{ height: 250, width: "100%" }}
            role="img"
            aria-label={
              loading
                ? "Loading top pages chart"
                : `Bar chart showing top ${topPages.length} pages by views`
            }
          >
            {loading || !topPagesEntry?.isIntersecting ? (
              <Skeleton height={250} />
            ) : (
              <Suspense fallback={<Skeleton height={250} />}>
                <TopPagesChart data={topPages} />
              </Suspense>
            )}
          </div>
        </Paper>

        {/* 4. Device Breakdown */}
        <Paper
          withBorder
          p="xl"
          radius="lg"
          shadow="sm"
          role="region"
          aria-labelledby="device-usage-heading"
        >
          <Text fw={600} mb="md" id="device-usage-heading">
            Device Usage
          </Text>
          <Group justify="center" gap={40}>
            <div
              ref={deviceRef}
              style={{ width: 160, height: 160 }}
              role="img"
              aria-label={
                loading
                  ? "Loading device usage chart"
                  : `Pie chart showing device usage distribution`
              }
            >
              {loading || !deviceEntry?.isIntersecting ? (
                <Skeleton height={160} width={160} circle />
              ) : (
                <Suspense
                  fallback={<Skeleton height={160} width={160} circle />}
                >
                  <DeviceChart data={deviceData} />
                </Suspense>
              )}
            </div>
            <Stack gap="xs" role="list" aria-label="Device usage breakdown">
              {loading
                ? Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <Group key={i}>
                        <Skeleton height={24} width={24} radius="sm" />
                        <div>
                          <Skeleton height={14} width={60} mb={4} />
                          <Skeleton height={10} width={40} />
                        </div>
                      </Group>
                    ))
                : deviceData.map((d) => (
                    <Group key={d.name} role="listitem">
                      <ThemeIcon
                        color={d.color}
                        variant="filled"
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
                          c="#2D3748"
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
