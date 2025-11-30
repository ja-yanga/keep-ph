"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "@mantine/core";
import {
  IconFileText,
  IconDownload,
  IconEye,
  IconDatabase,
  IconCalendar,
  IconRefresh,
} from "@tabler/icons-react";

interface Scan {
  id: string;
  file_name: string;
  file_url: string;
  file_size_mb: number;
  uploaded_at: string;
  package?: {
    tracking_number: string;
  };
}

interface StorageUsage {
  used_mb: number;
  limit_mb: number;
  percentage: number;
}

interface UserScansProps {
  registrationId: string;
}

export default function UserScans({ registrationId }: UserScansProps) {
  const [scans, setScans] = useState<Scan[]>([]);
  const [usage, setUsage] = useState<StorageUsage>({
    used_mb: 0,
    limit_mb: 0,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);

  const fetchScans = useCallback(async () => {
    if (!registrationId) return;

    try {
      setLoading(true);
      const res = await fetch(
        `/api/user/scans?registrationId=${registrationId}`,
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setScans(data.scans);
        setUsage(data.usage);
      } else {
        console.error("API Error:", await res.text());
      }
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handlePreview = (scan: Scan) => {
    setSelectedScan(scan);
    setPreviewModalOpen(true);
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
            <Tooltip label="Refresh Files">
              <ActionIcon variant="subtle" color="gray" onClick={fetchScans}>
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Badge variant="light" size="lg" color="violet">
              {scans.length} Files
            </Badge>
          </Group>
        </Group>

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
                {scans.length > 0 ? (
                  scans.map((scan) => (
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
                            {scan.package.tracking_number || "No Tracking"}
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
                        <Text c="dimmed">No scanned documents found</Text>
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
        onClose={() => setPreviewModalOpen(false)}
        title={selectedScan?.file_name || "Document Preview"}
        size="xl"
        centered
      >
        {selectedScan && (
          <iframe
            src={selectedScan.file_url}
            style={{ width: "100%", height: "70vh", border: "none" }}
            title="PDF Preview"
          />
        )}
      </Modal>
    </>
  );
}
