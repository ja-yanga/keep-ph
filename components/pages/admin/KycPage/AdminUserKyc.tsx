"use client";

import "mantine-datatable/styles.layer.css";
import React, { useState, useMemo, useCallback } from "react";
import useSWR, { mutate as swrMutate } from "swr";
import {
  Paper,
  Group,
  TextInput,
  Button,
  Stack,
  Badge,
  Modal,
  Text,
  Center,
  Avatar,
  Skeleton,
} from "@mantine/core";
import dynamic from "next/dynamic";
import { type DataTableColumn, type DataTableProps } from "mantine-datatable";
const DataTable = dynamic(
  () => import("mantine-datatable").then((m) => m.DataTable),
  {
    ssr: false,
    loading: () => (
      <Stack gap="xs">
        <Group grow>
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
          <Skeleton height={40} />
        </Group>
        {[...Array(10)].map((_, i) => (
          <Skeleton key={i} height={52} radius="sm" />
        ))}
      </Stack>
    ),
  },
) as <T>(props: DataTableProps<T>) => React.ReactElement;
import { IconSearch } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import dayjs from "dayjs";
import { useDebouncedValue } from "@mantine/hooks";
import { getStatusFormat, fetcher } from "@/utils/helper";
import { API_ENDPOINTS } from "@/utils/constants/endpoints";
import { FormattedKycRow, KycRow } from "@/utils/types";

const KycDetails = dynamic(() => import("./KycDetails"), {
  ssr: false,
  loading: () => (
    <Center mih={300}>
      <Skeleton height={200} width="100%" radius="md" />
    </Center>
  ),
});

export default function AdminUserKyc() {
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, 500);

  const { data, error, isValidating } = useSWR(
    `${API_ENDPOINTS.admin.userKyc()}?q=${encodeURIComponent(debouncedSearch)}&page=${page}&pageSize=${pageSize}`,
    fetcher,
    {
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  );

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
          `${API_ENDPOINTS.admin.userKyc()}?q=${encodeURIComponent(debouncedSearch)}&page=${page}&pageSize=${pageSize}`,
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
    [debouncedSearch, page, pageSize],
  );

  const columns = useMemo<DataTableColumn<FormattedKycRow>[]>(
    () => [
      {
        accessor: "user",
        title: "User",
        render: (r: FormattedKycRow) => {
          return (
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Avatar radius="xl" size="sm" alt={r._formattedName}>
                {r._formattedName.charAt(0)}
              </Avatar>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <Text fw={500} size="sm" lineClamp={1}>
                  {r._formattedName}
                </Text>
                <Text size="xs" c="dimmed">
                  {r.user_id}
                </Text>
              </div>
            </div>
          );
        },
      },
      {
        accessor: "doc",
        title: "Document",
        render: (r: FormattedKycRow) => (
          <Text size="sm">{r.id_document_type ?? "—"}</Text>
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
            <Text size="xs" c="dimmed">
              Sub: {r._formattedSub}
            </Text>
            <Text size="xs" c="dimmed">
              Ver: {r._formattedVer}
            </Text>
          </div>
        ),
      },
      {
        accessor: "actions",
        title: "Actions",
        textAlign: "right",
        width: 100,
        render: (r: FormattedKycRow) => (
          <Button
            size="compact-xs"
            variant="light"
            color="indigo"
            onClick={() => openDetails(r)}
          >
            Manage
          </Button>
        ),
      },
    ],
    [openDetails],
  );

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
          <TextInput
            placeholder="Search by name or user id..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ width: 300 }}
          />

          <Badge size="lg" variant="filled" color="indigo">
            {totalRecords} Records
          </Badge>
        </Group>

        <DataTable
          withTableBorder
          borderRadius="sm"
          striped
          highlightOnHover
          records={rows}
          idAccessor="id"
          fetching={isValidating}
          minHeight={minTableHeight(pageSize)}
          page={page}
          onPageChange={setPage}
          totalRecords={totalRecords}
          recordsPerPage={pageSize}
          recordsPerPageOptions={[10, 20, 50]}
          onRecordsPerPageChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          columns={columns}
          noRecordsText="No records found"
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
