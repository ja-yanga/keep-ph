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
} from "@mantine/core";
import dynamic from "next/dynamic";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";
const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              style={{
                height: 40,
                flex: 1,
                backgroundColor: "#f1f3f5",
                borderRadius: "4px",
                animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
              }}
            />
          ))}
        </div>
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 52,
              backgroundColor: "#f8f9fa",
              borderRadius: "4px",
              animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        ))}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: .5; }
          }
        `,
          }}
        />
      </div>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;
import { IconSearch, IconArrowRight, IconX } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { getStatusFormat, fetcher } from "@/utils/helper";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { FormattedKycRow, KycRow } from "@/utils/types";

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

const KycTable = memo(
  ({
    rows,
    columns,
    page,
    onPageChange,
    pageSize,
    onPageSizeChange,
    totalRecords,
    isValidating,
    isSearching,
  }: {
    rows: FormattedKycRow[];
    columns: DataTableColumn<FormattedKycRow>[];
    page: number;
    onPageChange: (p: number) => void;
    pageSize: number;
    onPageSizeChange: (s: number) => void;
    totalRecords: number;
    isValidating: boolean;
    isSearching: boolean;
  }) => {
    return (
      <DataTable
        withTableBorder
        borderRadius="sm"
        striped
        highlightOnHover
        records={isSearching ? [] : rows}
        idAccessor="id"
        fetching={isValidating || isSearching}
        minHeight={minTableHeight(pageSize)}
        page={page}
        onPageChange={onPageChange}
        totalRecords={totalRecords}
        recordsPerPage={pageSize}
        recordsPerPageOptions={PAGE_SIZE_OPTIONS}
        onRecordsPerPageChange={onPageSizeChange}
        columns={columns}
        noRecordsText="No records found"
      />
    );
  },
);
KycTable.displayName = "KycTable";

export default function AdminUserKyc() {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchSubmit = useCallback(
    (val: string) => {
      if (val === query && page === 1) return;
      setIsSearching(true);
      setQuery(val);
      setPage(1);
    },
    [query, page],
  );

  const { data, error, isValidating } = useSWR(
    `${API_ENDPOINTS.admin.userKyc()}?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

  useEffect(() => {
    if (!isValidating) {
      setIsSearching(false);
    }
  }, [isValidating]);

  const rows = useMemo<FormattedKycRow[]>(() => {
    const rawData = data?.data || [];
    return rawData.map((r: KycRow) => ({
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
  }, [data]);
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
          method: "POST",
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
        render: (r: FormattedKycRow) => {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  backgroundColor: "#f1f3f5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#495057",
                  fontSize: "12px",
                  fontWeight: 500,
                  overflow: "hidden",
                }}
              >
                {r._formattedName.charAt(0)}
              </div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    lineHeight: "1.55",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "150px",
                  }}
                >
                  {r._formattedName}
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#868e96",
                    lineHeight: "1",
                  }}
                >
                  {r.user_id}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        accessor: "doc",
        title: "Document",
        render: (r: FormattedKycRow) => (
          <span style={{ fontSize: "14px" }}>
            {(r.id_document_type ?? "—").replace("_", " ")}
          </span>
        ),
      },
      {
        accessor: "status",
        title: "Status",
        width: 120,
        render: (r: FormattedKycRow) => (
          <Badge color={getStatusFormat(r.status)} variant="light" size="sm">
            {r.status}
          </Badge>
        ),
      },
      {
        accessor: "dates",
        title: "Dates",
        width: 180,
        render: (r: FormattedKycRow) => (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "12px", color: "#868e96" }}>
              Sub: {r._formattedSub}
            </span>
            <span style={{ fontSize: "12px", color: "#868e96" }}>
              Ver: {r._formattedVer}
            </span>
          </div>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        textAlign: "right",
        width: 100,
        render: (r: FormattedKycRow) => (
          <button
            onClick={() => openDetails(r)}
            aria-label={`Manage user ${r._formattedName}`}
            title={`Manage user ${r._formattedName}`}
            style={{
              padding: "4px 8px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#4c6ef5",
              backgroundColor: "#edf2ff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#DBE4FF")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#edf2ff")
            }
          >
            Manage
          </button>
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
      <Paper p="md" radius="md" withBorder shadow="sm" w="100%" maw={1200}>
        <Group justify="space-between" mb="md">
          <SearchInput onSearch={handleSearchSubmit} />

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "4px 12px",
              borderRadius: "4px",
              backgroundColor: "#4c6ef5",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              height: "30px", // Approximate Badge size="lg"
            }}
          >
            {totalRecords} Records
          </span>
        </Group>

        <KycTable
          rows={rows}
          columns={columns}
          page={page}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={handlePageSizeChange}
          totalRecords={totalRecords}
          isValidating={isValidating}
          isSearching={isSearching}
        />
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

function minTableHeight(pageSize: number) {
  return 52 * pageSize + 50;
}
