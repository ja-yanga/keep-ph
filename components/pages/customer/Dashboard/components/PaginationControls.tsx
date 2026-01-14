import { Stack, Group, Text, Button } from "@mantine/core";

type PaginationControlsProps = {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  isMobile: boolean;
  onPageChange: (page: number) => void;
};

export function PaginationControls({
  currentPage,
  totalItems,
  itemsPerPage,
  isMobile,
  onPageChange,
}: PaginationControlsProps) {
  const start = (currentPage - 1) * itemsPerPage;
  const end = Math.min(start + itemsPerPage, totalItems);
  const startIndex = Math.min(start + 1, totalItems);

  return (
    <Stack gap="sm" mt="md" w="100%">
      <Group justify="center" display={{ base: "flex", sm: "none" }}>
        <Text size="sm" c="#313131">
          {startIndex}–{end} of {totalItems}
        </Text>
      </Group>
      <Group justify="space-between" align="center" w="100%">
        <Text size="sm" c="#313131" display={{ base: "none", sm: "block" }}>
          Showing {startIndex}–{end} of {totalItems}
        </Text>
        <Group w={{ base: "100%", sm: "auto" }} justify="space-between">
          <Button
            size="xs"
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            style={isMobile ? { flex: 1 } : undefined}
          >
            Previous
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={start + itemsPerPage >= totalItems}
            onClick={() => onPageChange(currentPage + 1)}
            style={{
              whiteSpace: "nowrap",
              border: "1px solid #26316D",
              ...(isMobile ? { flex: 1 } : {}),
            }}
            c="#26316D"
          >
            Next
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}
