import { memo, useMemo, useCallback } from "react";
import { Stack, Group, Text, Button } from "@mantine/core";

type PaginationControlsProps = {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  isMobile: boolean;
  onPageChange: (page: number) => void;
};

function PaginationControlsComponent({
  currentPage,
  totalItems,
  itemsPerPage,
  isMobile,
  onPageChange,
}: PaginationControlsProps) {
  const { start, end, startIndex } = useMemo(() => {
    const s = (currentPage - 1) * itemsPerPage;
    const e = Math.min(s + itemsPerPage, totalItems);
    const si = Math.min(s + 1, totalItems);
    return { start: s, end: e, startIndex: si };
  }, [currentPage, itemsPerPage, totalItems]);

  const handlePrevious = useCallback(() => {
    onPageChange(Math.max(1, currentPage - 1));
  }, [onPageChange, currentPage]);

  const handleNext = useCallback(() => {
    onPageChange(currentPage + 1);
  }, [onPageChange, currentPage]);

  const previousButtonStyle = useMemo(
    () => (isMobile ? { flex: 1 } : undefined),
    [isMobile],
  );

  const nextButtonStyle = useMemo(
    () => ({
      whiteSpace: "nowrap" as const,
      border: "1px solid #26316D",
      ...(isMobile ? { flex: 1 } : {}),
    }),
    [isMobile],
  );

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
            onClick={handlePrevious}
            style={previousButtonStyle}
          >
            Previous
          </Button>
          <Button
            size="xs"
            variant="outline"
            disabled={start + itemsPerPage >= totalItems}
            onClick={handleNext}
            style={nextButtonStyle}
            c="#26316D"
          >
            Next
          </Button>
        </Group>
      </Group>
    </Stack>
  );
}

export const PaginationControls = memo(PaginationControlsComponent);
