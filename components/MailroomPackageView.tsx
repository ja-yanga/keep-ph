"use client";

import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
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
  IconBox,
  IconUser,
  IconMapPin,
  IconCalendar,
  IconLock,
  IconCreditCard,
  IconPackage,
} from "@tabler/icons-react";
import Link from "next/link";
import DashboardNav from "@/components/DashboardNav";
import Footer from "@/components/Footer";

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
                  <ActionIcon variant="light" size="lg" onClick={onRefresh}>
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

                {/* Packages Section */}
                <Paper p="lg" radius="md" withBorder shadow="sm">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <IconPackage size={20} color="gray" />
                      <Title order={4}>Packages</Title>
                    </Group>
                    <Badge variant="light" size="lg">
                      {item.packages?.length ?? 0} Items
                    </Badge>
                  </Group>
                  <ScrollArea style={{ maxHeight: 400 }}>
                    <Table
                      verticalSpacing="sm"
                      striped
                      highlightOnHover
                      withTableBorder
                    >
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Tracking #</Table.Th>
                          <Table.Th>Type</Table.Th>
                          <Table.Th>Locker</Table.Th>
                          <Table.Th>Status</Table.Th>
                          <Table.Th>Received</Table.Th>
                          <Table.Th>Action</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Array.isArray(item.packages) &&
                        item.packages.length > 0 ? (
                          item.packages.map((p: any) => {
                            const tracking = p.tracking_number || "—";
                            const type = p.package_type || "Parcel";

                            // Resolve locker code: Check direct relation first, then fallback to assigned lockers list
                            let lockerCode = p.locker?.locker_code;

                            if (
                              !lockerCode &&
                              p.locker_id &&
                              Array.isArray(item.lockers)
                            ) {
                              const assigned = item.lockers.find(
                                (l: any) =>
                                  l.id === p.locker_id ||
                                  l.locker_id === p.locker_id ||
                                  l.locker?.id === p.locker_id
                              );
                              if (assigned) {
                                lockerCode =
                                  assigned.locker_code ||
                                  assigned.locker?.locker_code;
                              }
                            }

                            lockerCode = lockerCode || "—";

                            const status = p.status || "STORED";
                            const receivedDate = p.received_at;

                            let statusColor = "blue";
                            if (["RELEASED", "RETRIEVED"].includes(status))
                              statusColor = "green";
                            else if (status === "DISPOSED") statusColor = "red";
                            else if (status.includes("REQUEST"))
                              statusColor = "orange";

                            return (
                              <Table.Tr key={p.id}>
                                <Table.Td>
                                  <Text fw={500} size="sm">
                                    {tracking}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge variant="light" color="gray" size="sm">
                                    {type}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  {lockerCode !== "—" ? (
                                    <Badge
                                      variant="outline"
                                      color="gray"
                                      size="sm"
                                      leftSection={<IconLock size={10} />}
                                    >
                                      {lockerCode}
                                    </Badge>
                                  ) : (
                                    <Text size="sm" c="dimmed">
                                      —
                                    </Text>
                                  )}
                                </Table.Td>
                                <Table.Td>
                                  <Badge
                                    color={statusColor}
                                    variant="light"
                                    size="sm"
                                  >
                                    {status.replace(/_/g, " ")}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" c="dimmed">
                                    {receivedDate
                                      ? new Date(
                                          receivedDate
                                        ).toLocaleDateString()
                                      : "—"}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Group gap="xs">
                                    {status === "STORED" && (
                                      <Tooltip label="Request Release">
                                        <ActionIcon
                                          variant="light"
                                          color="blue"
                                          size="sm"
                                        >
                                          <IconBox size={14} />
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                            );
                          })
                        ) : (
                          <Table.Tr>
                            <Table.Td colSpan={6}>
                              <Stack align="center" py="xl">
                                <IconBox
                                  size={40}
                                  color="var(--mantine-color-gray-3)"
                                />
                                <Text c="dimmed">No packages found</Text>
                              </Stack>
                            </Table.Td>
                          </Table.Tr>
                        )}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Paper>

                {/* Lockers Section */}
                <Paper p="lg" radius="md" withBorder shadow="sm">
                  <Group justify="space-between" mb="md">
                    <Group gap="xs">
                      <IconLock size={20} color="gray" />
                      <Title order={4}>Assigned Lockers</Title>
                    </Group>
                    <Badge variant="light">
                      {item.locker_qty ?? item.lockers?.length ?? 0} Assigned
                    </Badge>
                  </Group>
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Locker Code</Table.Th>
                        <Table.Th>Availability</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {Array.isArray(item.lockers) &&
                      item.lockers.length > 0 ? (
                        item.lockers.map((L: any) => (
                          <Table.Tr key={L.id}>
                            <Table.Td fw={500}>
                              {L.locker_code ??
                                L.locker?.locker_code ??
                                L.locker?.name ??
                                L.locker?.label ??
                                L.label ??
                                "—"}
                            </Table.Td>
                            <Table.Td>
                              {(() => {
                                const isAvail =
                                  L.is_available !== undefined
                                    ? L.is_available
                                    : L.locker?.is_available !== undefined
                                    ? L.locker?.is_available
                                    : null;

                                if (isAvail === null)
                                  return <Text size="sm">—</Text>;
                                return (
                                  <Badge
                                    color={isAvail ? "green" : "red"}
                                    variant="light"
                                  >
                                    {isAvail ? "Available" : "Occupied"}
                                  </Badge>
                                );
                              })()}
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
