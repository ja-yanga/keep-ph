"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Stack,
  Text,
  Badge,
  Container,
  Paper,
  Loader,
  Group,
  Center,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { IconReceipt, IconEye } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useSession } from "@/components/SessionProvider";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { ViewTransactionDetailsModal } from "./ViewTransactionDetailsModal";
import { AdminTable } from "@/components/common/AdminTable";
import { DataTableColumn } from "mantine-datatable";
import {
  T_CustomerTransaction,
  T_TransactionPaginationMeta,
} from "@/utils/types/transaction";
import { formatCurrency, formatDateShort } from "@/utils/format";
import { getBadgeStyles, getTransactionStatusColor } from "@/utils/get-color";
import {
  transformCustomerTransaction,
  T_RawTransaction,
} from "@/utils/transform/transaction";

const ITEMS_PER_PAGE = 10;

type ApiResponse = {
  data: T_RawTransaction[];
  meta: {
    pagination: T_TransactionPaginationMeta;
  };
};

const SubscriptionHistoryTab = () => {
  const { session } = useSession();
  const [transactions, setTransactions] = useState<T_CustomerTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<{
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  } | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<T_CustomerTransaction | null>(null);
  const [modalOpened, setModalOpened] = useState(false);

  const userId = useMemo(() => session?.user?.id, [session?.user?.id]);

  const handleViewTransaction = (transaction: T_CustomerTransaction) => {
    setSelectedTransaction(transaction as T_CustomerTransaction);
    setModalOpened(true);
  };

  const handleCloseModal = () => {
    setModalOpened(false);
    setSelectedTransaction(null);
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchTransactions = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = `${API_ENDPOINTS.user.transactions}?page=${page}&limit=${ITEMS_PER_PAGE}&sortBy=payment_transaction_date&sortDir=desc`;
        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(
            (errorData as { error?: string })?.error ||
              "Failed to load transactions",
          );
        }

        const json = (await res.json()) as ApiResponse;
        const transactionsData = json.data.map(transformCustomerTransaction);
        const paginationData = json.meta?.pagination;

        setTransactions(transactionsData);
        setPagination(paginationData || null);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load transactions";
        setError(errorMessage);
        notifications.show({
          title: "Error",
          message: errorMessage,
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [userId, page]);

  const columns: DataTableColumn<T_CustomerTransaction>[] = useMemo(
    () => [
      {
        accessor: "id",
        title: "Transaction ID",
        render: (transaction) => (
          <Text size="sm" fw={500}>
            {transaction.id || "—"}
          </Text>
        ),
      },
      {
        accessor: "date",
        title: "Date",
        render: (transaction) => (
          <Text size="sm">{formatDateShort(transaction.date)}</Text>
        ),
      },
      {
        accessor: "amount",
        title: "Amount",
        render: (transaction) => (
          <Text size="sm" fw={600}>
            {formatCurrency(Number(transaction.amount))}
          </Text>
        ),
      },
      {
        accessor: "method",
        title: "Payment Method",
        render: (transaction) => (
          <Text size="sm" c="dimmed">
            {transaction.method || transaction.channel || "N/A"}
          </Text>
        ),
      },
      {
        accessor: "status",
        title: "Status",
        render: (transaction) => {
          const statusColor = getTransactionStatusColor(
            transaction.status || "",
          );
          const badgeStyles = getBadgeStyles(statusColor);
          return (
            <Badge
              styles={{
                root: {
                  backgroundColor: badgeStyles.bg,
                  color: badgeStyles.color,
                },
              }}
              variant="light"
              size="sm"
            >
              {transaction.status.toUpperCase()}
            </Badge>
          );
        },
      },
      {
        accessor: "actions",
        title: "Actions",
        render: (transaction) => (
          <Group gap="xs" justify="flex-end">
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
      },
    ],
    [transactions, handleViewTransaction],
  );

  const renderContent = () => {
    if (loading) {
      return (
        <Center py="xl">
          <Group gap="md">
            <Loader size="sm" />
            <Text c="dimmed">Loading transactions...</Text>
          </Group>
        </Center>
      );
    }

    if (error) {
      return (
        <Stack align="center" py="xl">
          <IconReceipt size={48} color="red" />
          <Text c="red" fw={500}>
            {error}
          </Text>
        </Stack>
      );
    }

    if (transactions.length === 0) {
      return (
        <Stack align="center" py="xl">
          <IconReceipt size={48} color="gray" />
          <Text c="dimmed">No transactions found.</Text>
        </Stack>
      );
    }

    return (
      <AdminTable
        records={transactions}
        columns={columns}
        totalRecords={pagination?.total ?? 0}
        recordsPerPage={ITEMS_PER_PAGE}
        page={page}
        onPageChange={setPage}
      />
    );
  };
  return (
    <Container size="md" px={0}>
      <Stack>
        <Paper withBorder radius="md" p="md">
          {renderContent()}
        </Paper>
        {/* Transaction Details Modal */}
        <ViewTransactionDetailsModal
          opened={modalOpened}
          onClose={handleCloseModal}
          transaction={selectedTransaction}
        />
      </Stack>
    </Container>
  );
};

export default SubscriptionHistoryTab;
