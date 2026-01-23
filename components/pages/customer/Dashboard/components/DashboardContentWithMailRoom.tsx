"use client";

import { useCallback, useState, useMemo, startTransition } from "react";
import dynamic from "next/dynamic";
import {
  Stack,
  Loader,
  Text,
  Button,
  Divider,
  SimpleGrid,
  Container,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
import type { RawRow } from "@/utils/types";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import {
  useRegistrations,
  useFilteredRows,
  useStats,
  useKycFirstName,
} from "../hooks";
import { getFullAddressFromRaw } from "@/utils/get-full-address-from-raw";
import { DashboardFilters } from "@/utils/types";
import { DashboardHeader } from "./DashboardHeader";
import { SubscriptionCard } from "./SubscriptionCard";
import { PaginationControls } from "./PaginationControls";

// Lazy load non-critical components to reduce initial bundle and TBT
const StatsCards = dynamic(
  () => import("./StatsCards").then((m) => ({ default: m.StatsCards })),
  {
    ssr: false,
    loading: () => (
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            style={{ height: 100, background: "#f0f0f0", borderRadius: 8 }}
          />
        ))}
      </SimpleGrid>
    ),
  },
);

const CancelSubscriptionModal = dynamic(
  () =>
    import("./CancelSubscriptionModal").then((m) => ({
      default: m.CancelSubscriptionModal,
    })),
  { ssr: false },
);

const ITEMS_PER_PAGE = 2;

// Memoize filters object to prevent unnecessary re-renders
const DEFAULT_FILTERS: DashboardFilters = {
  plan: null,
  location: null,
  mailroomStatus: null,
};

const dividerStyles = {
  label: {
    color: "#313131",
  },
};

export default function DashboardContentWithMailRoom({
  initialData,
}: {
  initialData?: RawRow[] | null;
}) {
  // Optimize media query - disable initial value in effect for better SSR performance
  const isMobile = useMediaQuery("(max-width: 48em)", false);
  const [page, setPage] = useState<number>(1);
  const [search, setSearch] = useState("");
  const [filters] = useState<DashboardFilters>(DEFAULT_FILTERS);

  // Modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  // Data hooks - pass search and pagination to backend
  const { rows, totals, loading, error, refresh, pagination } =
    useRegistrations(initialData, search, page, ITEMS_PER_PAGE);
  const filtered = useFilteredRows(rows, filters);
  const { storedCount, pendingCount, releasedCount } = useStats(totals, rows);
  const firstName = useKycFirstName();

  // Handlers - use startTransition for non-urgent updates to reduce TBT
  const handleSearchChange = useCallback((value: string) => {
    startTransition(() => {
      setSearch(value);
      setPage(1); // Reset to first page when searching
    });
  }, []);

  const handleCancelRenewal = useCallback((id: string) => {
    setSelectedSubId(id);
    setCancelModalOpen(true);
  }, []);

  const handleCancelSubscription = useCallback(async (): Promise<void> => {
    if (!selectedSubId) return;
    setCanceling(true);
    try {
      const res = await fetch(
        `${API_ENDPOINTS.mailroom.registration(selectedSubId)}/cancel`,
        { method: "PATCH" },
      );
      if (!res.ok) throw new Error("Failed to cancel subscription");

      notifications.show({
        title: "Subscription Canceled",
        message: "Your plan will not renew after the current period.",
        color: "orange",
      });

      // Update local state
      if (rows) {
        refresh();
      }

      setCancelModalOpen(false);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Unknown error occurred";
      notifications.show({
        title: "Error",
        message: errorMessage,
        color: "red",
      });
    } finally {
      setCanceling(false);
    }
  }, [refresh, rows, selectedSubId]);

  const copyFullShippingAddress = useCallback(
    async (row: (typeof filtered)[0]): Promise<void> => {
      const code = row.mailroom_code ?? null;
      const full = getFullAddressFromRaw(row.raw) ?? row.location ?? null;
      const txt = `${code ? `${code} ` : ""}${full ?? ""}`.trim();

      if (!txt) {
        notifications.show({
          title: "Nothing to copy",
          message: "No full address available",
          color: "yellow",
        });
        return;
      }

      try {
        await navigator.clipboard.writeText(txt);
        notifications.show({
          title: "Copied",
          message: "Full shipping address copied to clipboard",
          color: "teal",
        });
      } catch (e: unknown) {
        console.error("copy failed", e);
        notifications.show({
          title: "Copy failed",
          message: (e as Error).message ?? String(e),
          color: "red",
        });
      }
    },
    [],
  );

  // Backend handles pagination, so we use filtered rows directly
  const pageItems = filtered;

  // All hooks must be called before any early returns
  const hasData = useMemo(() => Boolean(rows && rows.length > 0), [rows]);

  const handlePageChange = useCallback((newPage: number) => {
    startTransition(() => {
      setPage(newPage);
    });
  }, []);

  const handleCloseModal = useCallback(() => {
    setCancelModalOpen(false);
  }, []);

  const totalItems = useMemo(() => pagination?.total ?? 0, [pagination?.total]);

  const showPagination = useMemo(
    () => pagination && pagination.total > ITEMS_PER_PAGE,
    [pagination],
  );

  // Error state - must be after all hooks
  if (error) {
    return (
      <Stack align="center" py="xl">
        <Text c="red" fw={700}>
          Error
        </Text>
        <Text c="#313131">{error}</Text>
        <Button mt="md" onClick={refresh}>
          Retry
        </Button>
      </Stack>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <DashboardHeader
          firstName={firstName}
          search={search}
          onSearchChange={handleSearchChange}
        />

        <StatsCards
          stored={storedCount}
          pending={pendingCount}
          released={releasedCount}
          hasData={hasData}
        />

        <Divider
          label="Your Active Subscriptions"
          labelPosition="center"
          styles={dividerStyles}
        />
        {loading && (
          <Stack align="center" py="xl">
            <Loader size="md" />
            <Text c="#313131">Loading...</Text>
          </Stack>
        )}
        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
          {pageItems.map((row) => (
            <SubscriptionCard
              key={row.id}
              row={row}
              isMobile={isMobile}
              onCopyAddress={copyFullShippingAddress}
              onCancelRenewal={handleCancelRenewal}
            />
          ))}
        </SimpleGrid>

        {showPagination && (
          <PaginationControls
            currentPage={page}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            isMobile={isMobile}
            onPageChange={handlePageChange}
          />
        )}

        <CancelSubscriptionModal
          opened={cancelModalOpen}
          onClose={handleCloseModal}
          onConfirm={handleCancelSubscription}
          loading={canceling}
        />
      </Stack>
    </Container>
  );
}
