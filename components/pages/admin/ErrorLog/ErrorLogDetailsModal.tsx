"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Divider,
  Textarea,
  Switch,
  Collapse,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconWorld,
  IconDeviceDesktop,
  IconUser,
} from "@tabler/icons-react";
import { formatDate } from "@/utils/format";
import { getErrorCodeDisplay } from "./ErrorLogCells";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { fetchFromAPI } from "@/utils/fetcher";
import { type ErrorLogEntry } from "@/utils/types";

type ErrorLogDetailsModalProps = {
  opened: boolean;
  onClose: () => void;
  errorLogId: string | null;
  onUpdated?: () => void;
};

const formatJson = (value: unknown) =>
  value ? JSON.stringify(value, null, 2) : "N/A";

const normalizeNotes = (value: string | null | undefined) => {
  const trimmed = (value ?? "").trim();
  return trimmed.length > 0 ? (value ?? "") : "";
};

const ErrorLogDetailsModal = ({
  opened,
  onClose,
  errorLogId,
  onUpdated,
}: ErrorLogDetailsModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorLog, setErrorLog] = useState<ErrorLogEntry | null>(null);
  const [resolved, setResolved] = useState(false);
  const [notes, setNotes] = useState("");
  const [stackOpen, setStackOpen] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (!errorLogId) return;
    setLoading(true);
    try {
      const result = await fetchFromAPI<ErrorLogEntry>(
        API_ENDPOINTS.admin.errorLog(errorLogId),
      );
      setErrorLog(result);
      setResolved(Boolean(result.error_resolved));
      setNotes(result.error_resolution_notes ?? "");
    } catch (err) {
      console.error("Error fetching error log details:", err);
    } finally {
      setLoading(false);
    }
  }, [errorLogId]);

  useEffect(() => {
    if (opened) {
      void fetchDetails();
    }
  }, [opened, fetchDetails]);

  useEffect(() => {
    if (!opened) {
      setErrorLog(null);
      setResolved(false);
      setNotes("");
      setStackOpen(false);
    }
  }, [opened]);

  const isInitiallyResolved = errorLog?.error_resolved === true;
  const canEditNotes = !isInitiallyResolved || resolved === false;

  const notesChanged = useMemo(() => {
    if (!errorLog) return false;
    return (
      normalizeNotes(notes) !== normalizeNotes(errorLog.error_resolution_notes)
    );
  }, [notes, errorLog]);

  const resolvedChanged = useMemo(() => {
    if (!errorLog) return false;
    return resolved !== Boolean(errorLog.error_resolved);
  }, [resolved, errorLog]);

  const hasChanges = notesChanged || resolvedChanged;

  const handleSave = useCallback(async () => {
    if (!errorLog || !errorLogId || !hasChanges) return;

    if (resolvedChanged) {
      const confirmMessage = resolved
        ? "Mark this error as resolved?"
        : "Re-open this error log?";
      if (!window.confirm(confirmMessage)) return;
    }

    const payload: Record<string, unknown> = {};
    if (resolvedChanged) {
      payload.error_resolved = resolved;
    }
    if (notesChanged) {
      const trimmed = notes.trim();
      payload.error_resolution_notes = trimmed.length > 0 ? notes : null;
    }

    setSaving(true);
    try {
      await fetchFromAPI<{ ok: boolean }>(
        API_ENDPOINTS.admin.errorLog(errorLogId),
        {
          method: "PATCH",
          body: payload,
        },
      );
      await fetchDetails();
      onUpdated?.();
    } catch (err) {
      console.error("Error updating error log:", err);
    } finally {
      setSaving(false);
    }
  }, [
    errorLog,
    errorLogId,
    hasChanges,
    notesChanged,
    resolvedChanged,
    resolved,
    notes,
    fetchDetails,
    onUpdated,
  ]);

  if (!errorLogId) return null;

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      centered
      title={
        <Group gap="xs">
          <IconAlertTriangle
            size={20}
            color="var(--mantine-color-red-6)"
            aria-hidden="true"
          />
          <Text fw={700} c="dark.7">
            Error Log Details
          </Text>
        </Group>
      }
      size="xl"
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
                  Error Type / Code
                </Text>
                <Group gap="xs">
                  <Badge variant="filled" color="red" radius="sm">
                    {errorLog?.error_type?.replace(/_/g, " ")}
                  </Badge>
                  <Badge
                    variant="light"
                    color="gray"
                    radius="sm"
                    title={errorLog?.error_code ?? undefined}
                  >
                    {getErrorCodeDisplay(errorLog?.error_code)}
                  </Badge>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Created
                </Text>
                <Text size="sm" fw={500} c="dark.7">
                  {errorLog ? formatDate(errorLog.error_created_at) : "—"}
                </Text>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  User
                </Text>
                <Group gap="xs">
                  <IconUser size={14} aria-hidden="true" />
                  <Text size="sm" fw={500} c="dark.7">
                    {errorLog?.user_email || errorLog?.user_id || "N/A"}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
              <Stack gap={4}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Response Status
                </Text>
                <Text size="sm" fw={500} c="dark.7">
                  {errorLog?.response_status ?? "N/A"}
                </Text>
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
                    {errorLog?.ip_address || "N/A"}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={{ base: 12, sm: 6 }}>
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
                    {errorLog?.user_agent || "N/A"}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="xs">
            <Text size="sm" fw={700} c="dark.7">
              Error Message
            </Text>
            <Text size="sm" c="dark.7" style={{ whiteSpace: "pre-wrap" }}>
              {errorLog?.error_message || "N/A"}
            </Text>

            <Divider />

            <Group justify="space-between">
              <Text size="sm" fw={700} c="dark.7">
                Stack Trace
              </Text>
              <Button
                variant="subtle"
                size="xs"
                leftSection={
                  stackOpen ? (
                    <IconChevronDown size={14} />
                  ) : (
                    <IconChevronRight size={14} />
                  )
                }
                onClick={() => setStackOpen((prev) => !prev)}
              >
                {stackOpen ? "Hide" : "Show"}
              </Button>
            </Group>
            <Collapse in={stackOpen}>
              <Box
                component="pre"
                mt="xs"
                p="sm"
                style={{
                  backgroundColor: "var(--mantine-color-gray-0)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {errorLog?.error_stack || "N/A"}
              </Box>
            </Collapse>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text size="sm" fw={700} c="dark.7">
              Request Metadata
            </Text>
            <Grid gutter="sm">
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Request Path
                </Text>
                <Text size="sm" c="dark.7">
                  {errorLog?.request_path || "N/A"}
                </Text>
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6 }}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Request Method
                </Text>
                <Text size="sm" c="dark.7">
                  {errorLog?.request_method || "N/A"}
                </Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Request Headers
                </Text>
                <Box
                  component="pre"
                  mt={4}
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-0)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formatJson(errorLog?.request_headers)}
                </Box>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text size="xs" fw={700} c="gray.7" tt="uppercase">
                  Request Body
                </Text>
                <Box
                  component="pre"
                  mt={4}
                  p="sm"
                  style={{
                    backgroundColor: "var(--mantine-color-gray-0)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {formatJson(errorLog?.request_body)}
                </Box>
              </Grid.Col>
            </Grid>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Text size="sm" fw={700} c="dark.7">
              Error Details
            </Text>
            <Box
              component="pre"
              p="sm"
              style={{
                backgroundColor: "var(--mantine-color-gray-0)",
                borderRadius: "8px",
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {formatJson(errorLog?.error_details)}
            </Box>
          </Stack>
        </Paper>

        <Paper withBorder p="md" radius="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Text size="sm" fw={700} c="dark.7">
                Resolution
              </Text>
              <Switch
                checked={resolved}
                onChange={(event) => setResolved(event.currentTarget.checked)}
                label={resolved ? "Resolved" : "Unresolved"}
                color={resolved ? "green" : "red"}
              />
            </Group>

            {errorLog?.error_resolved && (
              <Text size="xs" c="gray.7">
                Resolved by {errorLog.resolved_by_email || "Unknown"} on{" "}
                {errorLog.error_resolved_at
                  ? formatDate(errorLog.error_resolved_at)
                  : "N/A"}
              </Text>
            )}

            <Textarea
              label="Resolution Notes"
              description="Add root cause, fix applied, or follow-up actions."
              placeholder="Add resolution notes..."
              minRows={4}
              value={notes}
              onChange={(event) => setNotes(event.currentTarget.value)}
              disabled={!canEditNotes}
            />
          </Stack>
        </Paper>

        <Group justify="space-between" gap="sm">
          <Button variant="light" color="gray" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="filled"
            color="#26316e"
            onClick={handleSave}
            loading={saving}
            disabled={loading || !hasChanges}
          >
            Save Updates
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default ErrorLogDetailsModal;
