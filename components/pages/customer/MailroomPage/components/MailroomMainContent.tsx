import {
  Badge,
  Button,
  Grid,
  Group,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Box,
} from "@mantine/core";
import { IconCalendar, IconLock } from "@tabler/icons-react";
import UserPackages from "../../../../UserPackages";
import UserScans from "../../../../UserScans";
import { getProp } from "../utils";
import { getStatusFormat } from "@/utils/helper";
import { MailroomMainContentProps } from "@/utils/types";

export default function MailroomMainContent({
  src,
  expiry,
  lockerCount,
  normalizedLockers,
  selectedLockerId,
  setSelectedLockerId,
  normalizedPackages,
  plan,
  isStorageFull,
  handleRefresh,
  scanMap,
  scans,
  refreshKey,
  mergedScans,
  scansUsage,
}: MailroomMainContentProps) {
  const mapTokenToHex = (token?: string | null) => {
    if (!token) return "#374151"; // gray-700
    const t = String(token).toLowerCase();
    if (t.includes("green")) return "#166534";
    if (t.includes("blue") || t.includes("indigo")) return "#1e3a8a";
    if (t.includes("gray") || t.includes("grey")) return "#374151";
    if (t.includes("yellow") || t.includes("amber")) return "#b45309";
    if (t.includes("orange")) return "#b45309";
    if (t.includes("red")) return "#991b1b";
    return "#374151";
  };

  return (
    <Stack gap="md">
      <Grid gutter="md">
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <Paper p="md" radius="md" withBorder shadow="sm">
            <Group>
              <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                <IconCalendar size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="gray.8" tt="uppercase" fw={700}>
                  Subscription Expiry
                </Text>
                <Text fw={700} size="lg">
                  {expiry ? new Date(expiry).toLocaleDateString() : "—"}
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
                color={getProp<string>(src, "locker_status") ? "gray" : "blue"}
              >
                <IconLock size={20} />
              </ThemeIcon>
              <Box>
                <Text size="xs" c="gray.8" tt="uppercase" fw={700}>
                  Locker Status
                </Text>

                {/* FIX: use explicit dark hex background + white text to guarantee contrast */}
                <Badge
                  size="lg"
                  variant="filled"
                  styles={{
                    root: {
                      backgroundColor: getProp<string>(src, "locker_status")
                        ? "#374151"
                        : "#1e3a8a",
                      color: "#ffffff",
                    },
                  }}
                >
                  {String(getProp<string>(src, "locker_status") ?? "Active")}
                </Badge>
              </Box>
            </Group>
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper p="lg" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconLock size={20} color="gray" />
            <Title order={3}>Assigned Lockers</Title>
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
            {/* FIX: explicit hex for Assigned badge */}
            <Badge
              variant="filled"
              styles={{
                root: { backgroundColor: "#1e3a8a", color: "#ffffff" },
              }}
            >
              {String(lockerCount)} Assigned
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
            {normalizedLockers.length > 0 ? (
              normalizedLockers.map((L) => (
                <Table.Tr
                  key={L.id}
                  style={{ cursor: "pointer" }}
                  bg={
                    selectedLockerId === L.id
                      ? "var(--mantine-color-blue-0)"
                      : undefined
                  }
                  onClick={() =>
                    setSelectedLockerId((curr) => (curr === L.id ? null : L.id))
                  }
                >
                  <Table.Td fw={500}>{L.code}</Table.Td>
                  <Table.Td>
                    {/* FIX: map getStatusFormat result to dark hex to guarantee contrast */}
                    <Badge
                      variant="filled"
                      styles={{
                        root: {
                          backgroundColor: mapTokenToHex(
                            getStatusFormat(L.status),
                          ),
                          color: "#ffffff",
                        },
                      }}
                    >
                      {L.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={2}>
                  <Text c="gray.7" size="sm">
                    No lockers assigned
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <UserPackages
        packages={normalizedPackages}
        lockers={normalizedLockers.map((l) => ({
          id: l.id,
          locker_code: l.code,
        }))}
        planCapabilities={{
          can_receive_mail: Boolean(plan.can_receive_mail),
          can_receive_parcels: Boolean(plan.can_receive_parcels),
          can_digitize: Boolean(plan.can_digitize),
        }}
        isStorageFull={isStorageFull}
        onRefreshAction={handleRefresh}
        scanMap={scanMap}
        scans={scans}
      />

      {plan.can_digitize && (
        <UserScans
          key={refreshKey}
          scans={mergedScans ?? []}
          usage={
            scansUsage
              ? {
                  used_mb: scansUsage.used_mb ?? 0,
                  limit_mb: scansUsage.limit_mb ?? 0,
                  percentage: scansUsage.percentage ?? 0,
                }
              : null
          }
        />
      )}
    </Stack>
  );
}
