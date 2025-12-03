"use client";

import { useState, useMemo, useEffect } from "react"; // Added useEffect
import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  Stack,
  Table,
  Text,
  Title,
  ThemeIcon,
  ActionIcon,
  Tooltip,
  Breadcrumbs,
  Anchor,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconRefresh,
  IconUser,
  IconMapPin,
  IconCalendar,
  IconLock,
  IconCreditCard,
  IconMail,
  IconPackage,
  IconScan,
} from "@tabler/icons-react";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";
import UserPackages from "./UserPackages";
import UserScans from "./UserScans"; // <--- Import the component

function addMonths(iso?: string | null, months = 0) {
  if (!iso) return null;
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

interface MailroomPackageViewProps {
  item: any;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export default function MailroomPackageView({
  item,
  loading,
  error,
  onRefresh,
}: MailroomPackageViewProps) {
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null);
  const [isStorageFull, setIsStorageFull] = useState(false);
  // 1. Add a refresh key state to force updates
  const [refreshKey, setRefreshKey] = useState(0);

  // 2. Create a wrapper function that triggers both local and parent refresh
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    onRefresh();
  };

  // Plan Capabilities
  const plan = item?.mailroom_plans || {};

  // Check storage usage
  useEffect(() => {
    const checkStorage = async () => {
      if (item?.id && plan.can_digitize) {
        try {
          const res = await fetch(`/api/user/scans?registrationId=${item.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.usage) {
              setIsStorageFull(data.usage.used_mb >= data.usage.limit_mb);
            }
          }
        } catch (e) {
          console.error("Failed to check storage usage", e);
        }
      }
    };

    checkStorage();
  }, [item, plan.can_digitize, refreshKey]); // 3. Add refreshKey to dependency array

  // Filter packages based on selected locker
  const filteredPackages = useMemo(() => {
    const pkgs = Array.isArray(item?.packages) ? item.packages : [];
    if (!selectedLockerId) return pkgs;

    return pkgs.filter((p: any) => {
      if (!Array.isArray(item?.lockers)) return false;

      const assigned = item.lockers.find(
        (l: any) =>
          l.id === p.locker_id ||
          l.locker_id === p.locker_id ||
          l.locker?.id === p.locker_id
      );

      return assigned && assigned.id === selectedLockerId;
    });
  }, [item, selectedLockerId]);

  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8F9FA",
        }}
      >
        <DashboardNav />
        <Container py="xl" size="xl">
          <Loader />
        </Container>
        <Footer />
      </Box>
    );
  }

  if (error || !item) {
    return (
      <Box
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#F8F9FA",
        }}
      >
        <DashboardNav />
        <Container py="xl" size="xl">
          <Paper p="xl" radius="md" withBorder>
            <Stack align="center">
              <Text c="red" size="lg" fw={500}>
                {error ?? "Not found"}
              </Text>
              <Link href="/dashboard">
                <Button leftSection={<IconArrowLeft size={16} />}>
                  Back to Dashboard
                </Button>
              </Link>
            </Stack>
          </Paper>
        </Container>
        <Footer />
      </Box>
    );
  }

  const accountNumber = `U${String(item.user_id ?? "u").slice(0, 8)}-L${String(
    item.location_id ?? item.mailroom_locations?.id ?? "l"
  ).slice(0, 8)}-M${String(item.id ?? "").slice(0, 8)}`;
  const expiry =
    item.months && item.created_at
      ? addMonths(item.created_at, Number(item.months))
      : item.expiry_at ?? null;

  const items = [
    { title: "Dashboard", href: "/dashboard" },
    { title: "Mailroom Details", href: "#" },
  ].map((item, index) => (
    <Anchor href={item.href} key={index} component={Link} size="sm">
      {item.title}
    </Anchor>
  ));

  return (
    <Box
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F8F9FA",
      }}
    >
      <DashboardNav />
      <main style={{ flex: 1 }}>
        <Container size="xl" py="xl">
          {/* Header Section */}
          <Stack gap="lg" mb="xl">
            <Breadcrumbs>{items}</Breadcrumbs>
            <Group justify="space-between" align="flex-start">
              <Box>
                <Title order={2} c="dark.8">
                  {item.mailroom_plans?.name ??
                    item.package_name ??
                    item.title ??
                    "Mailroom Package"}
                </Title>
                <Text c="dimmed" size="sm" mt={4}>
                  Account #: {accountNumber}
                </Text>
              </Box>
              <Group>
                <Tooltip label="Refresh Data">
                  {/* 4. Use handleRefresh instead of onRefresh directly */}
                  <ActionIcon variant="light" size="lg" onClick={handleRefresh}>
                    <IconRefresh size={20} />
                  </ActionIcon>
                </Tooltip>
                <Link href="/dashboard">
                  <Button
                    variant="default"
                    leftSection={<IconArrowLeft size={16} />}
                  >
                    Back
                  </Button>
                </Link>
              </Group>
            </Group>
          </Stack>

          <Grid gutter="md">
            {/* Left Column: Main Info */}
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Stack gap="md">
                {/* Status Cards Row */}
                <Grid gutter="md">
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Paper p="md" radius="md" withBorder shadow="sm">
                      <Group>
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color="blue"
                        >
                          <IconCalendar size={20} />
                        </ThemeIcon>
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            Subscription Expiry
                          </Text>
                          <Text fw={700} size="lg">
                            {expiry
                              ? new Date(expiry).toLocaleDateString()
                              : "—"}
                          </Text>
                        </Box>
                      </Group>
                    </Paper>
                  </Grid.Col>
                  <Grid.Col span={{ base: 12, sm: 6 }}>
                    <Paper p="md" radius="md" withBorder shadow="sm">
                      <Group>
                        <ThemeIcon
                          size="lg"
                          radius="md"
                          variant="light"
                          color={item.locker_status ? "gray" : "yellow"}
                        >
                          <IconLock size={20} />
                        </ThemeIcon>
                        <Box>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                            Locker Status
                          </Text>
                          <Badge
                            size="lg"
                            color={item.locker_status ? "gray" : "yellow"}
                          >
                            {item.locker_status ?? "Active"}
                          </Badge>
                        </Box>
                      </Group>
                    </Paper>
                  </Grid.Col>
                </Grid>

                {/* Lockers Section */}
                <Paper p="lg" radius="md" withBorder shadow="sm">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <IconLock size={20} color="gray" />
                      <Title order={4}>Assigned Lockers</Title>
                    </Group>
                    <Group>
                      {selectedLockerId && (
                        <Button
                          variant="subtle"
                          size="xs"
                          color="red"
                          onClick={() => setSelectedLockerId(null)}
                        >
                          Clear Filter
                        </Button>
                      )}
                      <Badge variant="light">
                        {item.locker_qty ?? item.lockers?.length ?? 0} Assigned
                      </Badge>
                    </Group>
                  </Group>
                  <Table highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Locker Code</Table.Th>
                        <Table.Th>Capacity Status</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Array.isArray(item.lockers) &&
                      item.lockers.length > 0 ? (
                        item.lockers.map((L: any) => (
                          <Table.Tr
                            key={L.id}
                            style={{ cursor: "pointer" }}
                            bg={
                              selectedLockerId === L.id
                                ? "var(--mantine-color-blue-0)"
                                : undefined
                            }
                            onClick={() =>
                              setSelectedLockerId((curr) =>
                                curr === L.id ? null : L.id
                              )
                            }
                          >
                            <Table.Td fw={500}>
                              {L.locker_code ??
                                L.locker?.locker_code ??
                                L.locker?.name ??
                                L.locker?.label ??
                                L.label ??
                                "—"}
                            </Table.Td>
                            <Table.Td>
                              {/* Render Capacity Status */}
                              <Badge
                                variant="light"
                                color={
                                  L.status === "Full"
                                    ? "red"
                                    : L.status === "Near Full"
                                    ? "orange"
                                    : L.status === "Empty"
                                    ? "gray"
                                    : "blue"
                                }
                              >
                                {L.status || "Normal"}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={2}>
                            <Text c="dimmed" size="sm">
                              No lockers assigned
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </Paper>

                {/* Packages Section */}
                <UserPackages
                  packages={filteredPackages}
                  lockers={item.lockers}
                  planCapabilities={{
                    can_receive_mail: plan.can_receive_mail === true,
                    can_receive_parcels: plan.can_receive_parcels === true,
                    can_digitize: plan.can_digitize === true,
                  }}
                  isStorageFull={isStorageFull}
                  onRefresh={handleRefresh} // 5. Pass handleRefresh here too so actions update the UI
                />

                {/* Digital Storage Section (Only if plan allows) */}
                {/* 6. Add key={refreshKey} to force UserScans to remount/refetch */}
                {plan.can_digitize && (
                  <UserScans key={refreshKey} registrationId={item.id} />
                )}
              </Stack>
            </Grid.Col>

            {/* Right Column: Details Sidebar */}
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Stack gap="md">
                {/* User Details Card */}
                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="indigo">
                      <IconUser size={18} />
                    </ThemeIcon>
                    <Text fw={600}>User Details</Text>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Full Name
                      </Text>
                      <Text fw={500}>
                        {item.full_name ??
                          item.user_name ??
                          item.users?.full_name ??
                          (`${
                            item.first_name ?? item.users?.first_name ?? ""
                          } ${
                            item.last_name ?? item.users?.last_name ?? ""
                          }`.trim() ||
                            "—")}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Email
                      </Text>
                      <Text fw={500} style={{ wordBreak: "break-all" }}>
                        {item.email ?? item.users?.email ?? "—"}
                      </Text>
                    </Box>
                    <Group grow>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Mobile
                        </Text>
                        <Text fw={500}>
                          {item.mobile ?? item.users?.mobile ?? "—"}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Telephone
                        </Text>
                        <Text fw={500}>
                          {item.telephone ?? item.users?.telephone ?? "—"}
                        </Text>
                      </Box>
                    </Group>
                  </Stack>
                </Paper>

                {/* Location Details Card */}
                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="orange">
                      <IconMapPin size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Location Details</Text>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Location Name
                      </Text>
                      <Text fw={500}>
                        {item.mailroom_locations?.name ?? "—"}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Address
                      </Text>
                      <Text fw={500} size="sm">
                        {[
                          item.mailroom_locations?.address,
                          item.mailroom_locations?.city,
                          item.mailroom_locations?.region,
                        ]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </Text>
                    </Box>
                  </Stack>
                </Paper>

                {/* Plan Details Card */}
                <Paper p="md" radius="md" withBorder shadow="sm">
                  <Group mb="md">
                    <ThemeIcon variant="light" color="teal">
                      <IconCreditCard size={18} />
                    </ThemeIcon>
                    <Text fw={600}>Plan Details</Text>
                  </Group>
                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" c="dimmed">
                        Plan Name
                      </Text>
                      <Text fw={500}>
                        {item.mailroom_plans?.name ?? item.plan ?? "—"}
                      </Text>
                    </Box>
                    <Box>
                      <Text size="xs" c="dimmed">
                        Date Created
                      </Text>
                      <Text fw={500}>
                        {item.created_at
                          ? new Date(item.created_at).toLocaleDateString()
                          : "—"}
                      </Text>
                    </Box>
                    <Group grow>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Registration Location
                        </Text>
                        <Text fw={500}>
                          {item.mailroom_locations?.name ?? "—"}
                        </Text>
                      </Box>
                      <Box>
                        <Text size="xs" c="dimmed">
                          Expiry Date
                        </Text>
                        <Text fw={500}>
                          {expiry ? new Date(expiry).toLocaleDateString() : "—"}
                        </Text>
                      </Box>
                    </Group>

                    {/* Plan Capabilities Icons */}
                    {(plan.can_receive_mail ||
                      plan.can_receive_parcels ||
                      plan.can_digitize) && (
                      <Box mt="xs">
                        <Text size="xs" c="dimmed" mb={6}>
                          Included Features
                        </Text>
                        <Group gap="xs">
                          {plan.can_receive_mail && (
                            <Tooltip label="Can Receive Mail" withArrow>
                              <ThemeIcon
                                variant="light"
                                color="blue"
                                size="md"
                                radius="md"
                              >
                                <IconMail size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                          {plan.can_receive_parcels && (
                            <Tooltip label="Can Receive Parcels" withArrow>
                              <ThemeIcon
                                variant="light"
                                color="orange"
                                size="md"
                                radius="md"
                              >
                                <IconPackage size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                          {plan.can_digitize && (
                            <Tooltip
                              label="Digital Scanning Included"
                              withArrow
                            >
                              <ThemeIcon
                                variant="light"
                                color="cyan"
                                size="md"
                                radius="md"
                              >
                                <IconScan size={18} />
                              </ThemeIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            </Grid.Col>
          </Grid>
        </Container>
      </main>
      <Footer />
    </Box>
  );
}
