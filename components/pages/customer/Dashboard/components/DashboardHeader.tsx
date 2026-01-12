import { Group, Box, Title, Text, TextInput, Button } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";

type DashboardHeaderProps = {
  firstName: string | null;
  search: string;
  onSearchChange: (value: string) => void;
};

export function DashboardHeader({
  firstName,
  search,
  onSearchChange,
}: DashboardHeaderProps) {
  return (
    <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
      <Box w={{ base: "100%", sm: "auto" }}>
        <Title order={2} c="dark.8">
          Hello, {firstName ?? "User"}
        </Title>
        <Text c="#313131">Here is what&apos;s happening with your mail.</Text>
      </Box>
      <Group
        gap="sm"
        align="center"
        w={{ base: "100%", sm: "auto" }}
        style={{ flexWrap: "nowrap" }}
      >
        <TextInput
          placeholder="Search mailrooms"
          value={search}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          leftSection={<IconSearch size={16} />}
          size="md"
          __clearable
          style={{ flex: 1 }}
        />
        <Button
          component={Link}
          href="/mailroom/register"
          variant="outline"
          c="#26316D"
          style={{ whiteSpace: "nowrap", border: "1px solid #26316D" }}
        >
          Add New
        </Button>
      </Group>
    </Group>
  );
}
