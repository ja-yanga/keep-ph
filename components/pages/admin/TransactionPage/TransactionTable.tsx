"use client";

import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import {
  Stack,
  Title,
  SimpleGrid,
  Paper,
  Text,
  Badge,
  Group,
  ActionIcon,
  Loader,
  Center,
  Tooltip,
  Skeleton,
} from "@mantine/core";
import {
  IconArrowUp,
  IconArrowDown,
  IconCurrencyDollar,
  IconReceipt,
  IconTrendingUp,
  IconCheck,
  IconEye,
} from "@tabler/icons-react";
import { AdminTable } from "@/components/common/AdminTable";
import { type DataTableColumn } from "mantine-datatable";
import { StatCard } from "@/components/pages/admin/DashboardPage/StatCard";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { fetcher } from "@/utils/helper";
import { ViewTransactionDetailsModal } from "./ViewTransactionDetailsModal";
import {
  T_TransactionPaginationMeta,
  type T_Transaction,
} from "@/utils/types/transaction";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { getBadgeStyles, getTransactionStatusColor } from "@/utils/get-color";
import {
  transformTransaction,
  type T_RawTransaction,
} from "@/utils/transform/transaction";

type SortBy =
  | "payment_transaction_date"
  | "payment_transaction_created_at"
  | "payment_transaction_updated_at";
type SortDir = "asc" | "desc";

const ITEMS_PER_PAGE = 10;

// High-contrast color for secondary text (WCAG AA compliant - 6.2:1 contrast ratio)
const TEXT_SECONDARY_COLOR = "#313131";

const TransactionTable = () => {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortBy>("payment_transaction_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedTransaction, setSelectedTransaction] =
    useState<T_Transaction | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  // Build API URL with query parameters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: ITEMS_PER_PAGE.toString(),
      sortBy,
      sortDir,
    });
    return `${API_ENDPOINTS.admin.transactions}?${params.toString()}`;
  }, [page, sortBy, sortDir]);

  const { data, error, isLoading } = useSWR<{
    data: T_RawTransaction[];
    meta: {
      pagination: T_TransactionPaginationMeta;
      stats: {
        total_revenue: number;
        total_transactions: number;
        successful_transactions: number;
        avg_transaction: number;
      };
    };
  }>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
  });
  const transactions = useMemo(() => {
    return data?.data ? data.data.map(transformTransaction) : [];
  }, [data]);
  const pagination = data?.meta?.pagination;
  const stats = data?.meta?.stats;

  // Use backend-calculated metrics
  const metrics = useMemo(() => {
    return {
      totalRevenue: stats?.total_revenue ?? 0,
      totalTransactions: stats?.total_transactions ?? 0,
      successfulTransactions: stats?.successful_transactions ?? 0,
      avgTransaction: stats?.avg_transaction ?? 0,
    };
  }, [stats]);

  const handleSort = useCallback(
    (field: SortBy) => {
      if (sortBy === field) {
        setSortDir(sortDir === "asc" ? "desc" : "asc");
      } else {
        setSortBy(field);
        setSortDir("desc");
      }
      setPage(1); // Reset to first page when sorting changes
    },
    [sortBy, sortDir],
  );

  const handleViewTransaction = useCallback((transaction: T_Transaction) => {
    setSelectedTransaction(transaction);
    setModalOpened(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpened(false);
    setSelectedTransaction(null);
  }, []);

  // Memoized render functions for better performance
  const renderId = useCallback(
    (transaction: T_Transaction) => (
      <Text size="sm" fw={500}>
        {transaction.id || "—"}
      </Text>
    ),
    [],
  );

  const renderName = useCallback(
    (transaction: T_Transaction) => (
      <Text size="sm">{transaction.name || "—"}</Text>
    ),
    [],
  );

  const renderDate = useCallback(
    (transaction: T_Transaction) => (
      <Text size="sm">{formatDate(transaction.date)}</Text>
    ),
    [],
  );

  const renderAmount = useCallback(
    (transaction: T_Transaction) => (
      <Text size="sm" fw={600}>
        {formatCurrency(transaction.amount || 0)}
      </Text>
    ),
    [],
  );

  const renderMethod = useCallback(
    (transaction: T_Transaction) => (
      <Text size="sm" style={{ color: TEXT_SECONDARY_COLOR }}>
        {transaction.method || "—"}
      </Text>
    ),
    [],
  );

  const renderStatus = useCallback((transaction: T_Transaction) => {
    const statusColor = getTransactionStatusColor(transaction.status || "");
    const badgeStyles = getBadgeStyles(statusColor);

    return (
      <Badge
        variant="filled"
        size="sm"
        styles={{
          root: {
            backgroundColor: badgeStyles.bg,
            color: badgeStyles.color,
          },
        }}
      >
        {(transaction.status || "Unknown").toUpperCase()}
      </Badge>
    );
  }, []);

  const renderActions = useCallback(
    (transaction: T_Transaction) => (
      <Group gap="xs" justify="flex-end" wrap="nowrap">
        <Tooltip label="View Details">
          <ActionIcon
            variant="subtle"
            color="blue"
            onClick={() => handleViewTransaction(transaction)}
            aria-label={`View details of transaction ${transaction.id}`}
          >
            <IconEye size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>
    ),
    [handleViewTransaction],
  );

  const renderDateHeader = useMemo(
    () => (
      <Group
        gap={4}
        style={{ cursor: "pointer" }}
        onClick={() => handleSort("payment_transaction_date")}
      >
        <Text fw={sortBy === "payment_transaction_date" ? 700 : 600} size="sm">
          Date
        </Text>
        {sortBy === "payment_transaction_date" && (
          <ActionIcon
            size="sm"
            variant="transparent"
            color="blue"
            onClick={(e) => {
              e.stopPropagation();
              handleSort("payment_transaction_date");
            }}
            aria-label={`Sort by date ${sortDir === "asc" ? "ascending" : "descending"}`}
          >
            {sortDir === "asc" ? (
              <IconArrowUp size={16} />
            ) : (
              <IconArrowDown size={16} />
            )}
          </ActionIcon>
        )}
      </Group>
    ),
    [sortBy, sortDir, handleSort],
  );

  const columns: DataTableColumn<T_Transaction>[] = useMemo(
    () => [
      {
        accessor: "id",
        title: "Transaction ID",
        render: renderId,
      },
      {
        accessor: "name",
        title: "Name",
        render: renderName,
      },
      {
        accessor: "date",
        title: renderDateHeader,
        render: renderDate,
      },
      {
        accessor: "amount",
        title: "Amount",
        render: renderAmount,
      },
      {
        accessor: "method",
        title: "Payment Method",
        render: renderMethod,
      },
      {
        accessor: "status",
        title: "Status",
        render: renderStatus,
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 100,
        textAlign: "right" as const,
        render: renderActions,
      },
    ],
    [
      renderId,
      renderName,
      renderDate,
      renderAmount,
      renderMethod,
      renderStatus,
      renderActions,
      renderDateHeader,
    ],
  );

  if (isLoading) {
    return (
      <Stack
        gap="xl"
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard data"
      >
        <Skeleton h={32} w={200} mb="xs" />
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} h={120} radius="lg" />
          ))}
        </SimpleGrid>

        {/* Use a lighter skeleton for the table container initially */}
        <Paper withBorder p="lg" radius="md" h={300}>
          <Center h="100%">
            <Loader size="sm" color="gray" />
          </Center>
        </Paper>
      </Stack>
    );
  }

  if (error) {
    return (
      <Center h={400}>
        <Stack align="center" gap="md">
          <Text c="red" size="lg" fw={500}>
            Error loading transactions
          </Text>
          <Text style={{ color: TEXT_SECONDARY_COLOR }} size="sm">
            {error instanceof Error
              ? error.message
              : "An unknown error occurred"}
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      <Title order={2}>Transactions</Title>

      {/* Summary Metrics Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          description="From completed transactions"
          icon={IconCurrencyDollar}
          color="green"
          href="#"
          aria-label={`Total revenue: ${formatCurrency(metrics.totalRevenue)}`}
        />
        <StatCard
          title="Total Transactions"
          value={metrics.totalTransactions}
          description="All transactions"
          icon={IconReceipt}
          color="blue"
          href="#"
          aria-label={`Total transactions: ${metrics.totalTransactions}`}
        />
        <StatCard
          title="Successful"
          value={metrics.successfulTransactions}
          description="Completed payments"
          icon={IconCheck}
          color="teal"
          href="#"
          aria-label={`Successful transactions: ${metrics.successfulTransactions}`}
        />
        <StatCard
          title="Average Transaction"
          value={formatCurrency(metrics.avgTransaction)}
          description="Per successful transaction"
          icon={IconTrendingUp}
          color="violet"
          href="#"
          aria-label={`Average transaction: ${formatCurrency(metrics.avgTransaction)}`}
        />
      </SimpleGrid>

      {/* Transactions Table */}
      <Paper withBorder radius="md" p="md">
        {isLoading && (
          <Center h={400}>
            <Loader size="lg" />
          </Center>
        )}
        {!isLoading && transactions.length === 0 && (
          <Center h={400}>
            <Stack align="center" gap="md">
              <IconReceipt size={48} color="gray" />
              <Text style={{ color: TEXT_SECONDARY_COLOR }}>
                No transactions found.
              </Text>
            </Stack>
          </Center>
        )}
        {!isLoading && transactions.length > 0 && (
          <Stack gap="md">
            <AdminTable
              records={transactions}
              columns={columns}
              totalRecords={pagination?.total ?? 0}
              recordsPerPage={ITEMS_PER_PAGE}
              page={page}
              onPageChange={setPage}
            />
          </Stack>
        )}
      </Paper>

      {/* Transaction Details Modal */}
      <ViewTransactionDetailsModal
        opened={modalOpened}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />
    </Stack>
  );
};

export default TransactionTable;
