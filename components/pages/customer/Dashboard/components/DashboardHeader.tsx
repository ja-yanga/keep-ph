import { memo, useCallback } from "react";
import { Group, Box, Title, Text, TextInput, Button } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";
import Link from "next/link";

type DashboardHeaderProps = {
  firstName: string | null;
  search: string;
  onSearchChange: (value: string) => void;
};

const buttonStyle = {
  whiteSpace: "nowrap" as const,
  border: "1px solid #26316D",
};
const searchInputStyle = { flex: 1 };
const groupStyle = { flexWrap: "nowrap" as const };

function DashboardHeaderComponent({
  firstName,
  search,
  onSearchChange,
}: DashboardHeaderProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.currentTarget.value);
    },
    [onSearchChange],
  );

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
        style={groupStyle}
      >
        <TextInput
          placeholder="Search mailrooms"
          value={search}
          onChange={handleSearchChange}
          leftSection={<IconSearch size={16} />}
          size="md"
          __clearable
          style={searchInputStyle}
        />
        <Button
          component={Link}
          href="/mailroom/register"
          variant="outline"
          c="#26316D"
          style={buttonStyle}
        >
          Add New
        </Button>
      </Group>
    </Group>
  );
}

export const DashboardHeader = memo(DashboardHeaderComponent);
