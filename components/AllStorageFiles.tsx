"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  ElementType,
  useCallback,
  useTransition,
} from "react";
import Image from "next/image";
import { useMediaQuery, useDebouncedValue } from "@mantine/hooks";
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
  Pagination,
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

const SortControl: React.FC<SortControlProps> = React.memo(
  ({ label, sortKey, currentSort, currentDir, onClick }) => {
    const isSorted = currentSort === sortKey;
    const isAsc = currentDir === "asc";

    const SortIcon = useMemo<ElementType<IconProps> | undefined>(() => {
      if (!isSorted) return undefined;
      if (sortKey === "file_name") {
        return isAsc ? IconSortAscendingLetters : IconSortDescendingLetters;
      }
      return isAsc ? IconArrowUp : IconArrowDown;
    }, [isSorted, isAsc, sortKey]);

    let sortLabel = `Sort by ${label}`;
    if (isSorted) {
      sortLabel += isAsc ? " descending" : " ascending";
    }

    const handleClick = useCallback(() => onClick(sortKey), [onClick, sortKey]);

    return (
      <UnstyledButton
        onClick={handleClick}
        style={{ display: "flex", alignItems: "center", fontWeight: 600 }}
        aria-label={sortLabel}
      >
        <Group gap={4} wrap="nowrap">
          <Text fw={isSorted ? 700 : 600} size="sm">
            {label}
          </Text>
          {SortIcon && (
            <ThemeIcon
              size="sm"
              variant="transparent"
              color="blue"
              aria-hidden="true"
            >
              <SortIcon style={{ width: rem(14), height: rem(14) }} />
            </ThemeIcon>
          )}
        </Group>
      </UnstyledButton>
    );
  },
);

SortControl.displayName = "SortControl";

// Updated fetcher to handle query parameters and new response format
const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || "Failed to fetch");
  }
  const json = await res.json().catch(() => ({}));
  // New format: { scans: [], pagination: {}, usage: {} }
  return json;
};

// Memoized file size formatter - kept outside component to avoid recreating
const formatFileSize = (mb: number) =>
  mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;

// Memoized date formatter - cached for performance
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "—";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return "—";
  }
};

// Memoized MobileCard component with optimized props
const MobileCard = React.memo<{
  scan: Scan;
  onPreview: (scan: Scan) => void;
  onDelete: (scan: Scan) => void;
  isDeleting: boolean;
}>(
  ({ scan, onPreview, onDelete, isDeleting }) => {
    const formattedSize = useMemo(
      () => formatFileSize(Number(scan.file_size_mb ?? 0)),
      [scan.file_size_mb],
    );
    const formattedDate = useMemo(
      () => formatDate(scan.uploaded_at),
      [scan.uploaded_at],
    );
    const packageName = useMemo(
      () =>
        scan.package?.package_name ||
        (scan.package_id ? `PKG-${scan.package_id.slice(0, 8)}` : "No Package"),
      [scan.package?.package_name, scan.package_id],
    );

    return (
      <Paper p="md" radius="md" withBorder shadow="xs" component="li">
        <Stack gap="xs">
          <Group wrap="nowrap" align="flex-start" gap="sm">
            <Avatar
              size={42}
              radius="md"
              color="blue"
              variant="light"
              aria-hidden="true"
            >
              <IconFileText size={20} />
            </Avatar>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text
                fw={700}
                size="sm"
                style={{ wordBreak: "break-word", lineHeight: 1.2 }}
                component="h3"
              >
                {scan.file_name}
              </Text>
              <Text size="xs" c="gray.7" mt={2}>
                {packageName}
              </Text>
            </Box>
          </Group>
          <Group justify="space-between" mt={4}>
            <Group gap={4}>
              <IconScale size={14} color="gray" aria-hidden="true" />
              <Text size="xs" fw={500}>
                {formattedSize}
              </Text>
            </Group>
            <Group gap={4}>
              <IconCalendar size={14} color="gray" aria-hidden="true" />
              <Text size="xs" c="gray.7">
                {formattedDate}
              </Text>
            </Group>
          </Group>
          <Divider variant="dashed" my={4} />
          <Group gap="xs" grow>
            <Button
              type="button"
              size="xs"
              variant="light"
              leftSection={<IconEye size={14} aria-hidden="true" />}
              onClick={() => onPreview(scan)}
              aria-label={`View file ${scan.file_name}`}
            >
              View
            </Button>
            <Button
              type="button"
              size="xs"
              variant="light"
              color="green"
              component="a"
              href={scan.file_url}
              download={scan.file_name}
              leftSection={<IconDownload size={14} aria-hidden="true" />}
              aria-label={`Download file ${scan.file_name}`}
            >
              Get
            </Button>
            <ActionIcon
              aria-label={`Delete file ${scan.file_name}`}
              size="lg"
              color="red"
              variant="light"
              onClick={() => onDelete(scan)}
              disabled={isDeleting}
              title={`Delete file ${scan.file_name}`}
            >
              <IconTrash size={18} aria-hidden="true" />
            </ActionIcon>
          </Group>
        </Stack>
      </Paper>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better memoization
    return (
      prevProps.scan.id === nextProps.scan.id &&
      prevProps.scan.file_name === nextProps.scan.file_name &&
      prevProps.scan.file_size_mb === nextProps.scan.file_size_mb &&
      prevProps.scan.uploaded_at === nextProps.scan.uploaded_at &&
      prevProps.scan.package?.package_name ===
        nextProps.scan.package?.package_name &&
      prevProps.scan.package_id === nextProps.scan.package_id &&
      prevProps.isDeleting === nextProps.isDeleting &&
      prevProps.onPreview === nextProps.onPreview &&
      prevProps.onDelete === nextProps.onDelete
    );
  },
);

MobileCard.displayName = "MobileCard";

// Memoized TableRow component with optimized props
const TableRow = React.memo<{
  scan: Scan;
  onPreview: (scan: Scan) => void;
  onDelete: (scan: Scan) => void;
  isDeleting: boolean;
}>(
  ({ scan, onPreview, onDelete, isDeleting }) => {
    const formattedSize = useMemo(
      () => formatFileSize(Number(scan.file_size_mb ?? 0)),
      [scan.file_size_mb],
    );
    const formattedDate = useMemo(
      () => formatDate(scan.uploaded_at),
      [scan.uploaded_at],
    );

    return (
      <Table.Tr>
        <Table.Td>
          <Group gap="sm" wrap="nowrap">
            <Avatar
              size={36}
              radius="sm"
              color="blue"
              variant="light"
              aria-hidden="true"
            >
              <IconFileText size={18} />
            </Avatar>
            <Box style={{ maxWidth: rem(250) }}>
              <Text fw={600} size="sm" truncate title={scan.file_name}>
                {scan.file_name}
              </Text>
            </Box>
          </Group>
        </Table.Td>
        <Table.Td>
          {scan.package?.package_name ? (
            <Badge variant="outline" color="#000" size="sm">
              {scan.package.package_name}
            </Badge>
          ) : (
            <Text size="sm" c="gray.7">
              —
            </Text>
          )}
        </Table.Td>
        <Table.Td>
          <Text size="sm" c="gray.7">
            {formattedSize}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="sm">{formattedDate}</Text>
        </Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon
              variant="light"
              color="blue"
              onClick={() => onPreview(scan)}
              aria-label={`View file ${scan.file_name}`}
              title={`View file ${scan.file_name}`}
            >
              <IconEye size={18} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              component="a"
              href={scan.file_url}
              download={scan.file_name}
              variant="light"
              color="green"
              aria-label={`Download file ${scan.file_name}`}
              title={`Download file ${scan.file_name}`}
            >
              <IconDownload size={18} aria-hidden="true" />
            </ActionIcon>
            <ActionIcon
              color="red"
              variant="light"
              onClick={() => onDelete(scan)}
              disabled={isDeleting}
              aria-label={`Delete file ${scan.file_name}`}
              title={`Delete file ${scan.file_name}`}
            >
              <IconTrash size={18} aria-hidden="true" />
            </ActionIcon>
          </Group>
        </Table.Td>
      </Table.Tr>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function for better memoization
    return (
      prevProps.scan.id === nextProps.scan.id &&
      prevProps.scan.file_name === nextProps.scan.file_name &&
      prevProps.scan.file_size_mb === nextProps.scan.file_size_mb &&
      prevProps.scan.uploaded_at === nextProps.scan.uploaded_at &&
      prevProps.scan.package?.package_name ===
        nextProps.scan.package?.package_name &&
      prevProps.isDeleting === nextProps.isDeleting &&
      prevProps.onPreview === nextProps.onPreview &&
      prevProps.onDelete === nextProps.onDelete
    );
  },
);

TableRow.displayName = "TableRow";

export default function AllUserScans() {
  const { session } = useSession();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Pagination State
  const [activePage, setActivePage] = useState(1);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{
    id: string;
    name?: string;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 300); // Increased debounce for server requests
  const [sortBy, setSortBy] = useState<
    "uploaded_at" | "file_name" | "file_size_mb"
  >("uploaded_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Build SWR key with query parameters for server-side filtering, sorting, and pagination
  const swrKey = useMemo(() => {
    if (!session?.user?.id) return null;
    const params = new URLSearchParams({
      page: activePage.toString(),
      limit: ITEMS_PER_PAGE.toString(),
      sortBy,
      sortDir,
    });
    if (debouncedSearch.trim()) {
      params.set("search", debouncedSearch.trim());
    }
    return `/api/user/storage?${params.toString()}`;
  }, [session?.user?.id, activePage, debouncedSearch, sortBy, sortDir]);

  const { data: apiData, isLoading } = useSWR<
    | {
        scans: Scan[];
        pagination: {
          total: number;
          limit: number;
          offset: number;
          has_more: boolean;
        };
        usage: {
          used_mb: number;
          limit_mb: number;
          percentage: number;
        };
      }
    | undefined
  >(swrKey, fetcher, {
    revalidateOnFocus: true,
    dedupingInterval: 2000,
  });

  // Extract data from API response
  const scans = apiData?.scans ?? [];
  const pagination = apiData?.pagination;
  const totalFiles = pagination?.total ?? 0;

  // Optimized loading state - only show loading on initial load
  const loading = isLoading && scans.length === 0;

  // Reset to Page 1 when searching or sorting changes
  useEffect(() => {
    startTransition(() => {
      setActivePage(1);
    });
  }, [debouncedSearch, sortBy, sortDir]);

  const handlePreview = useCallback((scan: Scan) => {
    setSelected(scan);
    setPreviewOpen(true);
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!swrKey) return;
    setRefreshing(true);
    try {
      await swrMutate(swrKey);
    } finally {
      setRefreshing(false);
    }
  }, [swrKey]);

  const handleSortClick = useCallback(
    (key: "uploaded_at" | "file_name" | "file_size_mb") => {
      startTransition(() => {
        if (key === sortBy) {
          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
          setSortBy(key);
          setSortDir("desc");
        }
      });
    },
    [sortBy],
  );

  const handleDelete = useCallback((scan?: Scan) => {
    if (!scan?.id) return;
    setToDelete({ id: scan.id, name: scan.file_name });
    setConfirmOpen(true);
  }, []);

  const performDelete = useCallback(async () => {
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

      // Invalidate SWR cache to refetch with updated data
      if (swrKey) {
        await swrMutate(swrKey);
      }
    } catch (e: unknown) {
      console.error("delete failed", e);
    } finally {
      setDeletingId(null);
      setToDelete(null);
    }
  }, [toDelete, swrKey]);

  // Server-side filtering, sorting, and pagination - no client-side processing needed
  // scans are already filtered, sorted, and paginated by the API

  // Calculate total pages from server pagination data
  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 0;

  const isMobile = useMediaQuery("(max-width: 768px)");

  // --- RENDERING MAIN CONTENT ---
  let mainContent: React.ReactNode;
  if (loading) {
    mainContent = (
      <Center py="xl" h={200}>
        <Loader size="sm" aria-label="Loading files" />
      </Center>
    );
  } else if (isMobile) {
    mainContent = (
      <Stack
        gap="md"
        component="ul"
        style={{ listStyle: "none", padding: 0, margin: 0 }}
      >
        {scans.length > 0 ? (
          scans.map((s) => (
            <MobileCard
              key={s.id}
              scan={s}
              onPreview={handlePreview}
              onDelete={handleDelete}
              isDeleting={deletingId === s.id}
            />
          ))
        ) : (
          <Center py="xl" component="li">
            <Text c="gray.7">No files match your criteria.</Text>
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
          {scans.map((s) => (
            <TableRow
              key={s.id}
              scan={s}
              onPreview={handlePreview}
              onDelete={handleDelete}
              isDeleting={deletingId === s.id}
            />
          ))}
          {scans.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Center py={40}>
                  <Text c="gray.7">No files found.</Text>
                </Center>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
    );
  }

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.currentTarget.value);
    },
    [],
  );

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
  }, []);

  const handleCloseConfirm = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  return (
    <Box
      p={isMobile ? "xs" : "md"}
      bg="gray.0"
      style={{ minHeight: "100dvh" }}
      component="main"
    >
      <Paper p={isMobile ? "sm" : "lg"} radius="md" withBorder shadow="sm">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <ThemeIcon
                variant="light"
                color="blue"
                size={isMobile ? "lg" : "xl"}
                aria-hidden="true"
              >
                <IconDatabase size={isMobile ? 20 : 24} />
              </ThemeIcon>
              <Title order={isMobile ? 4 : 3} component="h1">
                Storage
              </Title>
            </Group>
            <Group gap={8}>
              <ActionIcon
                variant="default"
                size="lg"
                onClick={handleRefresh}
                loading={refreshing}
                aria-label="Refresh file list"
                title="Refresh file list"
              >
                <IconRefresh size={18} aria-hidden="true" />
              </ActionIcon>
              <Badge
                variant="filled"
                color="violet"
                size="md"
                aria-label={`${totalFiles} total files`}
              >
                {totalFiles} Total
              </Badge>
            </Group>
          </Group>

          <TextInput
            placeholder="Search files..."
            leftSection={<IconSearch size={16} aria-hidden="true" />}
            value={search}
            onChange={handleSearchChange}
            size="sm"
            aria-label="Search files by name or package"
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
                aria-label="Pagination navigation"
                getControlProps={(control) => {
                  if (control === "first")
                    return { "aria-label": "Go to first page" };
                  if (control === "last")
                    return { "aria-label": "Go to last page" };
                  if (control === "next")
                    return { "aria-label": "Go to next page" };
                  if (control === "previous")
                    return { "aria-label": "Go to previous page" };
                  return {};
                }}
              />
            </Group>
          )}
        </Stack>
      </Paper>

      {/* Preview Modal */}
      <Modal
        opened={previewOpen}
        onClose={handleClosePreview}
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
                  alt={`Preview of ${selected.file_name}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 900px"
                  style={{ objectFit: "contain" }}
                  loading="eager"
                  priority={previewOpen}
                  quality={90}
                  unoptimized={
                    selected.file_url.startsWith("blob:") ||
                    selected.file_url.startsWith("data:")
                  }
                />
              </Box>
            ) : (
              <Box w="100%" h={isMobile ? "80vh" : "70vh"}>
                <iframe
                  src={selected.file_url}
                  title={`Preview of ${selected.file_name}`}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                    borderRadius: rem(8),
                  }}
                  loading="lazy"
                />
              </Box>
            )}
          </Box>
        ) : (
          <Center h={200}>
            <Text c="gray.7">No file selected</Text>
          </Center>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        opened={confirmOpen}
        onClose={handleCloseConfirm}
        title="Confirm Delete"
        centered
        size="sm"
      >
        <Stack gap="md">
          <Text size="sm" id="delete-description">
            Permanently delete{" "}
            <Text component="span" fw={700}>
              {toDelete?.name}
            </Text>
            ?
          </Text>
          <Group justify="flex-end" gap="xs">
            <Button variant="default" onClick={handleCloseConfirm}>
              Cancel
            </Button>
            <Button
              color="red"
              onClick={() => void performDelete()}
              loading={!!deletingId}
              aria-describedby="delete-description"
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
