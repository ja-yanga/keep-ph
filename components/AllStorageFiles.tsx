"use client";

import React, { useState, useEffect, useMemo, ElementType } from "react";
import Image from "next/image";
import { useMediaQuery } from "@mantine/hooks";
import useSWR, { mutate as swrMutate } from "swr";
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
  Modal,
  Loader,
  Center,
  Box,
  Avatar,
  Button,
  rem,
  ThemeIcon,
  TextInput,
  UnstyledButton,
  Divider,
  Pagination, // Added Pagination
} from "@mantine/core";
import {
  IconFileText,
  IconDownload,
  IconEye,
  IconDatabase,
  IconCalendar,
  IconRefresh,
  IconSearch,
  IconArrowUp,
  IconArrowDown,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconTrash,
  IconScale,
} from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react";
import { useSession } from "@/components/SessionProvider";

// --- Configuration ---
const ITEMS_PER_PAGE = 10;

// --- Interfaces ---
type Scan = {
  id: string;
  file_name: string;
  file_url: string;
  file_size_mb: number;
  uploaded_at: string;
  package?: {
    package_name?: string;
    id?: string;
  };
  package_id?: string;
  mime_type?: string;
};

// --- Custom Sort Control Component ---
type SortControlProps = {
  label: string;
  sortKey: "uploaded_at" | "file_name" | "file_size_mb";
  currentSort: "uploaded_at" | "file_name" | "file_size_mb";
  currentDir: "asc" | "desc";
  onClick: (key: "uploaded_at" | "file_name" | "file_size_mb") => void;
};

const SortControl: React.FC<SortControlProps> = ({
  label,
  sortKey,
  currentSort,
  currentDir,
  onClick,
}) => {
  const isSorted = currentSort === sortKey;
  const isAsc = currentDir === "asc";

  const SortIcon = useMemo<ElementType<IconProps> | undefined>(() => {
    if (!isSorted) return undefined;
    if (sortKey === "file_name") {
      return isAsc ? IconSortAscendingLetters : IconSortDescendingLetters;
    }
    return isAsc ? IconArrowUp : IconArrowDown;
  }, [isSorted, isAsc, sortKey]);

  return (
    <UnstyledButton
      onClick={() => onClick(sortKey)}
      style={{ display: "flex", alignItems: "center", fontWeight: 600 }}
    >
      <Group gap={4} wrap="nowrap">
        <Text fw={isSorted ? 700 : 600} size="sm">
          {label}
        </Text>
        {SortIcon && (
          <ThemeIcon size="sm" variant="transparent" color="blue">
            <SortIcon style={{ width: rem(14), height: rem(14) }} />
          </ThemeIcon>
        )}
      </Group>
    </UnstyledButton>
  );
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch");
  }
  const json = await res.json().catch(() => ({}));
  const scansArr = json?.scans ?? json?.data ?? json ?? [];
  return Array.isArray(scansArr) ? scansArr : [];
};

export default function AllUserScans() {
  const { session } = useSession();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Pagination State
  const [activePage, setActivePage] = useState(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{
    id: string;
    name?: string;
  } | null>(null);

  const swrKey = session?.user?.id ? "/api/user/storage" : null;
  const {
    data: apiScans,
    error: swrError,
    isValidating,
  } = useSWR<Scan[] | undefined>(swrKey, fetcher, { revalidateOnFocus: true });

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "uploaded_at" | "file_name" | "file_size_mb"
  >("uploaded_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setLoading(Boolean(isValidating && scans.length === 0));
    if (Array.isArray(apiScans)) setScans(apiScans);
    if (swrError) {
      console.error("scans fetch error:", swrError);
      setScans([]);
    }
  }, [apiScans, swrError, isValidating, scans.length]);

  // Reset to Page 1 when searching or sorting
  useEffect(() => {
    setActivePage(1);
  }, [search, sortBy, sortDir]);

  const handlePreview = (scan: Scan) => {
    setSelected(scan);
    setPreviewOpen(true);
  };

  const handleRefresh = async () => {
    if (!swrKey) return;
    setRefreshing(true);
    try {
      await swrMutate(swrKey);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSortClick = (
    key: "uploaded_at" | "file_name" | "file_size_mb",
  ) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  };

  const handleDelete = (scan?: Scan) => {
    if (!scan?.id) return;
    setToDelete({ id: scan.id, name: scan.file_name });
    setConfirmOpen(true);
  };

  const performDelete = async () => {
    if (!toDelete?.id) return;
    const scanId = toDelete.id;
    const url = `/api/user/storage/${encodeURIComponent(scanId)}`;
    setConfirmOpen(false);
    try {
      setDeletingId(scanId);
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (!res.ok) throw new Error("Delete failed");

      setScans((prev) => prev.filter((s) => s.id !== scanId));
      if (swrKey) {
        swrMutate(
          swrKey,
          (current: Scan[] = []) => current.filter((s) => s.id !== scanId),
          false,
        );
      }
    } catch (e: unknown) {
      console.error("delete failed", e);
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  };

  const formatFileSize = (mb: number) =>
    mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;

  // --- Filtering & Sorting Logic ---
  const displayedScans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = scans.slice();

    if (q) {
      list = list.filter((s) => {
        const name = (s.file_name || "").toLowerCase();
        const pkgName = (s.package?.package_name || "").toLowerCase();
        const pkgId = (s.package_id || "").toLowerCase();
        return name.includes(q) || pkgName.includes(q) || pkgId.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === "file_name") {
        return sortDir === "asc"
          ? a.file_name.localeCompare(b.file_name)
          : b.file_name.localeCompare(a.file_name);
      }
      if (sortBy === "file_size_mb") {
        return sortDir === "asc"
          ? a.file_size_mb - b.file_size_mb
          : b.file_size_mb - a.file_size_mb;
      }
      const A = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const B = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      return sortDir === "asc" ? A - B : B - A;
    });

    return list;
  }, [scans, search, sortBy, sortDir]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(displayedScans.length / ITEMS_PER_PAGE);
  const paginatedScans = useMemo(() => {
    const start = (activePage - 1) * ITEMS_PER_PAGE;
    return displayedScans.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedScans, activePage]);

  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- RENDERING MAIN CONTENT ---
  let mainContent: React.ReactNode;
  if (loading) {
    mainContent = (
      <Center py="xl" h={200}>
        <Loader size="sm" />
      </Center>
    );
  } else if (isMobile) {
    mainContent = (
      <Stack gap="md">
        {paginatedScans.length > 0 ? (
          paginatedScans.map((s) => (
            <Paper key={s.id} p="md" radius="md" withBorder shadow="xs">
              <Stack gap="xs">
                <Group wrap="nowrap" align="flex-start" gap="sm">
                  <Avatar size={42} radius="md" color="blue" variant="light">
                    <IconFileText size={20} />
                  </Avatar>
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      fw={700}
                      size="sm"
                      style={{ wordBreak: "break-word", lineHeight: 1.2 }}
                    >
                      {s.file_name}
                    </Text>
                    <Text size="xs" c="dimmed" mt={2}>
                      {s.package?.package_name ||
                        (s.package_id
                          ? `PKG-${s.package_id.slice(0, 8)}`
                          : "No Package")}
                    </Text>
                  </Box>
                </Group>
                <Group justify="space-between" mt={4}>
                  <Group gap={4}>
                    <IconScale size={14} color="gray" />
                    <Text size="xs" fw={500}>
                      {formatFileSize(Number(s.file_size_mb ?? 0))}
                    </Text>
                  </Group>
                  <Group gap={4}>
                    <IconCalendar size={14} color="gray" />
                    <Text size="xs" c="dimmed">
                      {s.uploaded_at
                        ? new Date(s.uploaded_at).toLocaleDateString()
                        : "—"}
                    </Text>
                  </Group>
                </Group>
                <Divider variant="dashed" my={4} />
                <Group gap="xs" grow>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconEye size={14} />}
                    onClick={() => handlePreview(s)}
                  >
                    View
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    color="green"
                    component="a"
                    href={s.file_url}
                    download={s.file_name}
                    leftSection={<IconDownload size={14} />}
                  >
                    Get
                  </Button>
                  <ActionIcon
                    size="lg"
                    color="red"
                    variant="light"
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Stack>
            </Paper>
          ))
        ) : (
          <Center py="xl">
            <Text c="dimmed">No files match your criteria.</Text>
          </Center>
        )}
      </Stack>
    );
  } else {
    mainContent = (
      <Table
        stickyHeader
        striped
        highlightOnHover
        withTableBorder
        verticalSpacing="sm"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th style={{ minWidth: rem(300) }}>
              <SortControl
                label="File"
                sortKey="file_name"
                currentSort={sortBy}
                currentDir={sortDir}
                onClick={handleSortClick}
              />
            </Table.Th>
            <Table.Th style={{ minWidth: rem(150) }}>Package / Source</Table.Th>
            <Table.Th>
              <SortControl
                label="Size"
                sortKey="file_size_mb"
                currentSort={sortBy}
                currentDir={sortDir}
                onClick={handleSortClick}
              />
            </Table.Th>
            <Table.Th style={{ minWidth: rem(180) }}>
              <SortControl
                label="Uploaded"
                sortKey="uploaded_at"
                currentSort={sortBy}
                currentDir={sortDir}
                onClick={handleSortClick}
              />
            </Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {paginatedScans.map((s) => (
            <Table.Tr key={s.id}>
              <Table.Td>
                <Group gap="sm" wrap="nowrap">
                  <Avatar size={36} radius="sm" color="blue" variant="light">
                    <IconFileText size={18} />
                  </Avatar>
                  <Box style={{ maxWidth: rem(250) }}>
                    <Text fw={600} size="sm" truncate>
                      {s.file_name}
                    </Text>
                  </Box>
                </Group>
              </Table.Td>
              <Table.Td>
                {s.package?.package_name ? (
                  <Badge variant="outline" color="gray" size="sm">
                    {s.package.package_name}
                  </Badge>
                ) : (
                  <Text size="sm" c="dimmed">
                    —
                  </Text>
                )}
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {formatFileSize(Number(s.file_size_mb ?? 0))}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">
                  {s.uploaded_at
                    ? new Date(s.uploaded_at).toLocaleDateString()
                    : "—"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap="xs" wrap="nowrap">
                  <ActionIcon
                    variant="light"
                    color="blue"
                    onClick={() => handlePreview(s)}
                  >
                    <IconEye size={18} />
                  </ActionIcon>
                  <ActionIcon
                    component="a"
                    href={s.file_url}
                    download={s.file_name}
                    variant="light"
                    color="green"
                  >
                    <IconDownload size={18} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="light"
                    onClick={() => handleDelete(s)}
                    disabled={deletingId === s.id}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {paginatedScans.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Center py={40}>
                  <Text c="dimmed">No files found.</Text>
                </Center>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    );
  }

  return (
    <Box p={isMobile ? "xs" : "md"} bg="gray.0" style={{ minHeight: "100dvh" }}>
      <Paper p={isMobile ? "sm" : "lg"} radius="md" withBorder shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon
                variant="light"
                color="blue"
                size={isMobile ? "lg" : "xl"}
              >
                <IconDatabase size={isMobile ? 20 : 24} />
              </ThemeIcon>
              <Title order={isMobile ? 4 : 3}>Storage</Title>
            </Group>
            <Group gap={8}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={handleRefresh}
                loading={refreshing}
              >
                <IconRefresh size={18} />
              </ActionIcon>
              <Badge variant="light" color="violet" size="md">
                {scans.length} Total
              </Badge>
            </Group>
          </Group>

          <TextInput
            placeholder="Search files..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="sm"
          />

          <ScrollArea
            h={isMobile ? "calc(100vh - 300px)" : 550}
            offsetScrollbars
          >
            {mainContent}
          </ScrollArea>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <Group justify="center" mt="md" pb="sm">
              <Pagination
                total={totalPages}
                value={activePage}
                onChange={setActivePage}
                size={isMobile ? "sm" : "md"}
                radius="md"
                withEdges={!isMobile}
              />
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Preview Modal */}
      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={selected?.file_name ?? "Preview"}
        size="xl"
        centered
        fullScreen={isMobile}
      >
        {selected ? (
          <Box>
            {selected.mime_type?.startsWith("image") ||
            /\.(jpe?g|png|gif|webp)$/i.test(selected.file_url) ? (
              <Box
                pos="relative"
                w="100%"
                h={{ base: "60vh", sm: "70vh" }}
                style={{ overflow: "hidden", borderRadius: rem(8) }}
              >
                <Image
                  src={selected.file_url}
                  alt={selected.file_name}
                  fill
                  unoptimized
                  style={{ objectFit: "contain" }}
                  priority
                />
              </Box>
            ) : (
              <Box w="100%" h={isMobile ? "80vh" : "70vh"}>
                <iframe
                  src={selected.file_url}
                  title={selected.file_name}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: rem(8),
                  }}
                />
              </Box>
            )}
          </Box>
        ) : (
          <Center h={200}>
            <Text c="dimmed">No file selected</Text>
          </Center>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        opened={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Delete"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm">
            Permanently delete{" "}
            <Text component="span" fw={700}>
              {toDelete?.name}
            </Text>
            ?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => void performDelete()}
              loading={!!deletingId}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
