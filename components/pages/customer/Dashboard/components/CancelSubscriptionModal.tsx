import { Modal, Stack, Text, Paper, Group, Button } from "@mantine/core";
import { IconCreditCardOff } from "@tabler/icons-react";

type CancelSubscriptionModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
};

export function CancelSubscriptionModal({
  opened,
  onClose,
  onConfirm,
  loading,
}: CancelSubscriptionModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Cancel Subscription Renewal?"
      centered
    >
      <Stack>
        <Text size="sm">
          Are you sure you want to cancel the auto-renewal for this mailroom?
        </Text>
        <Paper withBorder p="sm" bg="gray.0">
          <Group gap="sm">
            <IconCreditCardOff size={20} color="gray" />
            <Text size="xs" c="#313131">
              You will retain access to your mailroom and packages until the
              current period expires. After that, the account will become
              inactive.
            </Text>
          </Group>
        </Paper>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose} disabled={loading}>
            Keep Subscription
          </Button>
          <Button color="red" onClick={onConfirm} loading={loading}>
            Cancel Renewal
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
