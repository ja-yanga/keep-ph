"use client";

import { Modal, Stack, Text, Badge, Group, Divider } from "@mantine/core";
import { type T_Transaction } from "@/utils/types/transaction";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/format";
import { getBadgeStyles, getTransactionStatusColor } from "@/utils/get-color";

// Re-export for backward compatibility
export type { T_Transaction };

type ViewTransactionDetailsModalProps = {
  opened: boolean;
  onClose: () => void;
  transaction: T_Transaction | null;
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
            Transaction Information
          </Text>
          <Divider mb="sm" />
          <Stack gap="xs">
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Transaction ID:
              </Text>
              <Text size="sm" fw={500}>
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
                Date:
              </Text>
              <Text size="sm">{formatDate(transaction.date)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Payment Method:
              </Text>
              <Text size="sm">{transaction.method || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Type:
              </Text>
              <Text size="sm">{transaction.type || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Channel:
              </Text>
              <Text size="sm">{transaction.channel || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Reference ID:
              </Text>
              <Text size="sm">{transaction.reference_id || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Reference:
              </Text>
              <Text size="sm">{transaction.reference || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Order ID:
              </Text>
              <Text size="sm">{transaction.order_id || "—"}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Created At:
              </Text>
              <Text size="sm">{formatDate(transaction.created_at)}</Text>
            </Group>
            <Group justify="space-between">
              <Text size="sm" c="dimmed">
                Updated At:
              </Text>
              <Text size="sm">{formatDate(transaction.updated_at)}</Text>
            </Group>
            {transaction.mailroom_registration_id && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Registration ID:
                </Text>
                <Text size="sm" style={{ wordBreak: "break-all" }}>
                  {transaction.mailroom_registration_id}
                </Text>
              </Group>
            )}
          </Stack>
        </div>

        {/* User Information */}
        {(transaction.name ||
          transaction.email ||
          transaction.mobile_number) && (
          <div>
            <Text size="sm" fw={600} mb="xs">
              User Information
            </Text>
            <Divider mb="sm" />
            <Stack gap="xs">
              {transaction.user_id && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    User ID:
                  </Text>
                  <Text size="sm" style={{ wordBreak: "break-all" }}>
                    {transaction.user_id}
                  </Text>
                </Group>
              )}
              {transaction.name && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Name:
                  </Text>
                  <Text size="sm">{transaction.name}</Text>
                </Group>
              )}
              {transaction.email && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Email:
                  </Text>
                  <Text size="sm">{transaction.email}</Text>
                </Group>
              )}
              {transaction.mobile_number && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Mobile Number:
                  </Text>
                  <Text size="sm">{transaction.mobile_number}</Text>
                </Group>
              )}
            </Stack>
          </div>
        )}

        {/* Subscription Information */}
        {transaction.subscription && (
          <div>
            <Text size="sm" fw={600} mb="xs">
              Subscription Information
            </Text>
            <Divider mb="sm" />
            <Stack gap="xs">
              {transaction.subscription.id && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Subscription ID:
                  </Text>
                  <Text size="sm" style={{ wordBreak: "break-all" }}>
                    {transaction.subscription.id}
                  </Text>
                </Group>
              )}
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
                  {transaction.subscription.auto_renew ? "Yes" : "No"}
                </Badge>
              </Group>
              {transaction.subscription.started_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Started At:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.started_at)}
                  </Text>
                </Group>
              )}
              {transaction.subscription.expires_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Expires At:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.expires_at)}
                  </Text>
                </Group>
              )}
              {transaction.subscription.created_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Created At:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.created_at)}
                  </Text>
                </Group>
              )}
              {transaction.subscription.updated_at && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Updated At:
                  </Text>
                  <Text size="sm">
                    {formatDate(transaction.subscription.updated_at)}
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
              Plan Information
            </Text>
            <Divider mb="sm" />
            <Stack gap="xs">
              {transaction.plan.id && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Plan ID:
                  </Text>
                  <Text size="sm" style={{ wordBreak: "break-all" }}>
                    {transaction.plan.id}
                  </Text>
                </Group>
              )}
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
                      Price:
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
              {transaction.plan.description && (
                <Group justify="space-between" align="flex-start">
                  <Text size="sm" c="dimmed">
                    Description:
                  </Text>
                  <Text
                    size="sm"
                    style={{ maxWidth: "60%", textAlign: "right" }}
                  >
                    {transaction.plan.description}
                  </Text>
                </Group>
              )}
              <Group justify="space-between">
                <Text size="sm" c="dimmed">
                  Capabilities:
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
                  {!transaction.plan.can_receive_mail &&
                    !transaction.plan.can_receive_parcels &&
                    !transaction.plan.can_digitize && <Text size="sm">—</Text>}
                </Group>
              </Group>
            </Stack>
          </div>
        )}
      </Stack>
    </Modal>
  );
};
