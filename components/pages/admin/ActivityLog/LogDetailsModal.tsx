"use client";

import {
  Modal,
  Stack,
  Paper,
  Grid,
  Text,
  Group,
  Badge,
  Button,
  Box,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconUser,
  IconWorld,
  IconDeviceDesktop,
} from "@tabler/icons-react";
import { formatDate } from "@/utils/format";
import { type ActivityLogEntry } from "@/utils/types";
import { LogDescription } from "./ActivityLogCells";

type LogDetailsModalProps = {
  opened: boolean;
  onClose: () => void;
  selectedLog: ActivityLogEntry | null;
};

const LogDetailsModal = ({
  opened,
  onClose,
  selectedLog,
}: LogDetailsModalProps) => {
  if (!selectedLog) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <Group gap="xs">
          <IconInfoCircle
            size={20}
            color="var(--mantine-color-indigo-6)"
            aria-hidden="true"
          />
          <Text fw={700} c="dark.7">
            Activity Details
          </Text>
        </Group>
      }
      size="lg"
      radius="lg"
      overlayProps={{
        backgroundOpacity: 0.55,
        blur: 3,
      }}
      transitionProps={{ transition: "pop", duration: 200 }}
    >
      <Stack gap="md">
        <Paper withBorder p="md" radius="md" bg="gray.0">
          <Grid gutter="md">
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Entity / Action
                </Text>
                <Group gap="xs">
                  <Badge variant="filled" color="indigo" radius="sm">
                    {selectedLog.activity_entity_type?.replace(/_/g, " ")}
                  </Badge>
                  <Badge variant="filled" color="indigo" radius="sm">
                    {selectedLog.activity_action
                      .replace(/_/g, " ")
                      .toUpperCase()}
                  </Badge>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Timestamp
                </Text>
                <Text size="sm" fw={500} c="dark.7">
                  {formatDate(selectedLog.activity_created_at)}
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Actor
                </Text>
                <Group gap="xs">
                  <IconUser size={14} aria-hidden="true" />
                  <Text size="sm" fw={500} c="dark.7">
                    {selectedLog.actor_email}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  IP Address
                </Text>
                <Group gap="xs">
                  <IconWorld size={14} aria-hidden="true" />
                  <Text size="sm" fw={500} c="dark.7">
                    {selectedLog.activity_ip_address || "N/A"}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={12}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  User Agent
                </Text>
                <Group gap="xs" align="flex-start" wrap="nowrap">
                  <IconDeviceDesktop size={14} aria-hidden="true" />
                  <Text
                    size="sm"
                    fw={500}
                    c="dark.7"
                    style={{ wordBreak: "break-word" }}
                  >
                    {selectedLog.activity_user_agent || "N/A"}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>

        <Box>
          <Text size="sm" fw={700} mb={8} c="dark.7">
            Parsed Details
          </Text>
          <LogDescription log={selectedLog} />
        </Box>

        <Button
          variant="light"
          color="gray"
          onClick={onClose}
          fullWidth
          mt="sm"
        >
          Close View
        </Button>
      </Stack>
    </Modal>
  );
};

export default LogDetailsModal;
