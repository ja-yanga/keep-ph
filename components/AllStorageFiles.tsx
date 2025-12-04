"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  ElementType,
} from "react"; // Added ElementType
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
  Box,
  Avatar,
  Button,
  rem,
  ThemeIcon,
  TextInput,
  UnstyledButton,
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
} from "@tabler/icons-react";
import type { IconProps } from "@tabler/icons-react"; // Import IconProps for correct typing
import { useSession } from "@/components/SessionProvider";

// --- Interfaces (No Change) ---
interface Scan {
  id: string;
  file_name: string;
  file_url: string;
  file_size_mb: number;
  uploaded_at: string;
  package?: {
    tracking_number?: string;
    id?: string;
  };
  package_id?: string;
  mime_type?: string; // ADDED: allow optional mime_type
}

// --- Custom Sort Control Component ---
interface SortControlProps {
  label: string;
  sortKey: "uploaded_at" | "file_name" | "file_size_mb";
  currentSort: "uploaded_at" | "file_name" | "file_size_mb";
  currentDir: "asc" | "desc";
  onClick: (key: any) => void;
}

const SortControl: React.FC<SortControlProps> = ({
  label,
  sortKey,
  currentSort,
  currentDir,
  onClick,
}) => {
  const isSorted = currentSort === sortKey;
  const isAsc = currentDir === "asc";

  // FIX: Type the SortIcon using ElementType and IconProps
  const SortIcon = useMemo<ElementType<IconProps> | undefined>(() => {
    if (!isSorted) return undefined;

    if (sortKey === "file_name") {
      return isAsc ? IconSortAscendingLetters : IconSortDescendingLetters;
    }
    // For date and size (numeric/date-like)
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
        {/* FIX: Check if SortIcon exists before trying to render it */}
        {SortIcon && (
          <ThemeIcon size="sm" variant="transparent" color="blue">
            <SortIcon style={{ width: rem(14), height: rem(14) }} />
          </ThemeIcon>
        )}
      </Group>
    </UnstyledButton>
  );
};

// --- Main Component ---
export default function AllUserScans() {
  const { session } = useSession();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selected, setSelected] = useState<Scan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Search & sort state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "uploaded_at" | "file_name" | "file_size_mb"
  >("uploaded_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchAllScans = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/user/storage`, { credentials: "include" });
      if (!res.ok) {
        console.error("Failed to fetch scans:", await res.text());
        setScans([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      const scansArr = data?.scans ?? data?.data ?? data ?? [];
      setScans(Array.isArray(scansArr) ? scansArr : []);
    } catch (err) {
      console.error("Error fetching scans:", err);
      setScans([]);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchAllScans();
  }, [fetchAllScans]);

  const handlePreview = (scan: Scan) => {
    setSelected(scan);
    setPreviewOpen(true);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchAllScans();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSortClick = (
    key: "uploaded_at" | "file_name" | "file_size_mb"
  ) => {
    if (key === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortDir("desc"); // Default to descending when switching column
    }
  };

  const formatFileSize = (mb: number) =>
    mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(2)} MB`;

  // Filter + sort results
  const displayedScans = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = scans.slice();

    if (q) {
      list = list.filter((s) => {
        const name = (s.file_name || "").toLowerCase();

        const tracking = (s.package?.tracking_number || "").toLowerCase();
        const pkgId = (s.package_id || "").toLowerCase();
        return name.includes(q) || tracking.includes(q) || pkgId.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === "file_name") {
        const A = (a.file_name || "").toLowerCase();
        const B = (b.file_name || "").toLowerCase();
        return sortDir === "asc" ? A.localeCompare(B) : B.localeCompare(A);
      }
      if (sortBy === "file_size_mb") {
        const A = Number(a.file_size_mb || 0);
        const B = Number(b.file_size_mb || 0);
        return sortDir === "asc" ? A - B : B - A;
      }
      // uploaded_at (default)
      const A = a.uploaded_at ? new Date(a.uploaded_at).getTime() : 0;
      const B = b.uploaded_at ? new Date(b.uploaded_at).getTime() : 0;
      return sortDir === "asc" ? A - B : B - A;
    });

    return list;
  }, [scans, search, sortBy, sortDir]);

  return (
    <Box
      style={{
        minHeight: "100dvh",
        padding: "24px",
      }}
      bg="gray.0"
    >
      <Paper p="lg" radius="md" withBorder shadow="sm">
        {/* Header */}
        <Group justify="space-between" mb="md" align="center">
          <Group gap="sm">
            <ThemeIcon variant="light" color="gray" size="lg">
              <IconDatabase style={{ width: rem(20), height: rem(20) }} />
            </ThemeIcon>
            <div>
              <Title order={3}>Storage File Explorer</Title>
              <Text c="dimmed" size="sm">
                Easily view all uploaded documents and scans.
              </Text>
            </div>
          </Group>

          <Group gap="sm">
            <Button
              variant="default"
              onClick={handleRefresh}
              loading={refreshing}
              leftSection={<IconRefresh size={16} />}
            >
              Refresh
            </Button>
            <Badge variant="light" color="violet" size="lg">
              Total: {scans.length} files
            </Badge>
          </Group>
        </Group>

        {/* Controls: search */}
        <Group gap="lg" align="center" mb="md">
          <TextInput
            placeholder="Search files, tracking number"
            size="sm"
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flexGrow: 1, maxWidth: 400 }}
            __clearable
          />
        </Group>

        {/* Table Area */}
        <ScrollArea h={520}>
          {loading ? (
            <Center py="xl" h={200}>
              <Loader size="sm" />
            </Center>
          ) : (
            <Table
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
                  <Table.Th style={{ minWidth: rem(150) }}>
                    Package / Source
                  </Table.Th>
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
                {displayedScans.length > 0 ? (
                  displayedScans.map((s) => (
                    <Table.Tr key={s.id}>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar
                            size={36}
                            radius="sm"
                            color="blue"
                            variant="light"
                          >
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
                        {s.package?.tracking_number ? (
                          <Tooltip label="Tracking Number" withArrow>
                            <Badge variant="outline" color="gray" size="sm">
                              {s.package.tracking_number}
                            </Badge>
                          </Tooltip>
                        ) : (
                          <Text size="sm" c="dimmed">
                            {s.package_id
                              ? `PKG-${s.package_id.slice(0, 8)}`
                              : "—"}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {formatFileSize(Number(s.file_size_mb ?? 0))}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap">
                          <IconCalendar size={14} color="gray" />
                          <Text size="sm">
                            {s.uploaded_at
                              ? new Date(s.uploaded_at).toLocaleDateString()
                              : "—"}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Tooltip label="Preview" withArrow>
                            <ActionIcon
                              variant="light"
                              color="blue"
                              onClick={() => handlePreview(s)}
                            >
                              <IconEye size={18} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Download" withArrow>
                            <ActionIcon
                              component="a"
                              href={s.file_url}
                              target="_blank"
                              download={s.file_name}
                              variant="light"
                              color="green"
                            >
                              <IconDownload size={18} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Stack align="center" py={60} gap="xs">
                        <IconFileText
                          size={40}
                          color="var(--mantine-color-gray-4)"
                        />
                        <Text c="dimmed">
                          {search.length > 0
                            ? "No results found for your search criteria."
                            : "No files found in your storage."}
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

      <Modal
        opened={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={selected?.file_name ?? "Preview"}
        size="xl"
        centered
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3,
        }}
      >
        {selected ? (
          // Images: show inline
          selected.mime_type?.startsWith("image") ||
          (selected.file_url &&
            /\.(jpe?g|png|gif|webp)$/i.test(selected.file_url)) ? (
            <img
              src={selected.file_url}
              alt={selected.file_name}
              style={{
                width: "100%",
                maxHeight: "70vh",
                objectFit: "contain",
                borderRadius: "var(--mantine-radius-md)",
              }}
            />
          ) : (
            // PDFs and other documents: iframe preview
            <div style={{ width: "100%" }}>
              <iframe
                src={selected.file_url}
                title={selected.file_name}
                style={{ width: "100%", height: "70vh", border: "none" }}
              />
            </div>
          )
        ) : (
          <Center style={{ height: 220 }}>
            <Text c="dimmed">No file selected</Text>
          </Center>
        )}
      </Modal>
    </Box>
  );
}
