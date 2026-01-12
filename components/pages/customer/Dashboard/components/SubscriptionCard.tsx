import {
  Card,
  Group,
  Stack,
  Box,
  Text,
  Badge,
  Button,
  SimpleGrid,
  Divider,
  ActionIcon,
  ThemeIcon,
} from "@mantine/core";
import {
  IconMapPin,
  IconCopy,
  IconChevronRight,
  IconPackage,
} from "@tabler/icons-react";
import Link from "next/link";
import { getStatusColor } from "@/utils/get-color";
import { MailroomRow } from "@/utils/types";

type SubscriptionCardProps = {
  row: MailroomRow;
  isMobile: boolean;
  onCopyAddress: (row: MailroomRow) => void;
  onCancelRenewal: (id: string) => void;
};

export function SubscriptionCard({
  row,
  isMobile,
  onCopyAddress,
  onCancelRenewal,
}: SubscriptionCardProps) {
  const handleCopyAddress = () => {
    onCopyAddress(row);
  };

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      style={{ display: "flex", flexDirection: "column" }}
    >
      {/* Header Section */}
      <Card.Section withBorder inheritPadding py="xs" bg="gray.0">
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center" style={{ flex: 1, minWidth: 0 }}>
            <ThemeIcon color="violet" variant="light" size="sm">
              <IconMapPin size={14} />
            </ThemeIcon>
            <Text fw={600} size="sm" truncate style={{ flex: 1 }}>
              {row.location ?? "Unknown Location"}
            </Text>
            <ActionIcon
              variant="light"
              size="sm"
              onClick={handleCopyAddress}
              title="Copy full shipping address"
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Group>
          <Badge
            size="sm"
            color={getStatusColor(row.mailroom_status)}
            variant="dot"
          >
            {row.mailroom_status}
          </Badge>
        </Group>
      </Card.Section>

      <Stack mt="md" gap="sm" style={{ flex: 1 }}>
        {/* Code and Plan */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Text size="xs" c="#313131" tt="uppercase" fw={700}>
              Mailroom Code
            </Text>
            <Text
              size="xl"
              fw={800}
              ff="monospace"
              c="violet.9"
              style={{ lineHeight: 1.2 }}
            >
              {row.mailroom_code ?? "PENDING"}
            </Text>
          </Box>

          <Box style={{ textAlign: isMobile ? "left" : "right" }}>
            <Text size="xs" c="#313131" tt="uppercase" fw={700}>
              Plan
            </Text>
            <Text fw={600} size="sm">
              {row.plan}
            </Text>
          </Box>
        </Group>

        {/* Subscriber Info */}
        <Box>
          <Text size="xs" c="#313131" tt="uppercase" fw={700}>
            Subscriber
          </Text>
          <Text fw={600} size="sm" lh={1.2}>
            {row.name}
          </Text>
          <Text size="xs" c="#313131" truncate>
            {row.email}
          </Text>
        </Box>

        <Divider my="xs" variant="dashed" />

        {/* Inventory and Expiry */}
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
          <Box>
            <Group gap={6} mb={4}>
              <IconPackage size={14} color="gray" />
              <Text size="xs" c="#313131">
                Current Inventory
              </Text>
            </Group>
            <Text fw={700} size="lg">
              {row.stats.stored}{" "}
              <small style={{ fontWeight: 400, color: "#313131" }}>items</small>
            </Text>
          </Box>

          <Box style={{ textAlign: isMobile ? "left" : "right" }}>
            <Text size="xs" c="#313131" tt="uppercase" fw={700}>
              {row.auto_renew ? "Renews On" : "Expires On"}
            </Text>
            <Text fw={500} size="sm" c={row.auto_renew ? "dark" : "red"}>
              {row.expiry_at
                ? new Date(row.expiry_at).toLocaleDateString()
                : "N/A"}
            </Text>
          </Box>
        </SimpleGrid>

        {/* Stats Badges */}
        <Group mt="xs" gap={8}>
          <Badge
            size="sm"
            variant="light"
            styles={{
              root: {
                backgroundColor: "#b2dfdb",
                color: "#004d40",
              },
            }}
          >
            Released: {row.stats.released}
          </Badge>

          <Badge
            size="sm"
            color={row.stats.pending > 0 ? "orange" : "#313131"}
            variant={row.stats.pending > 0 ? "filled" : "light"}
          >
            {row.stats.pending} request{row.stats.pending !== 1 ? "s" : ""}
          </Badge>
        </Group>
      </Stack>

      {/* Action Buttons */}
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="xl">
        <Button
          component={Link}
          href={`/mailroom/${row.id}`}
          radius="md"
          fullWidth
          bg="#26316D"
          rightSection={<IconChevronRight size={16} />}
        >
          Manage Mailbox
        </Button>

        {row.auto_renew && row.mailroom_status === "ACTIVE" && (
          <Button
            variant="filled"
            radius="md"
            fullWidth
            size="sm"
            styles={{
              root: {
                backgroundColor: "#d32f2f",
                color: "#ffffff",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                },
              },
            }}
            onClick={() => onCancelRenewal(row.id)}
          >
            Cancel Renewal
          </Button>
        )}
      </SimpleGrid>
    </Card>
  );
}
