"use client";

import { Modal, Stack, Text, Badge, Group, Divider } from "@mantine/core";
import { type T_Transaction } from "@/utils/types/transaction";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { getBadgeStyles, getTransactionStatusColor } from "@/utils/get-color";

type ViewTransactionDetailsModalProps = {
  opened: boolean;
  onClose: () => void;
  transaction: T_Transaction | null;
};

const getTransactionTypeDescription = (
  type: string | null | undefined,
): string => {
  if (!type) return "Payment Transaction";
  const typeMap: Record<string, string> = {
    SUBSCRIPTION: "Subscription Payment",
    ONE_TIME: "One-time Payment",
    REFUND: "Refund",
  };
  return typeMap[type] || type;
};

export const ViewTransactionDetailsModal = ({
  opened,
  onClose,
  transaction,
}: ViewTransactionDetailsModalProps) => {
  if (!transaction) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Transaction Details"
      size="lg"
      centered
    >
      <Stack gap="md">
        {/* Transaction Information */}
        <div>
          <Text size="sm" fw={600} mb="xs">
            Payment Information
          </Text>
          <Divider mb="sm" />
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Transaction ID:
              </Text>
              <Text size="sm" fw={500} style={{ wordBreak: "break-all" }}>
                {transaction.id}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Amount:
              </Text>
              <Text size="sm" fw={600}>
                {formatCurrency(transaction.amount || 0)}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Status:
              </Text>
              <Badge
                variant="light"
                size="sm"
                styles={{
                  root: {
                    backgroundColor: getBadgeStyles(
                      getTransactionStatusColor(transaction.status || ""),
                    ).bg,
                    color: getBadgeStyles(
                      getTransactionStatusColor(transaction.status || ""),
                    ).color,
                  },
                }}
              >
                {(transaction.status || "Unknown").toUpperCase()}
              </Badge>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Transaction Type:
              </Text>
              <Text size="sm">
                {getTransactionTypeDescription(transaction.type)}
              </Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Date:
              </Text>
              <Text size="sm">{formatDate(transaction.date)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Payment Method:
              </Text>
              <Text size="sm">
                {transaction.method || transaction.channel || "—"}
              </Text>
            </Group>
            {(transaction.reference_id ||
              transaction.reference ||
              transaction.order_id) && (
              <>
                {transaction.order_id && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Order ID:
                    </Text>
                    <Text size="sm" style={{ wordBreak: "break-all" }}>
                      {transaction.order_id}
                    </Text>
                  </Group>
                )}
                {transaction.reference_id && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Reference ID:
                    </Text>
                    <Text size="sm" style={{ wordBreak: "break-all" }}>
                      {transaction.reference_id}
                    </Text>
                  </Group>
                )}
                {transaction.reference && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Reference:
                    </Text>
                    <Text size="sm" style={{ wordBreak: "break-all" }}>
                      {transaction.reference}
                    </Text>
                  </Group>
                )}
              </>
            )}
          </Stack>
        </div>

        {/* Subscription Information */}
        {transaction.subscription && (
          <div>
            <Text size="sm" fw={600} mb="xs">
              Subscription Details
            </Text>
            <Divider mb="sm" />
            <Stack gap="xs">
              {transaction.subscription.billing_cycle && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Billing Cycle:
                  </Text>
                  <Text size="sm">
                    {transaction.subscription.billing_cycle}
                  </Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Auto Renew:
                </Text>
                <Badge
                  color={transaction.subscription.auto_renew ? "green" : "gray"}
                  variant="light"
                  size="sm"
                >
                  {transaction.subscription.auto_renew ? "Enabled" : "Disabled"}
                </Badge>
              </Group>
              {transaction.subscription.started_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Started:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.started_at)}
                  </Text>
                </Group>
              )}
              {transaction.subscription.expires_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Expires:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.expires_at)}
                  </Text>
                </Group>
              )}
            </Stack>
          </div>
        )}

        {/* Plan Information */}
        {transaction.plan && (
          <div>
            <Text size="sm" fw={600} mb="xs">
              Plan Details
            </Text>
            <Divider mb="sm" />
            <Stack gap="xs">
              {transaction.plan.name && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Plan Name:
                  </Text>
                  <Text size="sm" fw={500}>
                    {transaction.plan.name}
                  </Text>
                </Group>
              )}
              {transaction.plan.price !== null &&
                transaction.plan.price !== undefined && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Plan Price:
                    </Text>
                    <Text size="sm" fw={600}>
                      {formatCurrency(transaction.plan.price)}
                    </Text>
                  </Group>
                )}
              {transaction.plan.storage_limit !== null &&
                transaction.plan.storage_limit !== undefined && (
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                      Storage Limit:
                    </Text>
                    <Text size="sm">{transaction.plan.storage_limit} GB</Text>
                  </Group>
                )}
              {(transaction.plan.can_receive_mail ||
                transaction.plan.can_receive_parcels ||
                transaction.plan.can_digitize) && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Features:
                  </Text>
                  <Group gap="xs">
                    {transaction.plan.can_receive_mail && (
                      <Badge color="blue" variant="light" size="sm">
                        Mail
                      </Badge>
                    )}
                    {transaction.plan.can_receive_parcels && (
                      <Badge color="green" variant="light" size="sm">
                        Parcels
                      </Badge>
                    )}
                    {transaction.plan.can_digitize && (
                      <Badge color="violet" variant="light" size="sm">
                        Digitize
                      </Badge>
                    )}
                  </Group>
                </Group>
              )}
            </Stack>
          </div>
        )}
      </Stack>
    </Modal>
  );
};
