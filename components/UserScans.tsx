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
  Button, // Changed from Pagination
} from "@mantine/core";
import {
  IconFileText,
  IconDownload,
  IconEye,
  IconDatabase,
  IconCalendar,
  IconTrash,
  IconSearch,
} from "@tabler/icons-react";

type Scan = {
  id: string;
  file_name: string;
  file_url: string;
  file_size_mb: number;
  uploaded_at: string;
  package?: {
    package_name: string;
  };
};

type StorageUsage = {
  used_mb: number;
  limit_mb: number;
  percentage: number;
};

type UserScansProps = {
  registrationId?: string;
  scans?: Scan[];
  usage?: StorageUsage | null;
};

const ITEMS_PER_PAGE = 5;

// --- helpers reused in normalize / filter ---
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null;

const normalizeScan = (s: unknown): Scan => {
  const r = isRecord(s) ? s : {};
  const id = String(
    r.mailroom_file_id ??
      r.mailroomFileId ??
      r.id ??
      `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
  );

  const file_name =
    (r.mailroom_file_name as string) ||
    (r.mailroomFileName as string) ||
    (r.file_name as string) ||
    "";

  const file_url =
    (r.mailroom_file_url as string) ||
    (r.mailroomFileUrl as string) ||
    (r.file_url as string) ||
    "";

  const file_size_mb =
    Number(r.mailroom_file_size_mb ?? r.mailroomFileSizeMb ?? r.file_size_mb) ||
    0;

  const uploaded_at =
    (r.mailroom_file_uploaded_at as string) ||
    (r.mailroomFileUploadedAt as string) ||
    (r.uploaded_at as string) ||
    "";

  let pkg: { package_name: string } | undefined;
  const mb = (r as Record<string, unknown>).mailbox_item_table;
  if (isRecord(mb)) {
    const mailboxName =
      (mb.mailbox_item_name as string) ||
      (mb.mailbox_item_title as string) ||
      (mb.name as string);
    if (mailboxName) pkg = { package_name: mailboxName };
  } else if (Array.isArray(mb) && mb.length > 0 && isRecord(mb[0])) {
    const mailboxName =
      (mb[0].mailbox_item_name as string) ||
      (mb[0].mailbox_item_title as string) ||
      (mb[0].name as string);
    if (mailboxName) pkg = { package_name: mailboxName };
  } else {
    const topPkg =
      (r.package_name as string) || (r.mailbox_item_name as string) || null;
    if (topPkg) pkg = { package_name: topPkg };
  }

  return { id, file_name, file_url, file_size_mb, uploaded_at, package: pkg };
};

const derivePackageName = (s: unknown): string | null => {
  if (!isRecord(s)) return null;
  const tryString = (v: unknown): string | null =>
    typeof v === "string" && v.trim().length > 0 ? v : null;

  const pkgObj = s.package as Record<string, unknown> | undefined;
  const candidateFromPkg = tryString(pkgObj?.package_name);
  if (candidateFromPkg) return candidateFromPkg;

  const mb = (s as Record<string, unknown>).mailbox_item_table;
  if (isRecord(mb)) {
    return (
      tryString(mb.mailbox_item_name) ??
      tryString(mb.mailbox_item_title) ??
      tryString(mb.name) ??
      null
    );
  }
  if (Array.isArray(mb) && mb.length > 0 && isRecord(mb[0])) {
    return (
      tryString(mb[0].mailbox_item_name) ??
      tryString(mb[0].mailbox_item_title) ??
      tryString(mb[0].name) ??
      null
    );
  }

  return (
    tryString((s as Record<string, unknown>).package_name) ??
    tryString((s as Record<string, unknown>).mailbox_item_name) ??
    null
  );
};

// --- component ---
export default function UserScans({
  registrationId,
  scans: providedScans,
  usage: providedUsage,
}: UserScansProps) {
  const [scans, setScans] = useState<Scan[]>(
    Array.isArray(providedScans)
      ? (providedScans as unknown[]).map((p) => normalizeScan(p))
      : [],
  );
  const [search, setSearch] = useState("");
  const [usage, setUsage] = useState<StorageUsage>(
    providedUsage ?? { used_mb: 0, limit_mb: 0, percentage: 0 },
  );
  const [loading, setLoading] = useState(true);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activePage, setPage] = useState(1);

  // Keep local state in sync if parent updates providedScans/usage
  useEffect(() => {
    if (Array.isArray(providedScans)) {
      setScans((providedScans as unknown[]).map((p) => normalizeScan(p)));
    }
    if (providedUsage) setUsage(providedUsage);
  }, [providedScans, providedUsage]);

  const fetchScans = useCallback(async () => {
    if (!registrationId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `/api/user/scans?registrationId=${encodeURIComponent(registrationId)}`,
        { credentials: "include" },
      );
      if (!res.ok) {
        console.error("API Error:", await res.text());
        return;
      }

      const data = await res.json();
      const remoteScans = Array.isArray(data.scans) ? data.scans : [];
      const normalized = (remoteScans as unknown[]).map((r) =>
        normalizeScan(r),
      );

      // merge with any existing (provided) scans, then dedupe by id
      const merged = [...scans, ...normalized];
      const deduped = Array.from(
        new Map(merged.map((s) => [s.id, s])).values(),
      );

      setScans(deduped);
      setUsage(data.usage ?? { used_mb: 0, limit_mb: 0, percentage: 0 });
    } catch (error) {
      console.error("Failed to fetch scans:", error);
    } finally {
      setLoading(false);
    }
  }, [registrationId, scans]);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const filteredScans = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return scans;
    return scans.filter((s) => {
      const fileName = (s.file_name || "").toLowerCase();
      const pkgName = (derivePackageName(s) || "").toLowerCase();
      return fileName.includes(q) || pkgName.includes(q);
    });
  }, [scans, search]);

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Pagination logic
  const total = filteredScans.length;
  // Calculate start index for current page
  const start = (activePage - 1) * ITEMS_PER_PAGE;
  // Slice scans for current page
  const paginatedScans = filteredScans.slice(start, start + ITEMS_PER_PAGE);

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

      // If page is now empty and not separate page 1, go back
      if (paginatedScans.length === 1 && activePage > 1) {
        setPage((curr) => curr - 1);
      }
    } catch (e: unknown) {
      console.error("Failed to delete scan:", e);
      const errorMessage =
        e instanceof Error ? e.message : "Failed to delete file";
      alert(errorMessage);
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

        {/* Search */}
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
            color={(() => {
              if (usage.percentage > 90) return "red";
              if (usage.percentage > 70) return "orange";
              return "blue";
            })()}
          />
        </Box>

        <ScrollArea>
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
              layout="fixed"
            >
              <Table.Thead>
                <Table.Tr>
                  <Table.Th w="35%">File Name</Table.Th>
                  <Table.Th w="25%">Related Package</Table.Th>
                  <Table.Th w="10%">Size</Table.Th>
                  <Table.Th w="15%">Date Scanned</Table.Th>
                  <Table.Th w="15%" style={{ textAlign: "right" }}>
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {paginatedScans.length > 0 ? (
                  paginatedScans.map((scan) => {
                    const pkgName = derivePackageName(scan);
                    return (
                      <Table.Tr key={scan.id}>
                        <Table.Td>
                          <Group gap="xs" wrap="nowrap">
                            <IconFileText
                              size={16}
                              color="gray"
                              style={{ flexShrink: 0 }}
                            />
                            <Tooltip
                              label={scan.file_name}
                              disabled={scan.file_name.length < 30}
                            >
                              <Text
                                size="sm"
                                fw={500}
                                truncate="end"
                                style={{
                                  width: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {scan.file_name}
                              </Text>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          {pkgName ? (
                            <Tooltip
                              label={pkgName}
                              disabled={pkgName.length < 20}
                            >
                              <Box style={{ width: "100%" }}>
                                <Badge
                                  variant="outline"
                                  color="gray"
                                  size="sm"
                                  style={{
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {pkgName}
                                </Badge>
                              </Box>
                            </Tooltip>
                          ) : (
                            <Text size="sm" c="dimmed">
                              —
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" truncate>
                            {formatFileSize(scan.file_size_mb)}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={4} wrap="nowrap">
                            <IconCalendar
                              size={14}
                              color="gray"
                              style={{ flexShrink: 0 }}
                            />
                            <Text size="sm" truncate>
                              {scan.uploaded_at
                                ? new Date(
                                    scan.uploaded_at,
                                  ).toLocaleDateString()
                                : "—"}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group
                            gap="xs"
                            wrap="nowrap"
                            style={{ justifyContent: "flex-end" }}
                          >
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
                    );
                  })
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
        {total > ITEMS_PER_PAGE && (
          <Group
            justify="space-between"
            mt="md"
            align="center"
            style={{ width: "100%" }}
          >
            <Text size="sm" c="dimmed">
              Showing {Math.min(start + 1, total)}–
              {Math.min(start + paginatedScans.length, total)} of {total}
            </Text>
            <Group>
              <Button
                size="xs"
                variant="outline"
                disabled={activePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="xs"
                variant="outline"
                disabled={start + ITEMS_PER_PAGE >= total}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </Group>
          </Group>
        )}
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
        {(() => {
          if (!selectedScan)
            return <Text c="dimmed">No preview available</Text>;
          if (/\.pdf(\?.*)?$/i.test(selectedScan.file_url)) {
            return (
              <iframe
                src={selectedScan.file_url}
                style={{ width: "100%", height: "70vh", border: "none" }}
                title="PDF Preview"
              />
            );
          }
          return (
            // eslint-disable-next-line @next/next/no-img-element -- Dynamic image URLs from storage, not suitable for Next.js Image optimization
            <img
              src={selectedScan.file_url}
              alt={selectedScan.file_name}
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          );
        })()}
      </Modal>
    </>
  );
}
