"use client";

import "mantine-datatable/styles.layer.css";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Paper,
  Stack,
  Text,
  TextInput,
  Tooltip,
  Title,
} from "@mantine/core";
import { type DataTableColumn } from "mantine-datatable";
import {
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { AdminTable } from "@/components/common/AdminTable";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { formatDate } from "@/utils/format";
import { normalizeCidr } from "@/lib/ip-utils";
import type {
  AdminIpWhitelistEntry,
  AdminIpWhitelistListResponse,
} from "@/utils/types";

type FormMode = "create" | "edit";

export default function IpWhitelist() {
  const [entries, setEntries] = useState<AdminIpWhitelistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentIp, setCurrentIp] = useState<string | null>(null);
  const [currentMatchIds, setCurrentMatchIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState(false);
  const [formIpCidr, setFormIpCidr] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<AdminIpWhitelistEntry | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(API_ENDPOINTS.admin.ipWhitelist, {
        cache: "no-store",
      });
      const json = (await res.json()) as AdminIpWhitelistListResponse & {
        error?: string;
      };

      if (!res.ok) {
        setLoadError(json.error ?? "Failed to load whitelist.");
        return;
      }

      setEntries(json.entries ?? []);
      setCurrentIp(json.current_ip ?? null);
      setCurrentMatchIds(json.current_match_ids ?? []);
      setPage(1);
    } catch {
      setLoadError("Failed to load whitelist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  const openCreate = () => {
    setFormMode("create");
    setEditId(null);
    setFormIpCidr("");
    setFormDescription("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEdit = (entry: AdminIpWhitelistEntry) => {
    setFormMode("edit");
    setEditId(entry.admin_ip_whitelist_id);
    setFormIpCidr(entry.ip_cidr);
    setFormDescription(entry.description ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const openDelete = (entry: AdminIpWhitelistEntry) => {
    setDeleteTarget(entry);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  const isCurrentIpEntry = useCallback(
    (entryId: string) => currentMatchIds.includes(entryId),
    [currentMatchIds],
  );

  const handleFormSubmit = async () => {
    setFormError(null);
    setSuccess(null);

    let normalized: string;
    try {
      normalized = normalizeCidr(formIpCidr);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid IP or CIDR.";
      setFormError(message);
      return;
    }

    setFormSubmitting(true);
    try {
      const endpoint =
        formMode === "create"
          ? API_ENDPOINTS.admin.ipWhitelist
          : API_ENDPOINTS.admin.ipWhitelistEntry(editId ?? "");
      const method = formMode === "create" ? "POST" : "PUT";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip_cidr: normalized,
          description: formDescription.trim() || null,
        }),
      });
      const json = (await res.json()) as { error?: string };

      if (!res.ok) {
        setFormError(json.error ?? "Failed to save entry.");
        return;
      }

      setSuccess(
        formMode === "create"
          ? "Whitelist entry added."
          : "Whitelist entry updated.",
      );
      setFormOpen(false);
      await loadEntries();
    } catch {
      setFormError("Failed to save entry.");
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    setSuccess(null);
    setDeleteSubmitting(true);
    try {
      const res = await fetch(
        API_ENDPOINTS.admin.ipWhitelistEntry(
          deleteTarget.admin_ip_whitelist_id,
        ),
        {
          method: "DELETE",
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setDeleteError(json.error ?? "Failed to delete entry.");
        return;
      }
      setSuccess("Whitelist entry removed.");
      setDeleteOpen(false);
      await loadEntries();
    } catch {
      setDeleteError("Failed to delete entry.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const pagedEntries = useMemo(() => {
    const start = (page - 1) * pageSize;
    return entries.slice(start, start + pageSize);
  }, [entries, page, pageSize]);

  const columns: DataTableColumn<AdminIpWhitelistEntry>[] = useMemo(
    () => [
      {
        accessor: "ip_cidr",
        title: "IP / CIDR",
        width: 220,
        render: (entry) => (
          <Group gap="xs" wrap="nowrap">
            <Text fw={600}>{entry.ip_cidr}</Text>
            {isCurrentIpEntry(entry.admin_ip_whitelist_id) && (
              <Badge size="sm" color="green" variant="filled">
                Current IP
              </Badge>
            )}
          </Group>
        ),
      },
      {
        accessor: "description",
        title: "Description",
        render: (entry) => (
          <Text size="sm" c="dimmed">
            {entry.description || "—"}
          </Text>
        ),
      },
      {
        accessor: "created_at",
        title: "Created",
        width: 160,
        render: (entry) => formatDate(entry.created_at),
      },
      {
        accessor: "created_by",
        title: "Created By",
        width: 200,
        render: (entry) => (
          <Text size="sm">
            {entry.created_by_name ??
              (entry.created_by
                ? `${entry.created_by.slice(0, 8)}…`
                : "System")}
          </Text>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        width: 120,
        textAlign: "right" as const,
        render: (entry) => (
          <Group gap="xs" justify="flex-end" wrap="nowrap">
            <Tooltip label="Edit entry">
              <ActionIcon
                variant="subtle"
                color="blue.8"
                onClick={() => openEdit(entry)}
                aria-label={`Edit ${entry.ip_cidr}`}
              >
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Delete entry">
              <ActionIcon
                variant="subtle"
                color="red.8"
                onClick={() => openDelete(entry)}
                aria-label={`Delete ${entry.ip_cidr}`}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ),
      },
    ],
    [isCurrentIpEntry],
  );

  return (
    <Stack align="center" gap="lg" w="100%">
      {loadError && (
        <Alert
          variant="light"
          color="red"
          title="Error"
          withCloseButton
          onClose={() => setLoadError(null)}
          w="100%"
        >
          {loadError}
        </Alert>
      )}
      {success && (
        <Alert
          variant="light"
          color="green"
          title="Success"
          icon={<IconCheck size={16} />}
          withCloseButton
          onClose={() => setSuccess(null)}
          w="100%"
        >
          {success}
        </Alert>
      )}

      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
        <Group justify="space-between" mb="md" gap="xs" wrap="wrap">
          <Stack gap={2}>
            <Title order={3}>Allowed IPs</Title>
            <Text size="sm" c="dimmed">
              {currentIp
                ? `Your current IP: ${currentIp}`
                : "Current IP unavailable."}
            </Text>
          </Stack>
          <Group gap="sm">
            <Button
              leftSection={<IconPlus size={16} />}
              color="blue"
              onClick={openCreate}
            >
              Add IP
            </Button>
            <Button
              variant="filled"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void loadEntries()}
              color="#1e3a8a"
              loading={loading}
            >
              Refresh
            </Button>
          </Group>
        </Group>

        <Box
          style={{
            contentVisibility: "auto",
            containIntrinsicSize: "400px",
          }}
        >
          <AdminTable<AdminIpWhitelistEntry>
            idAccessor="admin_ip_whitelist_id"
            records={pagedEntries}
            fetching={loading}
            totalRecords={entries.length}
            recordsPerPage={pageSize}
            page={page}
            onPageChange={setPage}
            recordsPerPageOptions={[10, 20, 50]}
            onRecordsPerPageChange={setPageSize}
            columns={columns}
            noRecordsText="No whitelisted IPs yet"
          />
        </Box>
      </Paper>

      <Modal
        opened={formOpen}
        onClose={() => setFormOpen(false)}
        title={formMode === "create" ? "Add IP" : "Edit IP"}
        centered
        size="md"
        closeOnClickOutside={!formSubmitting}
        closeOnEscape={!formSubmitting}
        withCloseButton={!formSubmitting}
      >
        <Stack gap="md">
          {formError && (
            <Alert
              variant="light"
              color="red"
              title="Error"
              withCloseButton
              onClose={() => setFormError(null)}
            >
              {formError}
            </Alert>
          )}

          <TextInput
            label="IP address or CIDR"
            placeholder="203.0.113.10 or 203.0.113.0/24"
            value={formIpCidr}
            onChange={(e) => setFormIpCidr(e.currentTarget.value)}
            required
          />
          <TextInput
            label="Description (optional)"
            placeholder="Office network"
            value={formDescription}
            onChange={(e) => setFormDescription(e.currentTarget.value)}
          />

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setFormOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              color="blue"
              onClick={handleFormSubmit}
              loading={formSubmitting}
            >
              {formMode === "create" ? "Add IP" : "Save Changes"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete IP"
        centered
        size="md"
        closeOnClickOutside={!deleteSubmitting}
        closeOnEscape={!deleteSubmitting}
        withCloseButton={!deleteSubmitting}
      >
        <Stack gap="md">
          {deleteError && (
            <Alert variant="light" color="red" title="Error">
              {deleteError}
            </Alert>
          )}

          <Text>
            Remove <b>{deleteTarget?.ip_cidr ?? "this entry"}</b> from the
            whitelist?
          </Text>
          {deleteTarget &&
            isCurrentIpEntry(deleteTarget.admin_ip_whitelist_id) && (
              <Alert variant="light" color="yellow" title="Current IP">
                This entry matches your current IP. Deleting it may lock you
                out.
              </Alert>
            )}

          <Group justify="flex-end">
            <Button
              variant="default"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={deleteSubmitting}
              disabled={
                !!(
                  deleteTarget &&
                  isCurrentIpEntry(deleteTarget.admin_ip_whitelist_id)
                )
              }
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
