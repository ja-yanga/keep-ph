import { Paper, Group, Text, ThemeIcon, SimpleGrid } from "@mantine/core";
import {
  IconBox,
  IconTruckDelivery,
  IconAlertCircle,
} from "@tabler/icons-react";

type StatsCardsProps = {
  stored: number;
  pending: number;
  released: number;
  hasData: boolean;
};

export function StatsCards({
  stored,
  pending,
  released,
  hasData,
}: StatsCardsProps) {
  return (
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
      <Paper
        p="md"
        radius="md"
        withBorder
        shadow="xs"
        bg={hasData ? "blue.0" : undefined}
      >
        <Group>
          <ThemeIcon size="xl" radius="md" color="blue" variant="filled">
            <IconBox size={24} />
          </ThemeIcon>
          <div>
            <Text c="#313131" size="xs" tt="uppercase" fw={700}>
              Items in Storage
            </Text>
            <Text fw={700} size="xl" c="blue.9">
              {stored}
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="xs">
        <Group>
          <ThemeIcon size="xl" radius="md" color="orange" variant="light">
            <IconAlertCircle size={24} />
          </ThemeIcon>
          <div>
            <Text c="#313131" size="xs" tt="uppercase" fw={700}>
              Pending Requests
            </Text>
            <Text fw={700} size="xl">
              {pending}
            </Text>
          </div>
        </Group>
      </Paper>

      <Paper p="md" radius="md" withBorder shadow="xs">
        <Group>
          <ThemeIcon size="xl" radius="md" color="teal" variant="light">
            <IconTruckDelivery size={24} />
          </ThemeIcon>
          <div>
            <Text c="#313131" size="xs" tt="uppercase" fw={700}>
              Total Released
            </Text>
            <Text fw={700} size="xl">
              {released}
            </Text>
          </div>
        </Group>
      </Paper>
    </SimpleGrid>
  );
}
