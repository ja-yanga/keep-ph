"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Badge,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Table,
  Text,
  Title,
  ActionIcon,
  Tooltip,
  Modal,
  Loader,
  Center,
  Progress,
  Box,
  TextInput,
  Button,
} from "@mantine/core";
import {
  IconFileText,
  IconDownload,
  IconEye,
  IconDatabase,
  IconCalendar,
  IconRefresh,
  IconTrash,
  IconSearch,
} from "@tabler/icons-react";

interface Scan {
  id: string;
  file_name: string;
  file_url: string;
  file_size_mb: number;
  uploaded_at: string;
  package?: {
    package_name: string;
  };
}

interface StorageUsage {
  used_mb: number;
  limit_mb: number;
  percentage: number;
}

interface UserScansProps {
  registrationId: string;
  scans?: Scan[];
  usage?: StorageUsage | null;
}

export default function UserScans({
  registrationId,
  scans: providedScans,
  usage: providedUsage,
}: UserScansProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [search, setSearch] = useState("");
  const [usage, setUsage] = useState<StorageUsage>({
    used_mb: 0,
    limit_mb: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchScans = useCallback(async () => {
    if (providedScans) {
      setScans(providedScans);
      setUsage(providedUsage ?? { used_mb: 0, limit_mb: 0, percentage: 0 });
      setLoading(false);
      return;
    }
    if (!registrationId) return;
    try {
      setLoading(true);
      const res = await fetch(
        `/api/user/scans?registrationId=${encodeURIComponent(registrationId)}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans ?? []);
        setUsage(data.usage ?? { used_mb: 0, limit_mb: 0, percentage: 0 });
      } else {
        console.error("API Error:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  }, [registrationId, providedScans, providedUsage]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  // filtered scans by search (file name or package_name)
  const filteredScans = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return scans;
    return scans.filter((s) => {
      const fileName = (s.file_name || "").toLowerCase();
      const pkgName = (s.package?.package_name || "").toLowerCase();
      return fileName.includes(q) || pkgName.includes(q);
    });
  }, [scans, search]);

  const handlePreview = (scan: Scan) => {
    setSelectedScan(scan);
    setPreviewModalOpen(true);
  };

  const handleDelete = async (scanId?: string) => {
    if (!scanId) {
      alert("Invalid file id");
      return;
    }

    if (!confirm("Delete this file permanently?")) return;

    const url = `/api/user/storage/${encodeURIComponent(scanId)}`;
    try {
      setDeletingId(scanId);
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Delete failed (${res.status})`);
      }

      // optimistic update
      setScans((prev) => prev.filter((s) => s.id !== scanId));
    } catch (e: any) {
      console.error("Failed to delete scan:", e);
      alert(e.message || "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (mb: number) => {
    if (mb < 1) return `${(mb * 1024).toFixed(0)} KB`;
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <>
      <Paper p="lg" radius="md" withBorder shadow="sm">
        <Group justify="space-between" mb="md">
          <Group gap="xs">
            <IconDatabase size={20} color="gray" />
            <Title order={4}>Digital Storage</Title>
          </Group>
          <Group>
            <Badge variant="light" size="lg" color="violet">
              {scans.length} Files
            </Badge>
          </Group>
        </Group>

        {/* Search (same behavior as UserPackages) */}
        <Box mb="md">
          <TextInput
            placeholder="Search by file name or package name..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
            size="md"
            __clearable
          />
        </Box>

        {/* Storage Usage Bar */}
        <Box mb="lg">
          <Group justify="space-between" mb={5}>
            <Text size="xs" fw={500} c="dimmed">
              Storage Usage
            </Text>
            <Text size="xs" fw={500}>
              {usage.used_mb.toFixed(2)} MB / {usage.limit_mb} MB
            </Text>
          </Group>
          <Progress
            value={usage.percentage}
            size="md"
            radius="xl"
            color={
              usage.percentage > 90
                ? "red"
                : usage.percentage > 70
                ? "orange"
                : "blue"
            }
          />
        </Box>

        <ScrollArea style={{ maxHeight: 400 }}>
          {loading ? (
            <Center py="xl">
              <Loader size="sm" />
            </Center>
          ) : (
            <Table
              verticalSpacing="sm"
              striped
              highlightOnHover
              withTableBorder
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>File Name</Table.Th>
                  <Table.Th>Related Package</Table.Th>
                  <Table.Th>Size</Table.Th>
                  <Table.Th>Date Scanned</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredScans.length > 0 ? (
                  filteredScans.map((scan) => (
                    <Table.Tr key={scan.id}>
                      <Table.Td>
                        <Group gap="xs">
                          <IconFileText size={16} color="gray" />
                          <Text
                            size="sm"
                            fw={500}
                            style={{ maxWidth: 200 }}
                            truncate
                          >
                            {scan.file_name}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {scan.package ? (
                          <Badge variant="outline" color="gray" size="sm">
                            {scan.package.package_name || "No Package"}
                          </Badge>
                        ) : (
                          <Text size="sm" c="dimmed">
                            —
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {formatFileSize(scan.file_size_mb)}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          <IconCalendar size={14} color="gray" />
                          <Text size="sm">
                            {scan.uploaded_at
                              ? new Date(scan.uploaded_at).toLocaleDateString()
                              : "—"}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="Preview">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handlePreview(scan)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Download">
                            <ActionIcon
                              component="a"
                              href={scan.file_url}
                              download={scan.file_name}
                              target="_blank"
                              variant="light"
                              color="green"
                            >
                              <IconDownload size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDelete(scan.id)}
                              disabled={deletingId === scan.id}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Stack align="center" py="xl">
                        <IconFileText
                          size={40}
                          color="var(--mantine-color-gray-3)"
                        />
                        <Text c="dimmed">
                          {search
                            ? "No results found for your search."
                            : "No scanned documents found"}
                        </Text>
                      </Stack>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          )}
        </ScrollArea>
      </Paper>

      {/* PDF Preview Modal */}
      <Modal
        opened={previewModalOpen}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedScan(null);
        }}
        title={selectedScan?.file_name || "Document Preview"}
        size="xl"
        centered
      >
        {selectedScan && /\.pdf(\?.*)?$/i.test(selectedScan.file_url) ? (
          <iframe
            src={selectedScan.file_url}
            style={{ width: "100%", height: "70vh", border: "none" }}
            title="PDF Preview"
          />
        ) : selectedScan ? (
          <img
            src={selectedScan.file_url}
            alt={selectedScan.file_name}
            style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
          />
        ) : (
          <Text c="dimmed">No preview available</Text>
        )}
      </Modal>
    </>
  );
}
