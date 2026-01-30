"use client";

import "mantine-datatable/styles.layer.css";

import React, { useState, useMemo, useCallback, memo, useEffect } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  Paper,
  Group,
  TextInput,
  Stack,
  Modal,
  Text,
  Center,
  ActionIcon,
  Badge,
  Button,
  Tabs,
} from "@mantine/core";
import {
  type DataTableColumn,
  type DataTableSortStatus,
} from "mantine-datatable";
import {
  IconSearch,
  IconArrowRight,
  IconX,
  IconLayoutGrid,
  IconFileDescription,
  IconCircleCheck,
  IconCircleX,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { getStatusFormat, fetcher } from "@/utils/helper";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { FormattedKycRow, KycRow } from "@/utils/types";
import { useSearchParams } from "next/navigation";

import { AdminTable } from "@/components/common/AdminTable";
import dynamic from "next/dynamic";
// Imports fixed above

const KycDetails = dynamic(() => import("./KycDetails"), {
  ssr: false,
  loading: () => (
    <Center mih={300}>
      <div
        style={{
          height: 200,
          width: "100%",
          borderRadius: "8px",
          backgroundColor: "#e9ecef",
          animation: "pulse 2s infinite",
        }}
      />
    </Center>
  ),
});

const SearchInput = memo(
  ({ onSearch }: { onSearch: (value: string) => void }) => {
    const [value, setValue] = useState("");

    const handleSearch = () => {
      onSearch(value);
    };

    const handleClear = () => {
      setValue("");
      onSearch("");
    };

    return (
      <TextInput
        placeholder="Search by name or user id..."
        w="100%"
        aria-label="Search users"
        leftSection={<IconSearch size={16} />}
        rightSectionWidth={value ? 70 : 42}
        rightSection={
          value ? (
            <Group gap={4}>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="gray.5"
                onClick={handleClear}
                aria-label="Clear search"
                title="Clear search"
              >
                <IconX size={16} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="transparent"
                c="indigo"
                onClick={handleSearch}
                aria-label="Submit search"
                title="Submit search"
              >
                <IconArrowRight size={16} />
              </ActionIcon>
            </Group>
          ) : (
            <ActionIcon
              size="sm"
              variant="transparent"
              c="gray.5"
              onClick={handleSearch}
              aria-label="Submit search"
              title="Submit search"
            >
              <IconArrowRight size={16} />
            </ActionIcon>
          )
        }
        value={value}
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSearch();
          }
        }}
        style={{ width: 300 }}
      />
    );
  },
);
SearchInput.displayName = "SearchInput";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

type StatusTab = "ALL" | "SUBMITTED" | "VERIFIED" | "REJECTED";

export default function AdminUserKyc() {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const searchParams = useSearchParams();
  const initialStatus = (searchParams?.get("status") ?? "ALL") as StatusTab;
  const [statusFilter, setStatusFilter] = useState<StatusTab>(initialStatus);

  useEffect(() => {
    const status = searchParams.get("status");
    if (
      status &&
      ["ALL", "SUBMITTED", "VERIFIED", "REJECTED"].includes(status)
    ) {
      setStatusFilter(status as StatusTab);
    }
  }, [searchParams]);

  const [sortStatus, setSortStatus] = useState<
    DataTableSortStatus<FormattedKycRow>
  >({
    columnAccessor: "submitted_at",
    direction: "desc",
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const handleSearchSubmit = useCallback(
    (val: string) => {
      if (val === query && page === 1) return;
      setIsSearching(true);
      setQuery(val);
      setPage(1);
    },
    [query, page],
  );

  const swrKey = useMemo(() => {
    const base = `${API_ENDPOINTS.admin.userKyc()}?q=${encodeURIComponent(
      query,
    )}&page=${page}&pageSize=${pageSize}`;
    return statusFilter === "ALL"
      ? base
      : `${base}&status=${encodeURIComponent(statusFilter)}`;
  }, [query, page, pageSize, statusFilter]);

  const { data, error, isValidating } = useSWR(swrKey, fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (!isValidating) {
      setIsSearching(false);
    }
  }, [isValidating]);

  const rows = useMemo<FormattedKycRow[]>(() => {
    const rawData = data?.data || [];
    const formatted = rawData.map((r: KycRow) => ({
      ...r,
      _formattedName:
        (r.full_name ?? `${r.first_name ?? ""} ${r.last_name ?? ""}`) ||
        "Unknown",
      _formattedSub: r.submitted_at
        ? dayjs(r.submitted_at).format("MMM D, YYYY")
        : "—",
      _formattedVer: r.verified_at
        ? dayjs(r.verified_at).format("MMM D, YYYY")
        : "—",
    }));

    return [...formatted].sort((a, b) => {
      const { columnAccessor, direction } = sortStatus;
      let valA: string | number | boolean | null | undefined;
      let valB: string | number | boolean | null | undefined;

      if (columnAccessor === "user") {
        valA = a._formattedName;
        valB = b._formattedName;
      } else if (columnAccessor === "doc") {
        valA = a.id_document_type;
        valB = b.id_document_type;
      } else {
        valA = a[columnAccessor as keyof FormattedKycRow] as
          | string
          | number
          | boolean
          | null
          | undefined;
        valB = b[columnAccessor as keyof FormattedKycRow] as
          | string
          | number
          | boolean
          | null
          | undefined;
      }

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const result = valA < valB ? -1 : 1;
      return direction === "asc" ? result : -result;
    });
  }, [data, sortStatus]);
  const totalRecords = data?.total_count || 0;

  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<KycRow | null>(null);
  const [processing, setProcessing] = useState(false);

  const openDetails = useCallback((r: KycRow) => {
    setSelected(r);
    setModalOpen(true);
  }, []);

  const actionVerify = useCallback(
    async (r: KycRow, status: "VERIFIED" | "REJECTED") => {
      setProcessing(true);
      try {
        const res = await fetch(API_ENDPOINTS.admin.userKyc(r.user_id), {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: status }),
        });
        if (!res.ok) throw new Error("Action failed");
        notifications.show({
          title: "Success",
          message: `Set ${status}`,
          color: "green",
        });
        await swrMutate(
          `${API_ENDPOINTS.admin.userKyc()}?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
        );
        setModalOpen(false);
      } catch (e) {
        console.error(e);
        notifications.show({
          title: "Error",
          message: "Failed to update",
          color: "red",
        });
      } finally {
        setProcessing(false);
      }
    },
    [query, page, pageSize],
  );

  const columns = useMemo<DataTableColumn<FormattedKycRow>[]>(
    () => [
      {
        accessor: "user",
        title: "User",
        sortable: true,
        render: (r: FormattedKycRow) => {
          return (
            <Group gap="sm" wrap="nowrap">
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  backgroundColor: "var(--mantine-color-gray-1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--mantine-color-gray-7)",
                  fontSize: "14px",
                  fontWeight: 600,
                  overflow: "hidden",
                }}
              >
                {r._formattedName.charAt(0)}
              </div>
              <Stack gap={2}>
                <Text fw={700} c="dark.4" size="sm" lh={1.2}>
                  {r._formattedName}
                </Text>
              </Stack>
            </Group>
          );
        },
      },
      {
        accessor: "doc",
        title: "Document",
        sortable: true,
        render: (r: FormattedKycRow) => (
          <Text size="sm" c="dark.4" fw={500}>
            {(r.id_document_type ?? "—").replace("_", " ")}
          </Text>
        ),
      },
      {
        accessor: "status",
        title: "Status",
        width: 140,
        sortable: true,
        render: (r: FormattedKycRow) => (
          <Badge
            color={getStatusFormat(r.status)}
            variant="dot"
            size="md"
            radius="md"
          >
            {r.status}
          </Badge>
        ),
      },
      {
        accessor: "submitted_at",
        title: "Dates",
        width: 200,
        sortable: true,
        render: (r: FormattedKycRow) => (
          <Stack gap={2}>
            <Text size="sm" c="dark.3">
              Sub: {r._formattedSub}
            </Text>
            {r.verified_at && (
              <Text size="sm" c="dark.3">
                Ver: {r._formattedVer}
              </Text>
            )}
          </Stack>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        textAlign: "right" as const,
        width: 100,
        render: (r: FormattedKycRow) => (
          <Button
            size="xs"
            variant="light"
            color="blue"
            onClick={() => openDetails(r)}
          >
            Manage
          </Button>
        ),
      },
    ],
    [openDetails],
  );

  const handlePageSizeChange = useCallback((n: number) => {
    setPageSize(n);
    setPage(1);
  }, []);

  if (error) {
    return (
      <Center p={40}>
        <Text c="red">Failed to load KYC records</Text>
      </Center>
    );
  }

  return (
    <Stack align="center" gap="lg" w="100%">
      <Paper p="xl" radius="lg" withBorder shadow="sm" w="100%">
        <Group justify="space-between" mb="md" w="100%" wrap="nowrap">
          <SearchInput onSearch={handleSearchSubmit} />

          {/* <Badge size="lg" variant="filled" color="indigo" w="10rem">
            {totalRecords} Records
          </Badge> */}
        </Group>

        <Tabs
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as StatusTab)}
          variant="default"
          mb="md"
        >
          <Tabs.List>
            <Tabs.Tab
              value="ALL"
              leftSection={<IconLayoutGrid size={16} aria-hidden="true" />}
            >
              All
            </Tabs.Tab>
            <Tabs.Tab
              value="SUBMITTED"
              leftSection={<IconFileDescription size={16} aria-hidden="true" />}
            >
              Submitted
            </Tabs.Tab>
            <Tabs.Tab
              value="VERIFIED"
              leftSection={<IconCircleCheck size={16} aria-hidden="true" />}
            >
              Verified
            </Tabs.Tab>
            <Tabs.Tab
              value="REJECTED"
              leftSection={<IconCircleX size={16} aria-hidden="true" />}
            >
              Rejected
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value={statusFilter}>
            <div style={{ marginTop: "1rem" }}>
              <AdminTable<FormattedKycRow>
                records={isSearching ? [] : rows}
                columns={columns}
                page={page}
                onPageChange={setPage}
                totalRecords={totalRecords}
                recordsPerPage={pageSize}
                recordsPerPageOptions={PAGE_SIZE_OPTIONS}
                onRecordsPerPageChange={handlePageSizeChange}
                fetching={isValidating || isSearching}
                sortStatus={sortStatus}
                onSortStatusChange={setSortStatus}
                noRecordsText="No records found"
              />
            </div>
          </Tabs.Panel>
        </Tabs>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title="KYC Details"
        size="lg"
        centered
      >
        <KycDetails
          selected={selected}
          processing={processing}
          onVerify={actionVerify}
          onClose={() => setModalOpen(false)}
        />
      </Modal>
    </Stack>
  );
}
